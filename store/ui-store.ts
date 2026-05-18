"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  crmContacts as defaultCrmContacts,
  merchProducts as defaultMerchProducts,
  teamMembers as defaultTeamMembers,
  tourProviders as defaultTourProviders,
  type CrmContact,
  type MerchProduct,
  type TeamMember
} from "@/lib/mock-data";
import type { ImportedTourStop } from "@/lib/tours/import-types";
import { normalizeCurrency, type SupportedCurrency } from "@/lib/utils";

export type ImportedShowFolder = {
  id: string;
  importKey: string;
  tourName: string;
  folderName: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  address: string;
  tourCurrency: SupportedCurrency;
  capacity: number | null;
  ticketPrice: number | null;
  roomHire: number | null;
  soundEngineerId: string | null;
  soundEngineerCost: number | null;
  localSupportActs: ImportedLocalAct[];
  localBandCount: number;
  localBandFeePerBand: number | null;
  validated: boolean;
  status: "pending" | "booked" | "cancelled" | "local support needed";
  notes: string;
  importOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ImportedLocalAct = {
  id: string;
  name: string;
  role: "opener" | "support" | "other";
  fee: number | null;
};

export type EditableCrmContact = CrmContact;

export type VehicleCatalogItem = {
  id: string;
  name: string;
  type: "van" | "bus" | "driver";
  city: string;
  country: string;
  contact: string;
  website: string;
  estimatedDailyPrice: number;
  fleetSize: number;
  seats: number | null;
  bunks: number | null;
  merchCapacity: string;
  notes: string;
  tags: string[];
  vehiclePhotos: string[];
};

export type EditableMerchProduct = MerchProduct;
export type EditableTeamMember = TeamMember;

type BandosUIState = {
  commandPaletteOpen: boolean;
  favoriteCrmIds: string[];
  favoriteProviderIds: string[];
  crmView: "table" | "kanban";
  taskView: "list" | "kanban" | "calendar";
  importedShowFolders: ImportedShowFolder[];
  hiddenStandaloneShowIds: string[];
  crmCatalog: EditableCrmContact[];
  teamRoster: EditableTeamMember[];
  vehicleCatalog: VehicleCatalogItem[];
  merchCatalog: EditableMerchProduct[];
  uploadedDocuments: {
    id: string;
    name: string;
    category: string;
    tour: string;
  }[];
  toggleCommandPalette: (open?: boolean) => void;
  toggleCrmFavorite: (id: string) => void;
  toggleProviderFavorite: (id: string) => void;
  setCrmView: (view: "table" | "kanban") => void;
  setTaskView: (view: "list" | "kanban" | "calendar") => void;
  upsertImportedTourShows: (payload: {
    tourName: string;
    currency: SupportedCurrency;
    stops: ImportedTourStop[];
  }) => number;
  updateImportedTourCurrency: (
    tourName: string,
    currency: SupportedCurrency
  ) => void;
  updateImportedTourName: (
    currentTourName: string,
    nextTourName: string
  ) => string;
  updateImportedShowFolder: (
    id: string,
    patch: Partial<
      Pick<
        ImportedShowFolder,
        | "capacity"
        | "ticketPrice"
        | "roomHire"
        | "soundEngineerId"
        | "soundEngineerCost"
        | "localSupportActs"
        | "localBandCount"
        | "localBandFeePerBand"
        | "validated"
        | "status"
        | "notes"
      >
    >
  ) => void;
  deleteImportedShowFolder: (id: string) => void;
  hideStandaloneShow: (id: string) => void;
  loadDemoTeamRoster: () => void;
  addTeamMember: (payload: Omit<EditableTeamMember, "id" | "initials">) => void;
  updateTeamMember: (
    id: string,
    patch: Partial<Omit<EditableTeamMember, "id" | "initials">>
  ) => void;
  deleteTeamMember: (id: string) => void;
  addCrmContact: (payload: Omit<EditableCrmContact, "id">) => void;
  updateCrmContact: (
    id: string,
    patch: Partial<Omit<EditableCrmContact, "id">>
  ) => void;
  deleteCrmContact: (id: string) => void;
  addVehicleCatalogItem: (payload: Omit<VehicleCatalogItem, "id">) => void;
  updateVehicleCatalogItem: (
    id: string,
    patch: Partial<Omit<VehicleCatalogItem, "id">>
  ) => void;
  deleteVehicleCatalogItem: (id: string) => void;
  addMerchProduct: (payload: {
    name: string;
    sku: string;
    category: string;
    supplier: string;
    location: string;
    initialStock: number;
    stock: number;
    purchasePrice: number;
    salePrice: number;
    reorderPoint: number;
  }) => void;
  updateMerchProduct: (
    id: string,
    patch: Partial<
      Pick<
        EditableMerchProduct,
        | "name"
        | "sku"
        | "category"
        | "supplier"
        | "location"
        | "initialStock"
        | "stock"
        | "purchasePrice"
        | "salePrice"
        | "reorderPoint"
      >
    >
  ) => void;
  deleteMerchProduct: (id: string) => void;
  addUploadedDocuments: (
    entries: {
      id: string;
      name: string;
      category: string;
      tour: string;
    }[]
  ) => void;
};

function toggleStringItem(items: string[], id: string) {
  return items.includes(id)
    ? items.filter((item) => item !== id)
    : [...items, id];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildImportKey(
  tourName: string,
  stop: Pick<ImportedTourStop, "date" | "venue" | "city">
) {
  return [
    slugify(tourName),
    slugify(stop.date),
    slugify(stop.venue),
    slugify(stop.city)
  ]
    .filter(Boolean)
    .join("-");
}

function getUniqueTourName(
  existingTourNames: string[],
  requestedName: string,
  currentTourName?: string
) {
  const normalizedRequestedName = requestedName.trim() || "Imported tour";
  const blockedNames = new Set(
    existingTourNames.filter((name) => name !== currentTourName)
  );

  if (!blockedNames.has(normalizedRequestedName)) {
    return normalizedRequestedName;
  }

  let suffix = 2;
  let candidate = `${normalizedRequestedName} ${suffix}`;

  while (blockedNames.has(candidate)) {
    suffix += 1;
    candidate = `${normalizedRequestedName} ${suffix}`;
  }

  return candidate;
}

function normalizeImportedLocalAct(
  act: Partial<ImportedLocalAct> & Pick<ImportedLocalAct, "id">
): ImportedLocalAct {
  return {
    id: act.id,
    name: act.name?.trim() || "Local band",
    role:
      act.role === "opener" || act.role === "support" || act.role === "other"
        ? act.role
        : "other",
    fee: typeof act.fee === "number" ? act.fee : null
  };
}

function buildLegacyLocalSupportActs(folder: Partial<ImportedShowFolder>) {
  const count =
    typeof folder.localBandCount === "number" && folder.localBandCount > 0
      ? Math.floor(folder.localBandCount)
      : 0;
  const fee =
    typeof folder.localBandFeePerBand === "number" ? folder.localBandFeePerBand : null;

  return Array.from({ length: count }, (_, index) =>
    normalizeImportedLocalAct({
      id: `legacy-local-act-${index + 1}`,
      name:
        index === 0
          ? "Opener"
          : index === 1
            ? "Support"
            : `Local band ${index + 1}`,
      role: index === 0 ? "opener" : index === 1 ? "support" : "other",
      fee
    })
  );
}

function normalizeImportedShowFolder(
  folder: Partial<ImportedShowFolder> & Pick<ImportedShowFolder, "id">
): ImportedShowFolder {
  const normalizedLocalSupportActs =
    folder.localSupportActs?.length
      ? folder.localSupportActs.map((act) => normalizeImportedLocalAct(act))
      : buildLegacyLocalSupportActs(folder);
  const localBandCount = normalizedLocalSupportActs.length;
  const localBandFeePerBand = localBandCount
    ? normalizedLocalSupportActs.reduce((sum, act) => sum + (act.fee ?? 0), 0) /
      localBandCount
    : null;

  return {
    id: folder.id,
    importKey: folder.importKey ?? folder.id,
    tourName: folder.tourName ?? "Imported tour",
    folderName: folder.folderName ?? folder.venue ?? "Imported show",
    date: folder.date ?? "",
    venue: folder.venue ?? folder.folderName ?? "Imported show",
    city: folder.city ?? "",
    country: folder.country ?? "",
    address: folder.address ?? "",
    tourCurrency: normalizeCurrency(folder.tourCurrency),
    capacity: typeof folder.capacity === "number" ? Math.floor(folder.capacity) : null,
    ticketPrice: typeof folder.ticketPrice === "number" ? folder.ticketPrice : null,
    roomHire: typeof folder.roomHire === "number" ? folder.roomHire : null,
    soundEngineerId: folder.soundEngineerId ?? null,
    soundEngineerCost:
      typeof folder.soundEngineerCost === "number" ? folder.soundEngineerCost : null,
    localSupportActs: normalizedLocalSupportActs,
    localBandCount,
    localBandFeePerBand,
    validated: folder.validated ?? false,
    status: folder.status ?? "pending",
    notes: folder.notes ?? "",
    importOrder: folder.importOrder ?? 0,
    createdAt: folder.createdAt ?? new Date().toISOString(),
    updatedAt: folder.updatedAt ?? new Date().toISOString()
  };
}

function normalizeEditableMerchProduct(
  product: Partial<EditableMerchProduct> & Pick<EditableMerchProduct, "id">
): EditableMerchProduct {
  const initialStock =
    typeof product.initialStock === "number" && product.initialStock >= 0
      ? Math.floor(product.initialStock)
      : 0;
  const stock =
    typeof product.stock === "number" && product.stock >= 0
      ? Math.floor(product.stock)
      : 0;
  const sold = Math.max(initialStock - stock, 0);
  const purchasePrice =
    typeof product.purchasePrice === "number" && product.purchasePrice >= 0
      ? product.purchasePrice
      : 0;
  const salePrice =
    typeof product.salePrice === "number" && product.salePrice >= 0
      ? product.salePrice
      : 0;
  const reorderPoint =
    typeof product.reorderPoint === "number" && product.reorderPoint >= 0
      ? Math.floor(product.reorderPoint)
      : 0;

  return {
    id: product.id,
    sku: product.sku ?? "MERCH-SKU",
    name: product.name ?? "New merch item",
    category: product.category ?? "Accessory",
    supplier: product.supplier ?? "Manual entry",
    variants: product.variants?.length ? product.variants : ["Standard"],
    sizes: product.sizes?.length ? product.sizes : ["N/A"],
    sizeBreakdown:
      product.sizeBreakdown?.length
        ? product.sizeBreakdown.map((entry) => ({
            size: entry.size,
            remaining:
              typeof entry.remaining === "number" && entry.remaining >= 0
                ? Math.floor(entry.remaining)
                : 0
          }))
        : [{ size: "N/A", remaining: stock }],
    initialStock,
    stock,
    sold,
    purchasePrice,
    salePrice,
    revenue: sold * salePrice,
    reorderPoint,
    alert: stock <= reorderPoint ? "Manual stock watch" : null,
    location: product.location ?? "Merch case",
    lastRestockDate: product.lastRestockDate ?? new Date().toISOString().slice(0, 10),
    sumupCatalogName: product.sumupCatalogName ?? "Pending SumUp sync"
  };
}

function normalizeEditableCrmContact(
  contact: Partial<EditableCrmContact> & Pick<EditableCrmContact, "id">
): EditableCrmContact {
  return {
    id: contact.id,
    company: contact.company?.trim() || "New contact",
    kind:
      contact.kind === "venue" ||
      contact.kind === "promoter" ||
      contact.kind === "festival" ||
      contact.kind === "booking agent"
        ? contact.kind
        : "venue",
    email: contact.email?.trim() || "",
    phone: contact.phone?.trim() || "",
    instagram: contact.instagram?.trim() || "",
    capacity:
      typeof contact.capacity === "number" && contact.capacity >= 0
        ? Math.floor(contact.capacity)
        : 0,
    city: contact.city?.trim() || "",
    country: contact.country?.trim() || "",
    dealHistory: contact.dealHistory?.trim() || "",
    previousShows: contact.previousShows?.trim() || "",
    notes: contact.notes?.trim() || "",
    status:
      contact.status === "not contacted" ||
      contact.status === "contacted" ||
      contact.status === "replied" ||
      contact.status === "negotiating" ||
      contact.status === "confirmed" ||
      contact.status === "rejected"
        ? contact.status
        : "not contacted",
    lastContact: contact.lastContact?.trim() || new Date().toISOString().slice(0, 10),
    tags: contact.tags?.filter(Boolean) ?? [],
    roomHire: typeof contact.roomHire === "number" ? contact.roomHire : null
  };
}

function normalizeVehicleCatalogItem(
  item: Partial<VehicleCatalogItem> & Pick<VehicleCatalogItem, "id">
): VehicleCatalogItem {
  const type =
    item.type === "van" || item.type === "bus" || item.type === "driver"
      ? item.type
      : "van";

  return {
    id: item.id,
    name: item.name?.trim() || "New vehicle",
    type,
    city: item.city?.trim() || "",
    country: item.country?.trim() || "",
    contact: item.contact?.trim() || "",
    website: item.website?.trim() || "",
    estimatedDailyPrice:
      typeof item.estimatedDailyPrice === "number" && item.estimatedDailyPrice >= 0
        ? item.estimatedDailyPrice
        : 0,
    fleetSize:
      typeof item.fleetSize === "number" && item.fleetSize >= 0
        ? Math.floor(item.fleetSize)
        : 1,
    seats:
      type === "van" && typeof item.seats === "number" && item.seats >= 0
        ? Math.floor(item.seats)
        : null,
    bunks:
      type === "bus" && typeof item.bunks === "number" && item.bunks >= 0
        ? Math.floor(item.bunks)
        : null,
    merchCapacity: item.merchCapacity?.trim() || "",
    notes: item.notes?.trim() || "",
    tags: item.tags?.filter(Boolean) ?? [],
    vehiclePhotos: item.vehiclePhotos?.filter(Boolean) ?? []
  };
}

function buildInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "TM";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function normalizeEditableTeamMember(
  member: Partial<EditableTeamMember> & Pick<EditableTeamMember, "id">
): EditableTeamMember {
  const normalizedName = member.name?.trim() || "New team member";

  return {
    id: member.id,
    name: normalizedName,
    role: member.role?.trim() || "Crew",
    workspaceRole:
      member.workspaceRole === "owner" ||
      member.workspaceRole === "admin" ||
      member.workspaceRole === "member" ||
      member.workspaceRole === "viewer"
        ? member.workspaceRole
        : "member",
    location: member.location?.trim() || "",
    focus: member.focus?.trim() || "",
    initials: member.initials?.trim() || buildInitials(normalizedName)
  };
}

function buildDefaultTeamRoster() {
  return defaultTeamMembers.map((member) => normalizeEditableTeamMember(member));
}

function buildDefaultVehicleCatalog() {
  return defaultTourProviders.map((provider) =>
    normalizeVehicleCatalogItem({
      id: provider.id,
      name: provider.name,
      type: provider.sleepingCapacity > 0 ? "bus" : "van",
      city: provider.city,
      country: provider.country,
      contact: provider.contact,
      website: provider.website,
      estimatedDailyPrice: provider.estimatedDailyPrice,
      fleetSize: provider.fleetSize,
      seats: provider.sleepingCapacity > 0 ? null : provider.passengerCapacity,
      bunks: provider.sleepingCapacity > 0 ? provider.sleepingCapacity : null,
      merchCapacity: provider.merchCapacity,
      notes: provider.notes,
      tags: provider.tags,
      vehiclePhotos: []
    })
  );
}

export const useBandosUIStore = create<BandosUIState>()(
  persist(
    (set) => ({
      commandPaletteOpen: false,
      favoriteCrmIds: [],
      favoriteProviderIds: [],
      crmView: "table",
      taskView: "list",
      importedShowFolders: [],
      hiddenStandaloneShowIds: [],
      crmCatalog: defaultCrmContacts.map((contact) =>
        normalizeEditableCrmContact(contact)
      ),
      teamRoster: buildDefaultTeamRoster(),
      vehicleCatalog: buildDefaultVehicleCatalog(),
      merchCatalog: defaultMerchProducts.map((product) =>
        normalizeEditableMerchProduct(product)
      ),
      uploadedDocuments: [],
      toggleCommandPalette: (open) =>
        set((state) => ({
          commandPaletteOpen:
            typeof open === "boolean" ? open : !state.commandPaletteOpen
        })),
      toggleCrmFavorite: (id) =>
        set((state) => ({
          favoriteCrmIds: toggleStringItem(state.favoriteCrmIds, id)
        })),
      toggleProviderFavorite: (id) =>
        set((state) => ({
          favoriteProviderIds: toggleStringItem(state.favoriteProviderIds, id)
        })),
      setCrmView: (view) => set({ crmView: view }),
      setTaskView: (view) => set({ taskView: view }),
      upsertImportedTourShows: ({ tourName, currency, stops }) => {
        let createdCount = 0;

        set((state) => {
          const now = new Date().toISOString();
          const nextFolders = [...state.importedShowFolders];
          const currentTourIndexes = new Map<string, number>();

          nextFolders.forEach((folder, index) => {
            if (folder.tourName === tourName) {
              currentTourIndexes.set(folder.importKey, index);
            }
          });

          const activeKeys = new Set<string>();

          stops.forEach((stop, index) => {
            const importKey = buildImportKey(tourName, stop);
            activeKeys.add(importKey);
            const existingIndex = currentTourIndexes.get(importKey);

            if (typeof existingIndex === "number") {
              const existing = nextFolders[existingIndex];
              nextFolders[existingIndex] = {
                ...existing,
                tourName,
                folderName: stop.venue,
                date: stop.date,
                venue: stop.venue,
                city: stop.city,
                country: stop.country,
                address: stop.address || stop.location,
                tourCurrency: currency,
                importOrder: index,
                updatedAt: now
              };
              return;
            }

            createdCount += 1;
            nextFolders.push({
              id: `imported-show-${importKey}`,
              importKey,
              tourName,
              folderName: stop.venue,
              date: stop.date,
              venue: stop.venue,
              city: stop.city,
              country: stop.country,
              address: stop.address || stop.location,
              tourCurrency: currency,
              capacity: null,
              ticketPrice: null,
              roomHire: null,
              soundEngineerId: null,
              soundEngineerCost: null,
              localSupportActs: [],
              localBandCount: 0,
              localBandFeePerBand: null,
              validated: false,
              status: "pending",
              notes: "",
              importOrder: index,
              createdAt: now,
              updatedAt: now
            });
          });

          const filtered = nextFolders.filter((folder) => {
            if (folder.tourName !== tourName) {
              return true;
            }

            return activeKeys.has(folder.importKey);
          });

          filtered.sort((left, right) => {
            if (left.tourName === right.tourName) {
              return left.importOrder - right.importOrder;
            }

            return right.updatedAt.localeCompare(left.updatedAt);
          });

          return {
            importedShowFolders: filtered
          };
        });

        return createdCount;
      },
      updateImportedTourCurrency: (tourName, currency) =>
        set((state) => ({
          importedShowFolders: state.importedShowFolders.map((folder) =>
            folder.tourName === tourName
              ? {
                  ...folder,
                  tourCurrency: currency,
                  updatedAt: new Date().toISOString()
                }
              : folder
          )
        })),
      updateImportedTourName: (currentTourName, nextTourName) => {
        let resolvedTourName = currentTourName;

        set((state) => {
          resolvedTourName = getUniqueTourName(
            state.importedShowFolders.map((folder) => folder.tourName),
            nextTourName,
            currentTourName
          );

          if (resolvedTourName === currentTourName) {
            return state;
          }

          return {
            importedShowFolders: state.importedShowFolders.map((folder) =>
              folder.tourName === currentTourName
                ? {
                    ...folder,
                    tourName: resolvedTourName,
                    importKey: buildImportKey(resolvedTourName, {
                      date: folder.date,
                      venue: folder.venue,
                      city: folder.city
                    }),
                    updatedAt: new Date().toISOString()
                  }
                : folder
            )
          };
        });

        return resolvedTourName;
      },
      updateImportedShowFolder: (id, patch) =>
        set((state) => ({
          importedShowFolders: state.importedShowFolders.map((folder) =>
            folder.id === id
              ? {
                  ...folder,
                  ...patch,
                  updatedAt: new Date().toISOString()
                }
              : folder
          )
        })),
      deleteImportedShowFolder: (id) =>
        set((state) => ({
          importedShowFolders: state.importedShowFolders.filter(
            (folder) => folder.id !== id
          )
        })),
      hideStandaloneShow: (id) =>
        set((state) => ({
          hiddenStandaloneShowIds: state.hiddenStandaloneShowIds.includes(id)
            ? state.hiddenStandaloneShowIds
            : [...state.hiddenStandaloneShowIds, id]
        })),
      loadDemoTeamRoster: () =>
        set({
          teamRoster: buildDefaultTeamRoster()
        }),
      addTeamMember: (payload) =>
        set((state) => ({
          teamRoster: [
            normalizeEditableTeamMember({
              id: `team-custom-${Date.now()}`,
              ...payload
            }),
            ...state.teamRoster
          ]
        })),
      updateTeamMember: (id, patch) =>
        set((state) => ({
          teamRoster: state.teamRoster.map((member) =>
            member.id === id
              ? normalizeEditableTeamMember({
                  ...member,
                  ...patch
                })
              : member
          )
        })),
      deleteTeamMember: (id) =>
        set((state) => ({
          teamRoster: state.teamRoster.filter((member) => member.id !== id),
          importedShowFolders: state.importedShowFolders.map((folder) =>
            folder.soundEngineerId === id
              ? {
                  ...folder,
                  soundEngineerId: null,
                  updatedAt: new Date().toISOString()
                }
              : folder
          )
        })),
      addCrmContact: (payload) =>
        set((state) => ({
          crmCatalog: [
            normalizeEditableCrmContact({
              id: `crm-custom-${Date.now()}`,
              ...payload
            }),
            ...state.crmCatalog
          ]
        })),
      updateCrmContact: (id, patch) =>
        set((state) => ({
          crmCatalog: state.crmCatalog.map((contact) =>
            contact.id === id
              ? normalizeEditableCrmContact({
                  ...contact,
                  ...patch
                })
              : contact
          )
        })),
      deleteCrmContact: (id) =>
        set((state) => ({
          crmCatalog: state.crmCatalog.filter((contact) => contact.id !== id)
        })),
      addVehicleCatalogItem: (payload) =>
        set((state) => ({
          vehicleCatalog: [
            normalizeVehicleCatalogItem({
              id: `vehicle-custom-${Date.now()}`,
              ...payload
            }),
            ...state.vehicleCatalog
          ]
        })),
      updateVehicleCatalogItem: (id, patch) =>
        set((state) => ({
          vehicleCatalog: state.vehicleCatalog.map((item) =>
            item.id === id
              ? normalizeVehicleCatalogItem({
                  ...item,
                  ...patch
                })
              : item
          )
        })),
      deleteVehicleCatalogItem: (id) =>
        set((state) => ({
          vehicleCatalog: state.vehicleCatalog.filter((item) => item.id !== id)
        })),
      addMerchProduct: (payload) =>
        set((state) => ({
          merchCatalog: [
            normalizeEditableMerchProduct({
              id: `merch-custom-${Date.now()}`,
              name: payload.name,
              sku: payload.sku,
              category: payload.category,
              supplier: payload.supplier,
              location: payload.location,
              initialStock: payload.initialStock,
              stock: payload.stock,
              purchasePrice: payload.purchasePrice,
              salePrice: payload.salePrice,
              reorderPoint: payload.reorderPoint,
              variants: ["Standard"],
              sizes: ["N/A"],
              sizeBreakdown: [{ size: "N/A", remaining: payload.stock }],
              sumupCatalogName: "Pending SumUp sync"
            }),
            ...state.merchCatalog
          ]
        })),
      updateMerchProduct: (id, patch) =>
        set((state) => ({
          merchCatalog: state.merchCatalog.map((product) =>
            product.id === id
              ? normalizeEditableMerchProduct({
                  ...product,
                  ...patch,
                  sizeBreakdown:
                    patch.stock !== undefined && product.sizes.length === 1
                      ? [{ size: product.sizes[0] ?? "N/A", remaining: patch.stock }]
                      : product.sizeBreakdown
                })
              : product
          )
        })),
      deleteMerchProduct: (id) =>
        set((state) => ({
          merchCatalog: state.merchCatalog.filter((product) => product.id !== id)
        })),
      addUploadedDocuments: (entries) =>
        set((state) => ({
          uploadedDocuments: [...entries, ...state.uploadedDocuments]
        }))
    }),
    {
      name: "bandos-ui",
      merge: (persistedState, currentState) => {
        const typedPersisted = persistedState as Partial<BandosUIState> | undefined;

        return {
          ...currentState,
          ...typedPersisted,
          hiddenStandaloneShowIds: typedPersisted?.hiddenStandaloneShowIds ?? [],
          crmCatalog:
            typedPersisted?.crmCatalog?.map((contact) =>
              normalizeEditableCrmContact(contact)
            ) ?? currentState.crmCatalog,
          vehicleCatalog:
            typedPersisted?.vehicleCatalog?.map((item) =>
              normalizeVehicleCatalogItem(item)
            ) ?? currentState.vehicleCatalog,
          merchCatalog:
            typedPersisted?.merchCatalog?.map((product) =>
              normalizeEditableMerchProduct(product)
            ) ??
            currentState.merchCatalog,
          importedShowFolders: (typedPersisted?.importedShowFolders ?? []).map((folder) =>
            normalizeImportedShowFolder(folder)
          )
        };
      }
    }
  )
);
