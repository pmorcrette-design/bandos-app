import "server-only";

import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { normalizeLocale, type Locale } from "@/lib/i18n";
import {
  normalizeCurrency,
  type SupportedCurrency
} from "@/lib/utils";

import { hashPassword, verifyPassword } from "@/lib/server/passwords";

export type WorkspaceAccessRole = "owner" | "admin" | "member" | "viewer";

export type WorkspaceRecord = {
  id: string;
  name: string;
  genre: string;
  country: string;
  logoUrl: string;
  currency: SupportedCurrency;
  locale: Locale;
  onboarded: boolean;
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

const DATA_DIRECTORY = join(process.cwd(), "data");
const STORE_FILE_PATH = join(DATA_DIRECTORY, "bandos-workspace-store.json");
const DEMO_PASSWORD = "touring-demo";
const DEMO_WORKSPACE_ID = "workspace-widespread-disease";

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

async function buildSeedStore(): Promise<WorkspaceStore> {
  const now = new Date().toISOString();
  const workspace: WorkspaceRecord = {
    id: DEMO_WORKSPACE_ID,
    name: "WIDESPREAD DISEASE",
    genre: "Deathcore",
    country: "France",
    logoUrl: "/widespread-disease-logo.jpg",
    currency: "EUR",
    locale: "fr",
    onboarded: true,
    createdAt: now,
    updatedAt: now
  };

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
      title: account.title,
      imageUrl: null,
      createdAt: now,
      updatedAt: now
    }))
  );

  return {
    version: 1,
    workspaces: [workspace],
    users,
    ataCarnets: [
      {
        workspaceId: workspace.id,
        items: [],
        updatedAt: now
      }
    ]
  };
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

async function readStore(): Promise<WorkspaceStore> {
  await ensureStoreFile();
  const rawStore = await readFile(STORE_FILE_PATH, "utf8");
  return JSON.parse(rawStore) as WorkspaceStore;
}

async function writeStore(store: WorkspaceStore) {
  await writeFile(STORE_FILE_PATH, JSON.stringify(store, null, 2), "utf8");
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
  const normalizedEmail = payload.email.trim().toLowerCase();

  if (
    store.users.some((user) => user.email.toLowerCase() === normalizedEmail)
  ) {
    throw new Error("EMAIL_ALREADY_IN_USE");
  }

  const now = new Date().toISOString();
  const workspaceId = randomUUID();
  const workspace: WorkspaceRecord = {
    id: workspaceId,
    name: payload.workspaceName.trim() || "New workspace",
    genre: "Unspecified",
    country: "France",
    logoUrl: "/widespread-disease-logo.jpg",
    currency: "EUR",
    locale: "fr",
    onboarded: false,
    createdAt: now,
    updatedAt: now
  };
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
  await writeStore(store);

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
  const workspaceIndex = store.workspaces.findIndex(
    (workspace) => workspace.id === workspaceId
  );

  if (workspaceIndex < 0) {
    return null;
  }

  const existing = store.workspaces[workspaceIndex];
  const updatedWorkspace: WorkspaceRecord = {
    ...existing,
    name: patch.name?.trim() || existing.name,
    genre: patch.genre?.trim() || existing.genre,
    country: patch.country?.trim() || existing.country,
    logoUrl: patch.logoUrl?.trim() || existing.logoUrl,
    currency: normalizeCurrency(patch.currency ?? existing.currency),
    locale: normalizeLocale(patch.locale ?? existing.locale),
    onboarded: patch.onboarded ?? existing.onboarded,
    updatedAt: new Date().toISOString()
  };

  store.workspaces[workspaceIndex] = updatedWorkspace;
  await writeStore(store);
  return updatedWorkspace;
}

export async function getWorkspaceById(workspaceId: string) {
  const store = await readStore();
  return (
    store.workspaces.find((workspace) => workspace.id === workspaceId) ?? null
  );
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
    title: payload.title.trim() || "Team member",
    imageUrl: null,
    createdAt: now,
    updatedAt: now
  };

  store.users.push(user);
  await writeStore(store);
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
  await writeStore(store);
  return sanitizeAccessUser(updatedUser);
}

export async function deleteWorkspaceAccessUser(payload: {
  workspaceId: string;
  userId: string;
}) {
  const store = await readStore();
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
  await writeStore(store);
}

export async function listAtaCarnetItems(workspaceId: string) {
  const store = await readStore();
  return getAtaRecord(store, workspaceId).items.map((item) =>
    sanitizeAtaItem(item)
  );
}

export async function replaceAtaCarnetItems(payload: {
  workspaceId: string;
  items: Array<Partial<AtaCarnetItem> & Pick<AtaCarnetItem, "id">>;
}) {
  const store = await readStore();
  const record = getAtaRecord(store, payload.workspaceId);
  record.items = payload.items.map((item) => sanitizeAtaItem(item));
  record.updatedAt = new Date().toISOString();
  await writeStore(store);
  return record.items;
}
