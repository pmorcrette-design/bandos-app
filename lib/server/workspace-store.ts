import "server-only";

import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";

import { normalizeLocale, type Locale } from "@/lib/i18n";
import {
  normalizeCurrency,
  type SupportedCurrency
} from "@/lib/utils";

import { hashPassword, verifyPassword } from "@/lib/server/passwords";

export type WorkspaceAccessRole = "owner" | "admin" | "member" | "viewer";
export type WorkspaceSubscriptionPlan = "starter" | "touring" | "label";

export type WorkspaceRecord = {
  id: string;
  name: string;
  genre: string;
  country: string;
  logoUrl: string;
  currency: SupportedCurrency;
  locale: Locale;
  onboarded: boolean;
  subscriptionPlan: WorkspaceSubscriptionPlan;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceAccessUserRecord = {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: WorkspaceAccessRole;
  isBandosAdmin?: boolean;
  title: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceAccessUser = Omit<WorkspaceAccessUserRecord, "passwordHash">;

export type AtaCarnetItem = {
  id: string;
  pieces: number;
  packaging: string;
  designation: string;
  weight: number;
  weightUnit: string;
  valueExVat: number;
  origin: string;
  serialNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type AtaCarnetRecord = {
  workspaceId: string;
  items: AtaCarnetItem[];
  updatedAt: string;
};

type WorkspaceStore = {
  version: 1;
  workspaces: WorkspaceRecord[];
  users: WorkspaceAccessUserRecord[];
  ataCarnets: AtaCarnetRecord[];
};

const DATA_DIRECTORY = process.env.VERCEL
  ? "/tmp/bandos-data"
  : join(process.cwd(), "data");
const STORE_FILE_PATH = join(DATA_DIRECTORY, "bandos-workspace-store.json");
const BLOB_STORE_PATH = "workspace-store/store.json";
const LOCAL_BACKUP_DIRECTORY = join(DATA_DIRECTORY, "workspace-store-backups");
const BLOB_BACKUP_PREFIX = "workspace-store/backups";
const SHOULD_USE_BLOB_STORE =
  process.env.VERCEL === "1" && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const DEMO_PASSWORD = "touring-demo";
const DEMO_WORKSPACE_ID = "workspace-widespread-disease";
const INTERNAL_ADMIN_WORKSPACE_ID = "workspace-bandos-control-center";
const DEFAULT_TRIAL_DAYS = 14;
const PRIMARY_BANDOS_ADMIN_EMAIL = "p.morcrette@gmail.com";
const PRIMARY_BANDOS_ADMIN_NAME = "Pierre Morcrette";

export type WorkspaceSummary = {
  workspace: WorkspaceRecord;
  owner: WorkspaceAccessUser | null;
  userCount: number;
  isProtected: boolean;
  trialDaysLeft: number;
};

function addTrialDays(days: number) {
  if (days <= 0) {
    return null;
  }

  const target = new Date();
  target.setUTCDate(target.getUTCDate() + days);
  return target.toISOString();
}

function getTrialDaysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) {
    return 0;
  }

  const diffMs = new Date(trialEndsAt).getTime() - Date.now();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function normalizeSubscriptionPlan(
  value?: string | null
): WorkspaceSubscriptionPlan {
  if (value === "starter" || value === "touring" || value === "label") {
    return value;
  }

  return "starter";
}

function normalizeWorkspaceRecord(
  workspace: Partial<WorkspaceRecord> & Pick<WorkspaceRecord, "id">
): WorkspaceRecord {
  const now = new Date().toISOString();

  return {
    id: workspace.id,
    name: workspace.name?.trim() || "New workspace",
    genre: workspace.genre?.trim() || "Unspecified",
    country: workspace.country?.trim() || "Unspecified",
    logoUrl: workspace.logoUrl?.trim() || "/bandos-mark.svg",
    currency: normalizeCurrency(workspace.currency),
    locale: normalizeLocale(workspace.locale),
    onboarded: workspace.onboarded ?? false,
    subscriptionPlan: normalizeSubscriptionPlan(workspace.subscriptionPlan),
    trialEndsAt: workspace.trialEndsAt?.trim() || null,
    createdAt: workspace.createdAt ?? now,
    updatedAt: workspace.updatedAt ?? now
  };
}

export function isDemoWorkspaceId(workspaceId: string) {
  return workspaceId === DEMO_WORKSPACE_ID;
}

export function isInternalBandosAdminWorkspaceId(workspaceId: string) {
  return workspaceId === INTERNAL_ADMIN_WORKSPACE_ID;
}

export function isBandosPlatformAdminEmail(email: string) {
  const configuredEmails = (process.env.BANDOS_ADMIN_EMAILS ?? "p.morcrette@gmail.com")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return configuredEmails.includes(email.trim().toLowerCase());
}

function isUserBandosAdmin(user: Pick<WorkspaceAccessUserRecord, "email" | "isBandosAdmin">) {
  return Boolean(user.isBandosAdmin) || isBandosPlatformAdminEmail(user.email);
}

function sanitizeAccessUser(user: WorkspaceAccessUserRecord): WorkspaceAccessUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function sanitizeAtaItem(item: Partial<AtaCarnetItem> & Pick<AtaCarnetItem, "id">): AtaCarnetItem {
  const now = new Date().toISOString();

  return {
    id: item.id,
    pieces:
      typeof item.pieces === "number" && item.pieces > 0
        ? Math.floor(item.pieces)
        : 1,
    packaging: item.packaging?.trim() ?? "",
    designation: item.designation?.trim() || "Backline item",
    weight:
      typeof item.weight === "number" && item.weight >= 0
        ? Number(item.weight.toFixed(2))
        : 0,
    weightUnit: item.weightUnit?.trim() || "kg",
    valueExVat:
      typeof item.valueExVat === "number" && item.valueExVat >= 0
        ? Number(item.valueExVat.toFixed(2))
        : 0,
    origin: item.origin?.trim() || "",
    serialNumber: item.serialNumber?.trim() || "",
    notes: item.notes?.trim() || "",
    createdAt: item.createdAt ?? now,
    updatedAt: now
  };
}

async function createUnavailablePasswordHash() {
  return hashPassword(`${randomUUID()}-${randomUUID()}`);
}

async function buildSeedStore(): Promise<WorkspaceStore> {
  const now = new Date().toISOString();
  const workspace = normalizeWorkspaceRecord({
    id: DEMO_WORKSPACE_ID,
    name: "WIDESPREAD DISEASE",
    genre: "Deathcore",
    country: "France",
    logoUrl: "/widespread-disease-logo.jpg",
    currency: "EUR",
    locale: "fr",
    onboarded: true,
    subscriptionPlan: "touring",
    trialEndsAt: null,
    createdAt: now,
    updatedAt: now
  });

  const seedAccounts = [
    {
      id: "user-wd-owner",
      name: "WIDESPREAD DISEASE",
      email: "ops@widespreaddisease.com",
      role: "owner" as const,
      title: "Workspace owner"
    },
    {
      id: "user-wd-manager",
      name: "Camille Veil",
      email: "manager@widespreaddisease.com",
      role: "admin" as const,
      title: "Tour manager"
    },
    {
      id: "user-wd-foh",
      name: "Noah Veil",
      email: "foh@widespreaddisease.com",
      role: "member" as const,
      title: "Sound engineer"
    },
    {
      id: "user-wd-merch",
      name: "Avery Stone",
      email: "merch@widespreaddisease.com",
      role: "member" as const,
      title: "Merch seller"
    },
    {
      id: "user-wd-driver",
      name: "Milo Drift",
      email: "driver@widespreaddisease.com",
      role: "viewer" as const,
      title: "Driver"
    }
  ];

  const users = await Promise.all(
    seedAccounts.map(async (account) => ({
      id: account.id,
      workspaceId: workspace.id,
      name: account.name,
      email: account.email,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      role: account.role,
      isBandosAdmin: false,
      title: account.title,
      imageUrl: null,
      createdAt: now,
      updatedAt: now
    }))
  );

  const internalAdminWorkspace = normalizeWorkspaceRecord({
    id: INTERNAL_ADMIN_WORKSPACE_ID,
    name: "BandOS Control Center",
    genre: "Internal",
    country: "Internal",
    logoUrl: "/bandos-mark.svg",
    currency: "EUR",
    locale: "fr",
    onboarded: true,
    subscriptionPlan: "label",
    trialEndsAt: null,
    createdAt: now,
    updatedAt: now
  });

  users.push({
    id: "user-bandos-admin-primary",
    workspaceId: internalAdminWorkspace.id,
    name: PRIMARY_BANDOS_ADMIN_NAME,
    email: PRIMARY_BANDOS_ADMIN_EMAIL,
    passwordHash: await createUnavailablePasswordHash(),
    role: "owner",
    isBandosAdmin: true,
    title: "BandOS platform admin",
    imageUrl: null,
    createdAt: now,
    updatedAt: now
  });

  return {
    version: 1,
    workspaces: [workspace, internalAdminWorkspace],
    users,
    ataCarnets: [
      {
        workspaceId: workspace.id,
        items: [],
        updatedAt: now
      },
      {
        workspaceId: internalAdminWorkspace.id,
        items: [],
        updatedAt: now
      }
    ]
  };
}

async function ensureInternalBandosAdminWorkspace(store: WorkspaceStore) {
  const now = new Date().toISOString();
  let changed = false;
  const workspaceIndex = store.workspaces.findIndex(
    (workspace) => workspace.id === INTERNAL_ADMIN_WORKSPACE_ID
  );

  if (workspaceIndex < 0) {
    store.workspaces.push(
      normalizeWorkspaceRecord({
        id: INTERNAL_ADMIN_WORKSPACE_ID,
        name: "BandOS Control Center",
        genre: "Internal",
        country: "Internal",
        logoUrl: "/bandos-mark.svg",
        currency: "EUR",
        locale: "fr",
        onboarded: true,
        subscriptionPlan: "label",
        trialEndsAt: null,
        createdAt: now,
        updatedAt: now
      })
    );
    changed = true;
  }

  const adminIndex = store.users.findIndex(
    (user) => user.email.toLowerCase() === PRIMARY_BANDOS_ADMIN_EMAIL
  );

  if (adminIndex < 0) {
    store.users.push({
      id: randomUUID(),
      workspaceId: INTERNAL_ADMIN_WORKSPACE_ID,
      name: PRIMARY_BANDOS_ADMIN_NAME,
      email: PRIMARY_BANDOS_ADMIN_EMAIL,
      passwordHash: await createUnavailablePasswordHash(),
      role: "owner",
      isBandosAdmin: true,
      title: "BandOS platform admin",
      imageUrl: null,
      createdAt: now,
      updatedAt: now
    });
    changed = true;
  } else {
    const existingAdmin = store.users[adminIndex];

    if (
      existingAdmin.workspaceId !== INTERNAL_ADMIN_WORKSPACE_ID ||
      !existingAdmin.isBandosAdmin
    ) {
      store.users[adminIndex] = {
        ...existingAdmin,
        workspaceId: INTERNAL_ADMIN_WORKSPACE_ID,
        isBandosAdmin: true,
        updatedAt: now
      };
      changed = true;
    }
  }

  const ataCountBefore = store.ataCarnets.length;
  getAtaRecord(store, INTERNAL_ADMIN_WORKSPACE_ID);
  if (store.ataCarnets.length !== ataCountBefore) {
    changed = true;
  }
  return changed;
}

async function ensureStoreFile() {
  await mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await access(STORE_FILE_PATH);
  } catch {
    const seedStore = await buildSeedStore();
    await writeFile(STORE_FILE_PATH, JSON.stringify(seedStore, null, 2), "utf8");
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
  return JSON.parse(rawStore) as WorkspaceStore;
}

async function writeBlobStore(store: WorkspaceStore) {
  await putBlob(BLOB_STORE_PATH, JSON.stringify(store, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60
  });
}

async function writeStoreBackup(store: WorkspaceStore, reason: string) {
  const safeReason = reason.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
  const backupName = `${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}-${safeReason || "workspace-store"}.json`;

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

async function readStore(): Promise<WorkspaceStore> {
  if (SHOULD_USE_BLOB_STORE) {
    const blobStore = await readBlobStore();

    if (blobStore) {
      const changed = await ensureInternalBandosAdminWorkspace(blobStore);
      if (changed) {
        await writeBlobStore(blobStore);
      }

      return {
        ...blobStore,
        workspaces: (blobStore.workspaces ?? []).map((workspace) =>
          normalizeWorkspaceRecord(workspace)
        ),
        users: (blobStore.users ?? []).map((user) => ({
          ...user,
          isBandosAdmin: Boolean(user.isBandosAdmin)
        })),
        ataCarnets: blobStore.ataCarnets ?? []
      };
    }

    const seedStore = await buildSeedStore();
    await writeBlobStore(seedStore);
    return seedStore;
  }

  await ensureStoreFile();
  const rawStore = await readFile(STORE_FILE_PATH, "utf8");
  const parsedStore = JSON.parse(rawStore) as WorkspaceStore;
  const changed = await ensureInternalBandosAdminWorkspace(parsedStore);
  if (changed) {
    await writeFile(STORE_FILE_PATH, JSON.stringify(parsedStore, null, 2), "utf8");
  }

  return {
    ...parsedStore,
    workspaces: (parsedStore.workspaces ?? []).map((workspace) =>
      normalizeWorkspaceRecord(workspace)
    ),
    users: (parsedStore.users ?? []).map((user) => ({
      ...user,
      isBandosAdmin: Boolean(user.isBandosAdmin)
    })),
    ataCarnets: parsedStore.ataCarnets ?? []
  };
}

async function writeStore(store: WorkspaceStore) {
  if (SHOULD_USE_BLOB_STORE) {
    await writeBlobStore(store);
    return;
  }

  await writeFile(STORE_FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function persistStoreMutation(
  previousStore: WorkspaceStore,
  nextStore: WorkspaceStore,
  reason: string
) {
  await writeStoreBackup(previousStore, reason);
  await writeStore(nextStore);
}

function getWorkspaceAccessUsers(
  store: WorkspaceStore,
  workspaceId: string
) {
  return store.users
    .filter((user) => user.workspaceId === workspaceId)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getAtaRecord(store: WorkspaceStore, workspaceId: string) {
  const existingRecord = store.ataCarnets.find(
    (record) => record.workspaceId === workspaceId
  );

  if (existingRecord) {
    return existingRecord;
  }

  const record: AtaCarnetRecord = {
    workspaceId,
    items: [],
    updatedAt: new Date().toISOString()
  };
  store.ataCarnets.push(record);
  return record;
}

export async function getDemoWorkspace() {
  const store = await readStore();
  return (
    store.workspaces.find((workspace) => workspace.id === DEMO_WORKSPACE_ID) ??
    store.workspaces[0] ??
    null
  );
}

export async function getDemoOwnerAccount() {
  const store = await readStore();
  return (
    store.users.find(
      (user) =>
        user.workspaceId === DEMO_WORKSPACE_ID &&
        user.role === "owner" &&
        user.email === "ops@widespreaddisease.com"
    ) ?? null
  );
}

export async function authenticateWorkspaceUser(
  email: string,
  password: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  const store = await readStore();
  const user = store.users.find(
    (entry) => entry.email.toLowerCase() === normalizedEmail
  );

  if (!user) {
    return null;
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  const workspace = store.workspaces.find(
    (entry) => entry.id === user.workspaceId
  );

  if (!workspace) {
    return null;
  }

  return {
    user,
    workspace
  };
}

export async function createWorkspaceOwnerAccount(payload: {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
}) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const normalizedEmail = payload.email.trim().toLowerCase();

  if (
    store.users.some((user) => user.email.toLowerCase() === normalizedEmail)
  ) {
    throw new Error("EMAIL_ALREADY_IN_USE");
  }

  const now = new Date().toISOString();
  const workspaceId = randomUUID();
  const workspace = normalizeWorkspaceRecord({
    id: workspaceId,
    name: payload.workspaceName.trim() || "New workspace",
    genre: "Unspecified",
    country: "Unspecified",
    logoUrl: "/bandos-mark.svg",
    currency: "EUR",
    locale: "fr",
    onboarded: false,
    subscriptionPlan: "starter",
    trialEndsAt: addTrialDays(DEFAULT_TRIAL_DAYS),
    createdAt: now,
    updatedAt: now
  });
  const user: WorkspaceAccessUserRecord = {
    id: randomUUID(),
    workspaceId,
    name: payload.name.trim() || payload.workspaceName.trim() || "Workspace owner",
    email: normalizedEmail,
    passwordHash: await hashPassword(payload.password),
    role: "owner",
    title: "Workspace owner",
    imageUrl: null,
    createdAt: now,
    updatedAt: now
  };

  store.workspaces.push(workspace);
  store.users.push(user);
  store.ataCarnets.push({
    workspaceId,
    items: [],
    updatedAt: now
  });
  await persistStoreMutation(previousStore, store, `create-workspace-${workspaceId}`);

  return {
    workspace,
    user
  };
}

export async function updateWorkspaceProfile(
  workspaceId: string,
  patch: Partial<
    Pick<
      WorkspaceRecord,
      "name" | "genre" | "country" | "logoUrl" | "currency" | "locale" | "onboarded"
    >
  >
) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const workspaceIndex = store.workspaces.findIndex(
    (workspace) => workspace.id === workspaceId
  );

  if (workspaceIndex < 0) {
    return null;
  }

  const existing = store.workspaces[workspaceIndex];
  const updatedWorkspace = normalizeWorkspaceRecord({
    ...existing,
    name: patch.name?.trim() || existing.name,
    genre: patch.genre?.trim() || existing.genre,
    country: patch.country?.trim() || existing.country,
    logoUrl: patch.logoUrl?.trim() || existing.logoUrl,
    currency: normalizeCurrency(patch.currency ?? existing.currency),
    locale: normalizeLocale(patch.locale ?? existing.locale),
    onboarded: patch.onboarded ?? existing.onboarded,
    updatedAt: new Date().toISOString()
  });

  store.workspaces[workspaceIndex] = updatedWorkspace;
  await persistStoreMutation(previousStore, store, `update-workspace-${workspaceId}`);
  return updatedWorkspace;
}

export async function getWorkspaceById(workspaceId: string) {
  const store = await readStore();
  const workspace = store.workspaces.find((entry) => entry.id === workspaceId) ?? null;
  return workspace ? normalizeWorkspaceRecord(workspace) : null;
}

export async function getWorkspaceUserById(
  workspaceId: string,
  userId: string
) {
  const store = await readStore();
  return (
    store.users.find(
      (user) => user.workspaceId === workspaceId && user.id === userId
    ) ?? null
  );
}

export async function listWorkspaceAccessUsers(workspaceId: string) {
  const store = await readStore();
  return getWorkspaceAccessUsers(store, workspaceId).map((user) =>
    sanitizeAccessUser(user)
  );
}

export async function createWorkspaceAccessUser(payload: {
  workspaceId: string;
  name: string;
  email: string;
  password: string;
  role: WorkspaceAccessRole;
  title: string;
}) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const normalizedEmail = payload.email.trim().toLowerCase();

  if (
    store.users.some((user) => user.email.toLowerCase() === normalizedEmail)
  ) {
    throw new Error("EMAIL_ALREADY_IN_USE");
  }

  const now = new Date().toISOString();
  const user: WorkspaceAccessUserRecord = {
    id: randomUUID(),
    workspaceId: payload.workspaceId,
    name: payload.name.trim() || "New user",
    email: normalizedEmail,
    passwordHash: await hashPassword(payload.password),
    role: payload.role,
    isBandosAdmin: false,
    title: payload.title.trim() || "Team member",
    imageUrl: null,
    createdAt: now,
    updatedAt: now
  };

  store.users.push(user);
  await persistStoreMutation(previousStore, store, `create-user-${payload.workspaceId}`);
  return sanitizeAccessUser(user);
}

export async function updateWorkspaceAccessUser(payload: {
  workspaceId: string;
  userId: string;
  name?: string;
  email?: string;
  role?: WorkspaceAccessRole;
  title?: string;
  password?: string;
}) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const userIndex = store.users.findIndex(
    (user) => user.workspaceId === payload.workspaceId && user.id === payload.userId
  );

  if (userIndex < 0) {
    throw new Error("USER_NOT_FOUND");
  }

  const normalizedEmail = payload.email?.trim().toLowerCase();
  if (
    normalizedEmail &&
    store.users.some(
      (user) =>
        user.id !== payload.userId &&
        user.email.toLowerCase() === normalizedEmail
    )
  ) {
    throw new Error("EMAIL_ALREADY_IN_USE");
  }

  const currentUser = store.users[userIndex];
  const nextPasswordHash = payload.password?.trim()
    ? await hashPassword(payload.password)
    : currentUser.passwordHash;

  const updatedUser: WorkspaceAccessUserRecord = {
    ...currentUser,
    name: payload.name?.trim() || currentUser.name,
    email: normalizedEmail || currentUser.email,
    role: payload.role ?? currentUser.role,
    title: payload.title?.trim() || currentUser.title,
    passwordHash: nextPasswordHash,
    updatedAt: new Date().toISOString()
  };

  store.users[userIndex] = updatedUser;
  await persistStoreMutation(previousStore, store, `update-user-${payload.workspaceId}`);
  return sanitizeAccessUser(updatedUser);
}

export async function deleteWorkspaceAccessUser(payload: {
  workspaceId: string;
  userId: string;
}) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const workspaceUsers = getWorkspaceAccessUsers(store, payload.workspaceId);
  const targetUser = workspaceUsers.find((user) => user.id === payload.userId);

  if (!targetUser) {
    throw new Error("USER_NOT_FOUND");
  }

  if (
    targetUser.role === "owner" &&
    workspaceUsers.filter((user) => user.role === "owner").length <= 1
  ) {
    throw new Error("LAST_OWNER");
  }

  store.users = store.users.filter((user) => user.id !== payload.userId);
  await persistStoreMutation(previousStore, store, `delete-user-${payload.workspaceId}`);
}

export async function listAtaCarnetItems(workspaceId: string) {
  const store = await readStore();
  return getAtaRecord(store, workspaceId).items.map((item) =>
    sanitizeAtaItem(item)
  );
}

export async function listWorkspaceSummariesForBandosAdmin() {
  const store = await readStore();

  return store.workspaces
    .filter((workspace) => !isInternalBandosAdminWorkspaceId(workspace.id))
    .map<WorkspaceSummary>((workspace) => {
      const workspaceUsers = getWorkspaceAccessUsers(store, workspace.id);
      const owner =
        workspaceUsers.find((user) => user.role === "owner") ?? workspaceUsers[0] ?? null;

      return {
        workspace,
        owner: owner ? sanitizeAccessUser(owner) : null,
        userCount: workspaceUsers.length,
        isProtected: isDemoWorkspaceId(workspace.id),
        trialDaysLeft: getTrialDaysLeft(workspace.trialEndsAt)
      };
    })
    .sort((left, right) => right.workspace.updatedAt.localeCompare(left.workspace.updatedAt));
}

export async function listBandosPlatformAdminAccounts() {
  const store = await readStore();

  return store.users
    .filter((user) => isUserBandosAdmin(user))
    .map((user) => sanitizeAccessUser(user))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function findWorkspaceUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const store = await readStore();
  const user = store.users.find(
    (entry) => entry.email.toLowerCase() === normalizedEmail
  );

  if (!user) {
    return null;
  }

  const workspace = store.workspaces.find((entry) => entry.id === user.workspaceId) ?? null;

  if (!workspace) {
    return null;
  }

  return {
    user,
    workspace
  };
}

export async function updateWorkspaceUserPasswordById(userId: string, password: string) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const userIndex = store.users.findIndex((user) => user.id === userId);

  if (userIndex < 0) {
    throw new Error("USER_NOT_FOUND");
  }

  const currentUser = store.users[userIndex];
  const updatedUser: WorkspaceAccessUserRecord = {
    ...currentUser,
    passwordHash: await hashPassword(password),
    updatedAt: new Date().toISOString()
  };

  store.users[userIndex] = updatedUser;
  await persistStoreMutation(previousStore, store, `update-password-${updatedUser.workspaceId}`);
  return {
    user: sanitizeAccessUser(updatedUser),
    workspace:
      store.workspaces.find((entry) => entry.id === updatedUser.workspaceId) ?? null
  };
}

export async function createBandosPlatformAdminAccount(payload: {
  name: string;
  email: string;
  password: string;
  title: string;
}) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const normalizedEmail = payload.email.trim().toLowerCase();

  if (
    store.users.some((user) => user.email.toLowerCase() === normalizedEmail)
  ) {
    throw new Error("EMAIL_ALREADY_IN_USE");
  }

  const now = new Date().toISOString();
  const user: WorkspaceAccessUserRecord = {
    id: randomUUID(),
    workspaceId: INTERNAL_ADMIN_WORKSPACE_ID,
    name: payload.name.trim() || "BandOS admin",
    email: normalizedEmail,
    passwordHash: await hashPassword(payload.password),
    role: "owner",
    isBandosAdmin: true,
    title: payload.title.trim() || "BandOS platform admin",
    imageUrl: null,
    createdAt: now,
    updatedAt: now
  };

  store.users.push(user);
  await persistStoreMutation(previousStore, store, "create-bandos-admin");
  return sanitizeAccessUser(user);
}

export async function updateWorkspaceSubscriptionSettings(payload: {
  workspaceId: string;
  subscriptionPlan: WorkspaceSubscriptionPlan;
  trialDays: number;
}) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const workspaceIndex = store.workspaces.findIndex(
    (workspace) => workspace.id === payload.workspaceId
  );

  if (workspaceIndex < 0) {
    throw new Error("WORKSPACE_NOT_FOUND");
  }

  const currentWorkspace = store.workspaces[workspaceIndex];
  const nextWorkspace = normalizeWorkspaceRecord({
    ...currentWorkspace,
    subscriptionPlan: payload.subscriptionPlan,
    trialEndsAt: addTrialDays(Math.max(0, Math.floor(payload.trialDays))),
    updatedAt: new Date().toISOString()
  });

  store.workspaces[workspaceIndex] = nextWorkspace;
  await persistStoreMutation(previousStore, store, `update-subscription-${payload.workspaceId}`);
  return nextWorkspace;
}

export async function deleteWorkspaceClientAccount(workspaceId: string) {
  if (isDemoWorkspaceId(workspaceId)) {
    throw new Error("PROTECTED_WORKSPACE");
  }

  const store = await readStore();
  const previousStore = structuredClone(store);
  const workspaceExists = store.workspaces.some((workspace) => workspace.id === workspaceId);

  if (!workspaceExists) {
    throw new Error("WORKSPACE_NOT_FOUND");
  }

  store.workspaces = store.workspaces.filter((workspace) => workspace.id !== workspaceId);
  store.users = store.users.filter((user) => user.workspaceId !== workspaceId);
  store.ataCarnets = store.ataCarnets.filter((record) => record.workspaceId !== workspaceId);
  await persistStoreMutation(previousStore, store, `delete-workspace-${workspaceId}`);
}

export async function replaceAtaCarnetItems(payload: {
  workspaceId: string;
  items: Array<Partial<AtaCarnetItem> & Pick<AtaCarnetItem, "id">>;
}) {
  const store = await readStore();
  const previousStore = structuredClone(store);
  const record = getAtaRecord(store, payload.workspaceId);
  record.items = payload.items.map((item) => sanitizeAtaItem(item));
  record.updatedAt = new Date().toISOString();
  await persistStoreMutation(previousStore, store, `replace-ata-${payload.workspaceId}`);
  return record.items;
}
