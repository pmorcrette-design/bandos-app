import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID
} from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";

import { getTicketingProviderClient } from "@/lib/ticketing/providers";
import type {
  ProviderExternalEvent,
  TicketAttendee,
  TicketClass,
  TicketOrder,
  TicketSalesSnapshot,
  TicketingCredentialInput,
  TicketingEvent,
  TicketingIntegration,
  TicketingProvider,
  TicketingSyncLog,
  TicketingWebhookEventType
} from "@/lib/ticketing/types";

type TicketingIntegrationRecord = Omit<TicketingIntegration, "credentialsPreview"> & {
  encryptedCredentials: string;
};

type TicketingStoreFile = {
  version: 1;
  integrations: TicketingIntegrationRecord[];
  events: TicketingEvent[];
  ticketClasses: TicketClass[];
  orders: TicketOrder[];
  attendees: TicketAttendee[];
  snapshots: TicketSalesSnapshot[];
  logs: TicketingSyncLog[];
};

const DATA_DIRECTORY = process.env.VERCEL
  ? "/tmp/bandos-data"
  : join(process.cwd(), "data");
const STORE_FILE_PATH = join(DATA_DIRECTORY, "bandos-ticketing-store.json");
const BLOB_STORE_PATH = "ticketing/store.json";
const LOCAL_BACKUP_DIRECTORY = join(DATA_DIRECTORY, "ticketing-store-backups");
const BLOB_BACKUP_PREFIX = "ticketing/backups";
const SHOULD_USE_BLOB_STORE =
  process.env.VERCEL === "1" && Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function buildSeedStore(): TicketingStoreFile {
  return {
    version: 1,
    integrations: [],
    events: [],
    ticketClasses: [],
    orders: [],
    attendees: [],
    snapshots: [],
    logs: []
  };
}

function getEncryptionKey() {
  const secretSource =
    process.env.TICKETING_ENCRYPTION_SECRET ??
    process.env.BLOB_READ_WRITE_TOKEN ??
    process.env.SUMUP_API_KEY ??
    `${process.cwd()}::bandos-ticketing-secret`;

  return createHash("sha256").update(secretSource).digest();
}

function encryptCredentials(credentials: TicketingCredentialInput) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const serialized = JSON.stringify(credentials);
  const encrypted = Buffer.concat([
    cipher.update(serialized, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptCredentials(payload: string): TicketingCredentialInput {
  const [ivBase64, tagBase64, encryptedBase64] = payload.split(":");

  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("INVALID_TICKETING_CREDENTIAL_PAYLOAD");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivBase64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString("utf8")) as TicketingCredentialInput;
}

async function ensureStoreFile() {
  await mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await access(STORE_FILE_PATH);
  } catch {
    await writeFile(STORE_FILE_PATH, JSON.stringify(buildSeedStore(), null, 2), "utf8");
  }
}

async function readBlobStore() {
  const blobStore = await getBlob(BLOB_STORE_PATH, {
    access: "private",
    useCache: false
  });

  if (!blobStore || blobStore.statusCode !== 200 || !blobStore.stream) {
    return null;
  }

  const rawStore = await new Response(blobStore.stream).text();
  return JSON.parse(rawStore) as TicketingStoreFile;
}

async function writeBlobStore(store: TicketingStoreFile) {
  await putBlob(BLOB_STORE_PATH, JSON.stringify(store, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60
  });
}

async function writeStoreBackup(store: TicketingStoreFile, reason: string) {
  const safeReason = reason.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
  const backupName = `${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}-${safeReason || "ticketing-store"}.json`;

  if (SHOULD_USE_BLOB_STORE) {
    await putBlob(`${BLOB_BACKUP_PREFIX}/${backupName}`, JSON.stringify(store, null, 2), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
      cacheControlMaxAge: 60
    });
    return;
  }

  await mkdir(LOCAL_BACKUP_DIRECTORY, { recursive: true });
  await writeFile(
    join(LOCAL_BACKUP_DIRECTORY, backupName),
    JSON.stringify(store, null, 2),
    "utf8"
  );
}

async function readStore(): Promise<TicketingStoreFile> {
  if (SHOULD_USE_BLOB_STORE) {
    const blobStore = await readBlobStore();

    if (blobStore) {
      return blobStore;
    }

    const seedStore = buildSeedStore();
    await writeBlobStore(seedStore);
    return seedStore;
  }

  await ensureStoreFile();
  const rawStore = await readFile(STORE_FILE_PATH, "utf8");
  return JSON.parse(rawStore) as TicketingStoreFile;
}

async function writeStore(store: TicketingStoreFile) {
  if (SHOULD_USE_BLOB_STORE) {
    await writeBlobStore(store);
    return;
  }

  await writeFile(STORE_FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function persistStoreMutation(
  previousStore: TicketingStoreFile,
  nextStore: TicketingStoreFile,
  reason: string
) {
  await writeStoreBackup(previousStore, reason);
  await writeStore(nextStore);
}

function sanitizeIntegration(record: TicketingIntegrationRecord): TicketingIntegration {
  const provider = getTicketingProviderClient(record.provider);
  const credentials = decryptCredentials(record.encryptedCredentials);

  return {
    id: record.id,
    workspaceId: record.workspaceId,
    provider: record.provider,
    label: record.label,
    status: record.status,
    credentialsPreview: provider.buildCredentialsPreview(credentials),
    lastError: record.lastError,
    lastSyncAt: record.lastSyncAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function appendLog(
  store: TicketingStoreFile,
  payload: Omit<TicketingSyncLog, "id" | "createdAt">
) {
  store.logs.unshift({
    id: `ticketing-log-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...payload
  });

  store.logs = store.logs.slice(0, 200);
}

export async function listTicketingIntegrations(workspaceId: string) {
  const store = await readStore();
  return store.integrations
    .filter((integration) => integration.workspaceId === workspaceId)
    .map((integration) => sanitizeIntegration(integration))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function upsertTicketingIntegration(payload: {
  workspaceId: string;
  provider: TicketingProvider;
  label: string;
  credentials: TicketingCredentialInput;
  integrationId?: string | null;
}) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const now = new Date().toISOString();
  const encryptedCredentials = encryptCredentials(payload.credentials);
  const existingIndex = payload.integrationId
    ? store.integrations.findIndex(
        (integration) =>
          integration.workspaceId === payload.workspaceId &&
          integration.id === payload.integrationId
      )
    : -1;

  let record: TicketingIntegrationRecord;

  if (existingIndex >= 0) {
    const existing = store.integrations[existingIndex];
    record = {
      ...existing,
      provider: payload.provider,
      label: payload.label.trim() || existing.label,
      encryptedCredentials,
      status: "connected",
      lastError: null,
      updatedAt: now
    };
    store.integrations[existingIndex] = record;
  } else {
    record = {
      id: `ticketing-integration-${randomUUID()}`,
      workspaceId: payload.workspaceId,
      provider: payload.provider,
      label: payload.label.trim() || getTicketingProviderClient(payload.provider).label,
      status: "connected",
      encryptedCredentials,
      lastError: null,
      lastSyncAt: null,
      createdAt: now,
      updatedAt: now
    };
    store.integrations.push(record);
  }

  appendLog(store, {
    workspaceId: payload.workspaceId,
    showId: null,
    integrationId: record.id,
    provider: record.provider,
    level: "info",
    message: `Integration saved for ${record.label}.`,
    context: null
  });

  await persistStoreMutation(previousStore, store, `upsert-ticketing-integration-${payload.workspaceId}`);
  return sanitizeIntegration(record);
}

export async function deleteTicketingIntegration(workspaceId: string, integrationId: string) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const record = store.integrations.find(
    (integration) =>
      integration.workspaceId === workspaceId && integration.id === integrationId
  );

  if (!record) {
    return false;
  }

  const eventIds = new Set(
    store.events
      .filter(
        (event) =>
          event.workspaceId === workspaceId && event.integrationId === integrationId
      )
      .map((event) => event.id)
  );

  store.integrations = store.integrations.filter(
    (integration) => integration.id !== integrationId
  );
  store.events = store.events.filter(
    (event) =>
      !(
        event.workspaceId === workspaceId && event.integrationId === integrationId
      )
  );
  store.ticketClasses = store.ticketClasses.filter(
    (entry) => !eventIds.has(entry.ticketingEventId)
  );
  store.orders = store.orders.filter((entry) => !eventIds.has(entry.ticketingEventId));
  store.attendees = store.attendees.filter((entry) => !eventIds.has(entry.ticketingEventId));
  store.snapshots = store.snapshots.filter((entry) => !eventIds.has(entry.ticketingEventId));

  appendLog(store, {
    workspaceId,
    showId: null,
    integrationId,
    provider: record.provider,
    level: "warning",
    message: `Integration ${record.label} removed.`,
    context: null
  });

  await persistStoreMutation(previousStore, store, `delete-ticketing-integration-${workspaceId}`);
  return true;
}

export async function listProviderExternalEvents(payload: {
  workspaceId: string;
  integrationId: string;
}) {
  const store = await readStore();
  const integration = store.integrations.find(
    (entry) =>
      entry.workspaceId === payload.workspaceId && entry.id === payload.integrationId
  );

  if (!integration) {
    throw new Error("TICKETING_INTEGRATION_NOT_FOUND");
  }

  const provider = getTicketingProviderClient(integration.provider);
  return provider.listExternalEvents(decryptCredentials(integration.encryptedCredentials));
}

function clearShowTicketingArtifacts(store: TicketingStoreFile, workspaceId: string, showId: string) {
  const eventIds = store.events
    .filter((event) => event.workspaceId === workspaceId && event.showId === showId)
    .map((event) => event.id);

  store.events = store.events.filter(
    (event) => !(event.workspaceId === workspaceId && event.showId === showId)
  );
  store.ticketClasses = store.ticketClasses.filter(
    (entry) => !eventIds.includes(entry.ticketingEventId)
  );
  store.orders = store.orders.filter((entry) => !eventIds.includes(entry.ticketingEventId));
  store.attendees = store.attendees.filter((entry) => !eventIds.includes(entry.ticketingEventId));
  store.snapshots = store.snapshots.filter((entry) => !eventIds.includes(entry.ticketingEventId));
}

export async function unlinkTicketingShowEvent(workspaceId: string, showId: string) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const existingEvent =
    store.events.find(
      (event) => event.workspaceId === workspaceId && event.showId === showId
    ) ?? null;

  if (!existingEvent) {
    return false;
  }

  clearShowTicketingArtifacts(store, workspaceId, showId);
  appendLog(store, {
    workspaceId,
    showId,
    integrationId: existingEvent.integrationId,
    provider: existingEvent.provider,
    level: "warning",
    message: `Ticketing event ${existingEvent.title} unlinked from show ${showId}.`,
    context: existingEvent.externalEventId
  });
  await persistStoreMutation(previousStore, store, `unlink-ticketing-show-${showId}`);

  return true;
}

export async function linkTicketingEventToShow(payload: {
  workspaceId: string;
  showId: string;
  integrationId: string;
  externalEventId: string;
  externalEvent?: ProviderExternalEvent | null;
}) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const integration = store.integrations.find(
    (entry) =>
      entry.workspaceId === payload.workspaceId && entry.id === payload.integrationId
  );

  if (!integration) {
    throw new Error("TICKETING_INTEGRATION_NOT_FOUND");
  }

  clearShowTicketingArtifacts(store, payload.workspaceId, payload.showId);

  const now = new Date().toISOString();
  const eventId = `ticketing-event-${randomUUID()}`;
  const record: TicketingEvent = {
    id: eventId,
    workspaceId: payload.workspaceId,
    showId: payload.showId,
    integrationId: integration.id,
    provider: integration.provider,
    externalEventId: payload.externalEventId,
    externalEventUrl: payload.externalEvent?.url ?? null,
    title: payload.externalEvent?.title ?? "Linked external event",
    startsAt: payload.externalEvent?.startsAt ?? null,
    venueName: payload.externalEvent?.venueName ?? null,
    venueCity: payload.externalEvent?.venueCity ?? null,
    currency: payload.externalEvent?.currency ?? "GBP",
    capacity: payload.externalEvent?.capacity ?? null,
    grossRevenue: 0,
    netRevenue: 0,
    fees: 0,
    ticketsSold: 0,
    remainingCapacity: payload.externalEvent?.capacity ?? null,
    averageTicketPrice: null,
    guestlistCount: 0,
    refundCount: 0,
    linkedAt: now,
    lastSyncedAt: null,
    updatedAt: now
  };

  store.events.push(record);
  appendLog(store, {
    workspaceId: payload.workspaceId,
    showId: payload.showId,
    integrationId: integration.id,
    provider: integration.provider,
    level: "info",
    message: `Linked external event ${payload.externalEventId} to show ${payload.showId}.`,
    context: payload.externalEvent?.title ?? null
  });
  await persistStoreMutation(previousStore, store, `link-ticketing-show-${payload.showId}`);

  return record;
}

export async function getShowTicketingWorkspace(workspaceId: string, showId: string) {
  const store = await readStore();
  const integrations = store.integrations
    .filter((integration) => integration.workspaceId === workspaceId)
    .map((integration) => sanitizeIntegration(integration));
  const event =
    store.events.find(
      (entry) => entry.workspaceId === workspaceId && entry.showId === showId
    ) ?? null;
  const ticketClasses = event
    ? store.ticketClasses.filter((entry) => entry.ticketingEventId === event.id)
    : [];
  const orders = event
    ? store.orders.filter((entry) => entry.ticketingEventId === event.id)
    : [];
  const attendees = event
    ? store.attendees.filter((entry) => entry.ticketingEventId === event.id)
    : [];
  const snapshots = event
    ? store.snapshots.filter((entry) => entry.ticketingEventId === event.id)
    : [];
  const logs = store.logs
    .filter(
      (entry) =>
        entry.workspaceId === workspaceId &&
        (entry.showId === showId || entry.showId === null)
    )
    .slice(0, 20);

  return {
    integrations,
    event,
    ticketClasses,
    orders,
    attendees,
    snapshots,
    logs
  };
}

export async function syncTicketingShowEvent(workspaceId: string, showId: string) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const existingEvent =
    store.events.find(
      (event) => event.workspaceId === workspaceId && event.showId === showId
    ) ?? null;

  if (!existingEvent) {
    throw new Error("TICKETING_EVENT_NOT_LINKED");
  }

  const integration = store.integrations.find(
    (entry) =>
      entry.workspaceId === workspaceId && entry.id === existingEvent.integrationId
  );

  if (!integration) {
    throw new Error("TICKETING_INTEGRATION_NOT_FOUND");
  }

  const provider = getTicketingProviderClient(integration.provider);

  try {
    const bundle = await provider.syncEvent(
      decryptCredentials(integration.encryptedCredentials),
      existingEvent.externalEventId
    );
    const now = new Date().toISOString();
    const nextEvent: TicketingEvent = {
      ...existingEvent,
      ...bundle.event,
      lastSyncedAt: now,
      updatedAt: now
    };

    store.events = store.events.map((event) =>
      event.id === existingEvent.id ? nextEvent : event
    );
    store.ticketClasses = store.ticketClasses.filter(
      (entry) => entry.ticketingEventId !== existingEvent.id
    );
    store.orders = store.orders.filter(
      (entry) => entry.ticketingEventId !== existingEvent.id
    );
    store.attendees = store.attendees.filter(
      (entry) => entry.ticketingEventId !== existingEvent.id
    );

    store.ticketClasses.push(
      ...bundle.ticketClasses.map((entry) => ({
        id: `ticket-class-${randomUUID()}`,
        workspaceId,
        showId,
        ticketingEventId: existingEvent.id,
        updatedAt: now,
        ...entry
      }))
    );
    store.orders.push(
      ...bundle.orders.map((entry) => ({
        id: `ticket-order-${randomUUID()}`,
        workspaceId,
        showId,
        ticketingEventId: existingEvent.id,
        ...entry
      }))
    );
    store.attendees.push(
      ...bundle.attendees.map((entry) => ({
        id: `ticket-attendee-${randomUUID()}`,
        workspaceId,
        showId,
        ticketingEventId: existingEvent.id,
        ...entry
      }))
    );
    store.snapshots.unshift({
      id: `ticketing-snapshot-${randomUUID()}`,
      workspaceId,
      showId,
      ticketingEventId: existingEvent.id,
      capturedAt: now,
      ...bundle.snapshot
    });
    store.snapshots = store.snapshots.slice(0, 400);
    integration.lastSyncAt = now;
    integration.lastError = null;
    integration.status = "connected";
    integration.updatedAt = now;

    appendLog(store, {
      workspaceId,
      showId,
      integrationId: integration.id,
      provider: integration.provider,
      level: "info",
      message: `Ticketing sync completed for ${nextEvent.title}.`,
      context: `${nextEvent.ticketsSold} sold • ${nextEvent.currency} ${nextEvent.grossRevenue.toFixed(2)} gross`
    });

    await persistStoreMutation(previousStore, store, `sync-ticketing-show-${showId}`);
    return getShowTicketingWorkspace(workspaceId, showId);
  } catch (error) {
    integration.lastError = error instanceof Error ? error.message : "Unknown ticketing sync error";
    integration.status = "needs-attention";
    integration.updatedAt = new Date().toISOString();
    appendLog(store, {
      workspaceId,
      showId,
      integrationId: integration.id,
      provider: integration.provider,
      level: "error",
      message: "Ticketing sync failed.",
      context: integration.lastError
    });
    await persistStoreMutation(previousStore, store, `ticketing-sync-error-${showId}`);
    throw error;
  }
}

export async function getWorkspaceTicketingSummaries(workspaceId: string) {
  const store = await readStore();
  const events = store.events.filter((event) => event.workspaceId === workspaceId);

  return events.map((event) => {
    const latestSnapshot =
      store.snapshots.find((snapshot) => snapshot.ticketingEventId === event.id) ??
      null;

    return {
      showId: event.showId,
      event,
      snapshot: latestSnapshot
    };
  });
}

export async function handleTicketingWebhook(payload: {
  provider: TicketingProvider;
  body: unknown;
  headers: Headers;
}) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const provider = getTicketingProviderClient(payload.provider);
  const parsed = provider.parseWebhook(payload.body, payload.headers);
  const matchingEvent =
    parsed.externalEventId
      ? store.events.find(
          (event) =>
            event.provider === payload.provider &&
            event.externalEventId === parsed.externalEventId
        ) ?? null
      : null;

  appendLog(store, {
    workspaceId: matchingEvent?.workspaceId ?? "unknown",
    showId: matchingEvent?.showId ?? null,
    integrationId: matchingEvent?.integrationId ?? null,
    provider: payload.provider,
    level: parsed.type === "unknown" ? "warning" : "info",
    message: parsed.summary,
    context:
      parsed.externalOrderId ??
      parsed.externalAttendeeId ??
      parsed.externalEventId ??
      null
  });

  if (matchingEvent) {
    matchingEvent.updatedAt = new Date().toISOString();
  }

  await persistStoreMutation(previousStore, store, `ticketing-webhook-${payload.provider}`);
  return parsed;
}

export async function deleteWorkspaceTicketingData(workspaceId: string) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const eventIds = new Set(
    store.events
      .filter((event) => event.workspaceId === workspaceId)
      .map((event) => event.id)
  );

  const hadData =
    store.integrations.some((entry) => entry.workspaceId === workspaceId) ||
    store.events.some((entry) => entry.workspaceId === workspaceId) ||
    store.ticketClasses.some((entry) => eventIds.has(entry.ticketingEventId)) ||
    store.orders.some((entry) => eventIds.has(entry.ticketingEventId)) ||
    store.attendees.some((entry) => eventIds.has(entry.ticketingEventId)) ||
    store.snapshots.some((entry) => eventIds.has(entry.ticketingEventId)) ||
    store.logs.some((entry) => entry.workspaceId === workspaceId);

  if (!hadData) {
    return;
  }

  store.integrations = store.integrations.filter((entry) => entry.workspaceId !== workspaceId);
  store.events = store.events.filter((entry) => entry.workspaceId !== workspaceId);
  store.ticketClasses = store.ticketClasses.filter(
    (entry) => !eventIds.has(entry.ticketingEventId)
  );
  store.orders = store.orders.filter((entry) => !eventIds.has(entry.ticketingEventId));
  store.attendees = store.attendees.filter((entry) => !eventIds.has(entry.ticketingEventId));
  store.snapshots = store.snapshots.filter((entry) => !eventIds.has(entry.ticketingEventId));
  store.logs = store.logs.filter((entry) => entry.workspaceId !== workspaceId);

  await persistStoreMutation(previousStore, store, `delete-ticketing-workspace-${workspaceId}`);
}

export async function getIntegrationCredentialsForWorkspace(
  workspaceId: string,
  integrationId: string
) {
  const store = await readStore();
  const integration = store.integrations.find(
    (entry) =>
      entry.workspaceId === workspaceId && entry.id === integrationId
  );

  if (!integration) {
    return null;
  }

  return decryptCredentials(integration.encryptedCredentials);
}
