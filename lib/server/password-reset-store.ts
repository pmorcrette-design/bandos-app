import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";

type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  workspaceId: string;
  email: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
};

type PasswordResetStore = {
  version: 1;
  tokens: PasswordResetTokenRecord[];
};

const DATA_DIRECTORY = process.env.VERCEL
  ? "/tmp/bandos-data"
  : join(process.cwd(), "data");
const STORE_FILE_PATH = join(DATA_DIRECTORY, "bandos-password-reset-store.json");
const BLOB_STORE_PATH = "password-reset-store/store.json";
const SHOULD_USE_BLOB_STORE =
  process.env.VERCEL === "1" && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const PASSWORD_RESET_TTL_HOURS = 2;

function buildSeedStore(): PasswordResetStore {
  return {
    version: 1,
    tokens: []
  };
}

function hashRawToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function pruneExpiredTokens(tokens: PasswordResetTokenRecord[]) {
  const now = Date.now();
  return tokens.filter((token) => {
    if (token.consumedAt) {
      return false;
    }

    return new Date(token.expiresAt).getTime() > now;
  });
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
  return JSON.parse(rawStore) as PasswordResetStore;
}

async function writeBlobStore(store: PasswordResetStore) {
  await putBlob(BLOB_STORE_PATH, JSON.stringify(store, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60
  });
}

async function readStore(): Promise<PasswordResetStore> {
  if (SHOULD_USE_BLOB_STORE) {
    const blobStore = await readBlobStore();

    if (blobStore) {
      return {
        ...blobStore,
        tokens: pruneExpiredTokens(blobStore.tokens ?? [])
      };
    }

    const seedStore = buildSeedStore();
    await writeBlobStore(seedStore);
    return seedStore;
  }

  await ensureStoreFile();
  const rawStore = await readFile(STORE_FILE_PATH, "utf8");
  const parsedStore = JSON.parse(rawStore) as PasswordResetStore;

  return {
    ...parsedStore,
    tokens: pruneExpiredTokens(parsedStore.tokens ?? [])
  };
}

async function writeStore(store: PasswordResetStore) {
  if (SHOULD_USE_BLOB_STORE) {
    await writeBlobStore(store);
    return;
  }

  await writeFile(STORE_FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function createPasswordResetToken(payload: {
  userId: string;
  workspaceId: string;
  email: string;
}) {
  const store = await readStore();
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000);

  store.tokens = store.tokens.filter(
    (entry) => entry.userId !== payload.userId && !entry.consumedAt
  );
  store.tokens.push({
    id: randomUUID(),
    userId: payload.userId,
    workspaceId: payload.workspaceId,
    email: payload.email.trim().toLowerCase(),
    tokenHash: hashRawToken(token),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    consumedAt: null
  });
  await writeStore(store);

  return {
    token,
    expiresAt: expiresAt.toISOString()
  };
}

export async function getPasswordResetTokenRecord(rawToken: string) {
  const store = await readStore();
  const tokenHash = hashRawToken(rawToken);
  const record =
    store.tokens.find(
      (entry) =>
        entry.tokenHash === tokenHash &&
        !entry.consumedAt &&
        new Date(entry.expiresAt).getTime() > Date.now()
    ) ?? null;

  return record;
}

export async function consumePasswordResetToken(rawToken: string) {
  const store = await readStore();
  const tokenHash = hashRawToken(rawToken);
  const recordIndex = store.tokens.findIndex(
    (entry) =>
      entry.tokenHash === tokenHash &&
      !entry.consumedAt &&
      new Date(entry.expiresAt).getTime() > Date.now()
  );

  if (recordIndex < 0) {
    return null;
  }

  const updatedRecord: PasswordResetTokenRecord = {
    ...store.tokens[recordIndex],
    consumedAt: new Date().toISOString()
  };
  store.tokens[recordIndex] = updatedRecord;
  await writeStore(store);
  return updatedRecord;
}
