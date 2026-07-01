import "server-only";

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";

import {
  buildEmptyWorkspaceData,
  buildInitialWorkspaceData,
  normalizeWorkspaceData,
  type BandosWorkspaceData,
  type BandosWorkspaceDataRecord
} from "@/lib/workspace-data";
import { isDemoWorkspaceId } from "@/lib/server/workspace-store";

type WorkspaceUIStoreFile = {
  version: 1;
  workspaces: BandosWorkspaceDataRecord[];
};

const DATA_DIRECTORY = process.env.VERCEL
  ? "/tmp/bandos-data"
  : join(process.cwd(), "data");
const STORE_FILE_PATH = join(DATA_DIRECTORY, "bandos-workspace-ui-store.json");
const BLOB_STORE_PATH = "workspace-ui/store.json";
const LOCAL_BACKUP_DIRECTORY = join(DATA_DIRECTORY, "workspace-ui-backups");
const BLOB_BACKUP_PREFIX = "workspace-ui/backups";
const SHOULD_USE_BLOB_STORE =
  process.env.VERCEL === "1" && Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function buildSeedRecord(workspaceId: string): BandosWorkspaceDataRecord {
  return {
    workspaceId,
    seeded: true,
    updatedAt: new Date().toISOString(),
    snapshot: isDemoWorkspaceId(workspaceId)
      ? buildInitialWorkspaceData()
      : buildEmptyWorkspaceData()
  };
}

function buildSeedStore(): WorkspaceUIStoreFile {
  return {
    version: 1,
    workspaces: []
  };
}

async function ensureStoreFile() {
  await mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await access(STORE_FILE_PATH);
  } catch {
    await writeFile(
      STORE_FILE_PATH,
      JSON.stringify(buildSeedStore(), null, 2),
      "utf8"
    );
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
  return JSON.parse(rawStore) as WorkspaceUIStoreFile;
}

async function writeBlobStore(store: WorkspaceUIStoreFile) {
  await putBlob(BLOB_STORE_PATH, JSON.stringify(store, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60
  });
}

async function writeWorkspaceBackup(record: BandosWorkspaceDataRecord) {
  const backupName = `${record.workspaceId}-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;

  if (SHOULD_USE_BLOB_STORE) {
    await putBlob(`${BLOB_BACKUP_PREFIX}/${backupName}`, JSON.stringify(record, null, 2), {
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
    JSON.stringify(record, null, 2),
    "utf8"
  );
}

async function readStore(): Promise<WorkspaceUIStoreFile> {
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
  return JSON.parse(rawStore) as WorkspaceUIStoreFile;
}

async function writeStore(store: WorkspaceUIStoreFile) {
  if (SHOULD_USE_BLOB_STORE) {
    await writeBlobStore(store);
    return;
  }

  await writeFile(STORE_FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function ensureWorkspaceRecord(
  store: WorkspaceUIStoreFile,
  workspaceId: string
) {
  const existingRecord = store.workspaces.find(
    (record) => record.workspaceId === workspaceId
  );

  if (existingRecord) {
    return { record: existingRecord, created: false };
  }

  const seededRecord = buildSeedRecord(workspaceId);
  store.workspaces.push(seededRecord);
  return { record: seededRecord, created: true };
}

export async function getWorkspaceUIRecord(workspaceId: string) {
  const store = await readStore();
  const existingRecord = store.workspaces.find(
    (record) => record.workspaceId === workspaceId
  );
  const ensured = existingRecord
    ? { record: existingRecord, created: false }
    : ensureWorkspaceRecord(store, workspaceId);

  if (ensured.created) {
    await writeStore(store);
  }

  return {
    ...ensured.record,
    snapshot: normalizeWorkspaceData(ensured.record.snapshot)
  };
}

export async function replaceWorkspaceUIRecord(payload: {
  workspaceId: string;
  snapshot: BandosWorkspaceData;
  baseUpdatedAt?: string | null;
}) {
  const store = await readStore();
  const normalizedSnapshot = normalizeWorkspaceData(payload.snapshot);
  const currentRecord =
    store.workspaces.find((record) => record.workspaceId === payload.workspaceId) ??
    null;

  if (currentRecord && payload.baseUpdatedAt !== currentRecord.updatedAt) {
    throw new Error("STALE_WORKSPACE_UI_SNAPSHOT");
  }

  if (currentRecord) {
    await writeWorkspaceBackup(currentRecord);
  }

  const nextRecord: BandosWorkspaceDataRecord = {
    workspaceId: payload.workspaceId,
    seeded: false,
    updatedAt: new Date().toISOString(),
    snapshot: normalizedSnapshot
  };
  const recordIndex = store.workspaces.findIndex(
    (record) => record.workspaceId === payload.workspaceId
  );

  if (recordIndex >= 0) {
    store.workspaces[recordIndex] = nextRecord;
  } else {
    store.workspaces.push(nextRecord);
  }

  await writeStore(store);
  return nextRecord;
}

export async function deleteWorkspaceUIRecord(workspaceId: string) {
  const store = await readStore();
  const record = store.workspaces.find((entry) => entry.workspaceId === workspaceId) ?? null;
  const nextRecords = store.workspaces.filter((record) => record.workspaceId !== workspaceId);

  if (nextRecords.length === store.workspaces.length) {
    return;
  }

  if (record) {
    await writeWorkspaceBackup(record);
  }

  store.workspaces = nextRecords;
  await writeStore(store);
}
