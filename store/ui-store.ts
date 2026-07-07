"use client";

import { create } from "zustand";

import type { ImportedTourStop } from "@/lib/tours/import-types";
import { normalizeCurrency, type SupportedCurrency } from "@/lib/utils";
import {
  buildImportKey,
  buildInitialWorkspaceData,
  getUniqueTourName,
  normalizeEditableCrmContact,
  normalizeEpkProfile,
  normalizeEditableMerchProduct,
  normalizeMerchDesign,
  normalizeMerchPurchaseOrder,
  normalizeEditableTaskItem,
  normalizeEditableTeamMember,
  normalizeImportedShowFolder,
  normalizeTourVehicleAssignment,
  sortImportedShowFolders,
  normalizeUploadedDocumentEntry,
  normalizeVehicleCatalogItem,
  slugify,
  normalizeWorkspaceData,
  type BandosWorkspaceData,
  type EditableCrmContact,
  type EpkProfile,
  type EditableMerchProduct,
  type MerchDesign,
  type MerchPurchaseOrder,
  type EditableTaskItem,
  type EditableTeamMember,
  type ImportedShowFolder,
  type TourVehicleAssignment,
  type VehicleCatalogItem
} from "@/lib/workspace-data";

export type {
  BandosWorkspaceData,
  EditableCrmContact,
  EpkProfile,
  EditableMerchProduct,
  MerchDesign,
  MerchPurchaseOrder,
  EditableTaskItem,
  EditableTeamMember,
  ImportedLocalAct,
  ImportedShowFolder,
  TourVehicleAssignment,
  UploadedDocumentEntry,
  VehicleCatalogItem
} from "@/lib/workspace-data";

type BandosUIState = BandosWorkspaceData & {
  initializedWorkspaceId: null | string;
  commandPaletteOpen: boolean;
  mobileSidebarOpen: boolean;
  favoriteCrmIds: string[];
  favoriteProviderIds: string[];
  crmView: "table" | "kanban";
  taskView: "list" | "kanban" | "calendar";
  toggleCommandPalette: (open?: boolean) => void;
  toggleMobileSidebar: (open?: boolean) => void;
  toggleCrmFavorite: (id: string) => void;
  toggleProviderFavorite: (id: string) => void;
  setCrmView: (view: "table" | "kanban") => void;
  setTaskView: (view: "list" | "kanban" | "calendar") => void;
  initializeWorkspaceData: (payload: {
    workspaceId: string;
    snapshot: BandosWorkspaceData;
  }) => void;
  hydrateWorkspaceData: (snapshot: Partial<BandosWorkspaceData>) => void;
  getWorkspaceSnapshot: () => BandosWorkspaceData;
  upsertImportedTourShows: (payload: {
    tourName: string;
    currency: SupportedCurrency;
    stops: ImportedTourStop[];
  }) => number;
  addStandaloneShowFolder: (payload: {
    venue: string;
    date: string;
    city: string;
    country: string;
    address: string;
    currency: SupportedCurrency;
  }) => string;
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
        | "date"
        | "folderName"
        | "venue"
        | "city"
        | "country"
        | "address"
        | "ticketPrice"
        | "showFee"
        | "roomHire"
        | "soundEngineerId"
        | "soundEngineerCost"
        | "localSupportActs"
        | "localBandCount"
        | "localBandFeePerBand"
        | "validated"
        | "status"
        | "notes"
        | "runningOrder"
        | "guestlistEntries"
        | "guestlistCapacity"
        | "guestlistCheckInMode"
        | "venueContacts"
        | "dayOfShowInfo"
        | "posterOverride"
        | "daySheetNotes"
        | "merchSetup"
        | "travelInfo"
        | "setlistEntries"
        | "gearChecklistItems"
        | "ticketingEventId"
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
  addCrmContact: (
    payload: Omit<EditableCrmContact, "id">
  ) => EditableCrmContact;
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
  assignVehicleToTour: (payload: {
    tourName: string;
    vehicleId: string;
  }) => void;
  clearTourVehicleAssignment: (tourName: string) => void;
  addMerchProduct: (payload: {
    name: string;
    sku: string;
    category: string;
    productType: EditableMerchProduct["productType"];
    designId: string | null;
    color: string;
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
        | "productType"
        | "designId"
        | "color"
        | "supplier"
        | "location"
        | "initialStock"
        | "stock"
        | "purchasePrice"
        | "salePrice"
        | "reorderPoint"
        | "sumupCatalogName"
        | "sumupSku"
      >
    >
  ) => void;
  deleteMerchProduct: (id: string) => void;
  importMerchProductsFromSumUp: (
    items: Array<{
      name: string;
      quantitySold: number;
      salePrice: number;
      revenue: number;
    }>
  ) => {
    created: number;
    updated: number;
  };
  addMerchDesign: (
    payload: Omit<MerchDesign, "id" | "createdAt" | "updatedAt">
  ) => void;
  updateMerchDesign: (
    id: string,
    patch: Partial<Omit<MerchDesign, "id" | "createdAt">>
  ) => void;
  archiveMerchDesign: (id: string) => void;
  saveMerchPurchaseOrder: (
    payload: Omit<MerchPurchaseOrder, "updatedAt" | "createdAt"> & {
      createdAt?: string;
    }
  ) => void;
  updateMerchPurchaseOrder: (
    id: string,
    patch: Partial<Omit<MerchPurchaseOrder, "id" | "createdAt">>
  ) => void;
  deleteMerchPurchaseOrder: (id: string) => void;
  addUploadedDocuments: (
    entries: Array<
      Partial<BandosUIState["uploadedDocuments"][number]> & {
        id: string;
        name: string;
        category: string;
        tour: string;
      }
    >
  ) => void;
  deleteUploadedDocument: (id: string) => void;
  updateEpkProfile: (patch: Partial<EpkProfile>) => void;
  addWorkspaceTask: (payload: Omit<EditableTaskItem, "id" | "comments" | "attachments"> & {
    comments?: number;
    attachments?: number;
  }) => void;
  updateWorkspaceTask: (
    id: string,
    patch: Partial<Omit<EditableTaskItem, "id">>
  ) => void;
  moveWorkspaceTask: (
    id: string,
    status: EditableTaskItem["status"]
  ) => void;
  deleteWorkspaceTask: (id: string) => void;
};

function toggleStringItem(items: string[], id: string) {
  return items.includes(id)
    ? items.filter((item) => item !== id)
    : [...items, id];
}

function cleanupTourVehicleAssignments(
  assignments: TourVehicleAssignment[],
  importedShowFolders: ImportedShowFolder[],
  vehicleCatalog?: VehicleCatalogItem[]
) {
  const activeTours = new Set(
    importedShowFolders
      .filter((folder) => !folder.isStandalone)
      .map((folder) => folder.tourName)
  );
  const activeVehicleIds = vehicleCatalog
    ? new Set(vehicleCatalog.map((vehicle) => vehicle.id))
    : null;

  return assignments.filter((assignment) => {
    if (!activeTours.has(assignment.tourName)) {
      return false;
    }

    if (activeVehicleIds && !activeVehicleIds.has(assignment.vehicleId)) {
      return false;
    }

    return true;
  });
}

function normalizeMerchLookupValue(value: string) {
  return value.trim().toLowerCase();
}

function buildSumUpSku(name: string) {
  const token = slugify(name).replace(/-/g, "_").toUpperCase();
  return `SUMUP-${token || "ITEM"}`.slice(0, 32);
}

function buildClientEntityId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

function guessMerchCategory(name: string): EditableMerchProduct["category"] {
  const normalized = normalizeMerchLookupValue(name);

  if (
    normalized.includes("tee") ||
    normalized.includes("shirt") ||
    normalized.includes("hoodie") ||
    normalized.includes("longsleeve")
  ) {
    return "Apparel";
  }

  if (
    normalized.includes("vinyl") ||
    normalized.includes("cd") ||
    normalized.includes("cassette") ||
    normalized.includes("tape")
  ) {
    return "Physical";
  }

  return "Accessory";
}

function guessMerchProductType(
  name: string
): EditableMerchProduct["productType"] {
  const normalized = normalizeMerchLookupValue(name);

  if (normalized.includes("hoodie")) {
    return "hoodie";
  }

  if (normalized.includes("longsleeve") || normalized.includes("long sleeve")) {
    return "longsleeve";
  }

  if (normalized.includes("tee") || normalized.includes("shirt")) {
    return "t-shirt";
  }

  if (normalized.includes("patch")) {
    return "patch";
  }

  if (normalized.includes("poster")) {
    return "poster";
  }

  if (normalized.includes("vinyl")) {
    return "vinyl";
  }

  if (normalized.includes("cd")) {
    return "cd";
  }

  return "other";
}

function getInitialState() {
  return {
    initializedWorkspaceId: null,
    commandPaletteOpen: false,
    mobileSidebarOpen: false,
    favoriteCrmIds: [],
    favoriteProviderIds: [],
    crmView: "table" as const,
    taskView: "kanban" as const,
    ...buildInitialWorkspaceData()
  };
}

export const getWorkspaceDataSnapshot = (state: BandosUIState) => ({
  importedShowFolders: state.importedShowFolders,
  hiddenStandaloneShowIds: state.hiddenStandaloneShowIds,
  crmCatalog: state.crmCatalog,
  teamRoster: state.teamRoster,
  vehicleCatalog: state.vehicleCatalog,
  tourVehicleAssignments: state.tourVehicleAssignments,
  merchCatalog: state.merchCatalog,
  merchDesigns: state.merchDesigns,
  merchPurchaseOrders: state.merchPurchaseOrders,
  workspaceTasks: state.workspaceTasks,
  uploadedDocuments: state.uploadedDocuments,
  epkProfile: state.epkProfile
});

export const useBandosUIStore = create<BandosUIState>()((set, get) => ({
  ...getInitialState(),
  toggleCommandPalette: (open) =>
    set((state) => ({
      commandPaletteOpen:
        typeof open === "boolean" ? open : !state.commandPaletteOpen
    })),
  toggleMobileSidebar: (open) =>
    set((state) => ({
      mobileSidebarOpen:
        typeof open === "boolean" ? open : !state.mobileSidebarOpen
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
  initializeWorkspaceData: ({ workspaceId, snapshot }) =>
    set((state) => {
      if (state.initializedWorkspaceId === workspaceId) {
        return state;
      }

      return {
        ...state,
        initializedWorkspaceId: workspaceId,
        ...normalizeWorkspaceData(snapshot)
      };
    }),
  hydrateWorkspaceData: (snapshot) =>
    set((state) => ({
      ...state,
      ...normalizeWorkspaceData(snapshot)
    })),
  getWorkspaceSnapshot: () => getWorkspaceDataSnapshot(get()),
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
          isStandalone: false,
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
          showFee: null,
          roomHire: null,
          soundEngineerId: null,
          soundEngineerCost: null,
          localSupportActs: [],
          localBandCount: 0,
          localBandFeePerBand: null,
          validated: false,
          status: "pending",
          notes: "",
          runningOrder: [],
          guestlistEntries: [],
          guestlistCapacity: null,
          guestlistCheckInMode: false,
          venueContacts: [],
          dayOfShowInfo: {
            doorsTime: "",
            settlementTime: "",
            wifi: "",
            parkingInfo: "",
            hospitalityInfo: "",
            dressingRoomInfo: "",
            notes: ""
          },
          posterOverride: null,
          daySheetNotes: "",
          merchSetup: {
            sellerName: "",
            tableLocation: "",
            cutPercent: null,
            powerRequired: false,
            stockNotes: ""
          },
          travelInfo: {
            departureTime: "",
            arrivalTime: "",
            travelNotes: "",
            hotelName: "",
            hotelAddress: "",
            hotelRooms: "",
            hotelCheckIn: "",
            hotelCheckOut: "",
            borderNotes: ""
          },
          setlistEntries: [],
          gearChecklistItems: [],
          ticketingEventId: null,
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

      const nextFoldersSorted = sortImportedShowFolders(filtered);

      return {
        importedShowFolders: nextFoldersSorted,
        tourVehicleAssignments: cleanupTourVehicleAssignments(
          state.tourVehicleAssignments,
          nextFoldersSorted,
          state.vehicleCatalog
        )
      };
    });

    return createdCount;
  },
  addStandaloneShowFolder: (payload) => {
    const folderId = buildClientEntityId("single-show");
    const now = new Date().toISOString();

    set((state) => ({
      importedShowFolders: sortImportedShowFolders([
        normalizeImportedShowFolder({
          id: folderId,
          importKey: folderId,
          isStandalone: true,
          tourName: "Date unique",
          folderName: payload.venue,
          date: payload.date,
          venue: payload.venue,
          city: payload.city,
          country: payload.country,
          address: payload.address,
          tourCurrency: normalizeCurrency(payload.currency),
          capacity: null,
          ticketPrice: null,
          showFee: null,
          roomHire: null,
          soundEngineerId: null,
          soundEngineerCost: null,
          localSupportActs: [],
          localBandCount: 0,
          localBandFeePerBand: null,
          validated: false,
          status: "pending",
          notes: "",
          runningOrder: [],
          guestlistEntries: [],
          guestlistCapacity: null,
          guestlistCheckInMode: false,
          venueContacts: [],
          dayOfShowInfo: {
            doorsTime: "",
            settlementTime: "",
            wifi: "",
            parkingInfo: "",
            hospitalityInfo: "",
            dressingRoomInfo: "",
            notes: ""
          },
          posterOverride: null,
          daySheetNotes: "",
          merchSetup: {
            sellerName: "",
            tableLocation: "",
            cutPercent: null,
            powerRequired: false,
            stockNotes: ""
          },
          travelInfo: {
            departureTime: "",
            arrivalTime: "",
            travelNotes: "",
            hotelName: "",
            hotelAddress: "",
            hotelRooms: "",
            hotelCheckIn: "",
            hotelCheckOut: "",
            borderNotes: ""
          },
          setlistEntries: [],
          gearChecklistItems: [],
          ticketingEventId: null,
          importOrder: 0,
          createdAt: now,
          updatedAt: now
        }),
        ...state.importedShowFolders
      ])
    }));

    return folderId;
  },
  updateImportedTourCurrency: (tourName, currency) =>
    set((state) => ({
      importedShowFolders: sortImportedShowFolders(
        state.importedShowFolders.map((folder) =>
          folder.tourName === tourName && !folder.isStandalone
            ? {
                ...folder,
                tourCurrency: currency,
                updatedAt: new Date().toISOString()
              }
            : folder
        )
      )
    })),
  updateImportedTourName: (currentTourName, nextTourName) => {
    let resolvedTourName = currentTourName;

    set((state) => {
      resolvedTourName = getUniqueTourName(
        state.importedShowFolders
          .filter((folder) => !folder.isStandalone)
          .map((folder) => folder.tourName),
        nextTourName,
        currentTourName
      );

      if (resolvedTourName === currentTourName) {
        return state;
      }

      const renamedAssignments = state.tourVehicleAssignments.map((assignment) =>
        assignment.tourName === currentTourName
          ? normalizeTourVehicleAssignment({
              ...assignment,
              tourName: resolvedTourName,
              updatedAt: new Date().toISOString()
            })
          : assignment
      );

      return {
        importedShowFolders: sortImportedShowFolders(
          state.importedShowFolders.map((folder) =>
            folder.tourName === currentTourName && !folder.isStandalone
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
        ),
        tourVehicleAssignments: cleanupTourVehicleAssignments(
          renamedAssignments,
          state.importedShowFolders.map((folder) =>
            folder.tourName === currentTourName && !folder.isStandalone
              ? normalizeImportedShowFolder({
                  ...folder,
                  tourName: resolvedTourName,
                  importKey: buildImportKey(resolvedTourName, {
                    date: folder.date,
                    venue: folder.venue,
                    city: folder.city
                  }),
                  updatedAt: new Date().toISOString()
                })
              : folder
          )
        )
      };
    });

    return resolvedTourName;
  },
  updateImportedShowFolder: (id, patch) =>
    set((state) => ({
      importedShowFolders: sortImportedShowFolders(
        state.importedShowFolders.map((folder) =>
          folder.id === id
            ? (() => {
                const nextDate =
                  typeof patch.date === "string" ? patch.date.trim() : folder.date;
                const nextVenue =
                  typeof patch.venue === "string"
                    ? patch.venue.trim()
                    : typeof patch.folderName === "string"
                      ? patch.folderName.trim()
                      : folder.venue;
                const nextFolderName =
                  typeof patch.folderName === "string"
                    ? patch.folderName.trim()
                    : typeof patch.venue === "string"
                      ? patch.venue.trim()
                      : folder.folderName;
                const nextCity =
                  typeof patch.city === "string" ? patch.city.trim() : folder.city;

                return normalizeImportedShowFolder({
                  ...folder,
                  ...patch,
                  date: nextDate,
                  venue: nextVenue,
                  folderName: nextFolderName,
                  city: nextCity,
                  country:
                    typeof patch.country === "string"
                      ? patch.country.trim()
                      : folder.country,
                  address:
                    typeof patch.address === "string"
                      ? patch.address.trim()
                      : folder.address,
                  importKey: folder.isStandalone
                    ? folder.importKey
                    : buildImportKey(folder.tourName, {
                        date: nextDate,
                        venue: nextVenue,
                        city: nextCity
                      }),
                  updatedAt: new Date().toISOString()
                });
              })()
            : folder
        )
      )
    })),
  deleteImportedShowFolder: (id) =>
    set((state) => {
      const nextFolders = sortImportedShowFolders(
        state.importedShowFolders.filter((folder) => folder.id !== id)
      );

      return {
        importedShowFolders: nextFolders,
        tourVehicleAssignments: cleanupTourVehicleAssignments(
          state.tourVehicleAssignments,
          nextFolders,
          state.vehicleCatalog
        )
      };
    }),
  hideStandaloneShow: (id) =>
    set((state) => ({
      hiddenStandaloneShowIds: state.hiddenStandaloneShowIds.includes(id)
        ? state.hiddenStandaloneShowIds
        : [...state.hiddenStandaloneShowIds, id]
    })),
  loadDemoTeamRoster: () =>
    set({
      teamRoster: buildInitialWorkspaceData().teamRoster
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
      importedShowFolders: sortImportedShowFolders(
        state.importedShowFolders.map((folder) =>
          folder.soundEngineerId === id
            ? {
                ...folder,
                soundEngineerId: null,
                updatedAt: new Date().toISOString()
              }
            : folder
        )
      )
    })),
  addCrmContact: (payload) => {
    const contact = normalizeEditableCrmContact({
      id: buildClientEntityId("crm-custom"),
      ...payload
    });

    set((state) => ({
      crmCatalog: [contact, ...state.crmCatalog]
    }));

    return contact;
  },
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
      crmCatalog: state.crmCatalog.filter((contact) => contact.id !== id),
      importedShowFolders: sortImportedShowFolders(
        state.importedShowFolders.map((folder) => ({
          ...folder,
          localSupportActs: folder.localSupportActs.map((act) =>
            act.crmContactId === id
              ? {
                  ...act,
                  crmContactId: null
                }
              : act
          )
        }))
      )
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
    set((state) => {
      const nextVehicleCatalog = state.vehicleCatalog.filter((item) => item.id !== id);

      return {
        vehicleCatalog: nextVehicleCatalog,
        tourVehicleAssignments: cleanupTourVehicleAssignments(
          state.tourVehicleAssignments,
          state.importedShowFolders,
          nextVehicleCatalog
        )
      };
    }),
  assignVehicleToTour: ({ tourName, vehicleId }) =>
    set((state) => {
      const now = new Date().toISOString();
      const existingAssignment = state.tourVehicleAssignments.find(
        (assignment) => assignment.tourName === tourName
      );
      const nextAssignments = existingAssignment
        ? state.tourVehicleAssignments.map((assignment) =>
            assignment.tourName === tourName
              ? normalizeTourVehicleAssignment({
                  ...assignment,
                  vehicleId,
                  updatedAt: now
                })
              : assignment
          )
        : [
            ...state.tourVehicleAssignments,
            normalizeTourVehicleAssignment({
              id: buildClientEntityId("tour-vehicle"),
              tourName,
              vehicleId,
              createdAt: now,
              updatedAt: now
            })
          ];

      return {
        tourVehicleAssignments: cleanupTourVehicleAssignments(
          nextAssignments,
          state.importedShowFolders,
          state.vehicleCatalog
        )
      };
    }),
  clearTourVehicleAssignment: (tourName) =>
    set((state) => ({
      tourVehicleAssignments: state.tourVehicleAssignments.filter(
        (assignment) => assignment.tourName !== tourName
      )
    })),
  addMerchProduct: (payload) =>
    set((state) => ({
      merchCatalog: [
        normalizeEditableMerchProduct({
          id: `merch-custom-${Date.now()}`,
          name: payload.name,
          sku: payload.sku,
          category: payload.category,
          productType: payload.productType,
          designId: payload.designId,
          color: payload.color,
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
          sumupCatalogName: "Pending SumUp sync",
          sumupSku: null
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
  importMerchProductsFromSumUp: (items) => {
    let created = 0;
    let updated = 0;

    set((state) => {
      const today = new Date().toISOString().slice(0, 10);
      const nextCatalog = [...state.merchCatalog];

      items.forEach((item, index) => {
        const normalizedName = normalizeMerchLookupValue(item.name);
        const generatedSku = buildSumUpSku(item.name);
        const existingIndex = nextCatalog.findIndex((product) => {
          const normalizedCatalogName = normalizeMerchLookupValue(
            product.sumupCatalogName || ""
          );
          const normalizedProductName = normalizeMerchLookupValue(product.name);
          const normalizedSku = normalizeMerchLookupValue(product.sku);

          return (
            normalizedCatalogName === normalizedName ||
            normalizedProductName === normalizedName ||
            normalizedSku === normalizeMerchLookupValue(generatedSku)
          );
        });

        if (existingIndex >= 0) {
          updated += 1;
          const existing = nextCatalog[existingIndex];
          const targetSold = Math.max(existing.sold, item.quantitySold);
          const targetInitialStock = Math.max(
            existing.initialStock,
            existing.stock + targetSold
          );

          nextCatalog[existingIndex] = normalizeEditableMerchProduct({
            ...existing,
            initialStock: targetInitialStock,
            salePrice: item.salePrice > 0 ? item.salePrice : existing.salePrice,
            supplier:
              existing.supplier?.trim() || "SumUp import",
            sumupCatalogName: item.name
          });
          return;
        }

        created += 1;
        nextCatalog.unshift(
          normalizeEditableMerchProduct({
            id: `sumup-merch-${Date.now()}-${index}`,
            sku: generatedSku,
            name: item.name,
            category: guessMerchCategory(item.name),
            productType: guessMerchProductType(item.name),
            designId: null,
            color: "Black",
            supplier: "SumUp import",
            variants: ["Standard"],
            sizes: ["N/A"],
            sizeBreakdown: [{ size: "N/A", remaining: 0 }],
            initialStock: Math.max(item.quantitySold, 0),
            stock: 0,
            purchasePrice: 0,
            salePrice: Math.max(item.salePrice, 0),
            reorderPoint: 0,
            alert: null,
            location: "Manual stock",
            lastRestockDate: today,
            sumupCatalogName: item.name,
            sumupSku: null
          })
        );
      });

      return {
        merchCatalog: nextCatalog
      };
    });

    return { created, updated };
  },
  addMerchDesign: (payload) =>
    set((state) => ({
      merchDesigns: [
        normalizeMerchDesign({
          id: buildClientEntityId("merch-design"),
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
        ...state.merchDesigns
      ]
    })),
  updateMerchDesign: (id, patch) =>
    set((state) => ({
      merchDesigns: state.merchDesigns.map((design) =>
        design.id === id
          ? normalizeMerchDesign({
              ...design,
              ...patch,
              updatedAt: new Date().toISOString()
            })
          : design
      )
    })),
  archiveMerchDesign: (id) =>
    set((state) => ({
      merchDesigns: state.merchDesigns.map((design) =>
        design.id === id
          ? normalizeMerchDesign({
              ...design,
              status: "archived",
              updatedAt: new Date().toISOString()
            })
          : design
      )
    })),
  saveMerchPurchaseOrder: (payload) =>
    set((state) => {
      const existingIndex = state.merchPurchaseOrders.findIndex(
        (order) => order.id === payload.id
      );
      const normalizedOrder = normalizeMerchPurchaseOrder({
        ...payload,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (existingIndex < 0) {
        return {
          merchPurchaseOrders: [normalizedOrder, ...state.merchPurchaseOrders]
        };
      }

      return {
        merchPurchaseOrders: state.merchPurchaseOrders.map((order) =>
          order.id === payload.id ? normalizedOrder : order
        )
      };
    }),
  updateMerchPurchaseOrder: (id, patch) =>
    set((state) => ({
      merchPurchaseOrders: state.merchPurchaseOrders.map((order) =>
        order.id === id
          ? normalizeMerchPurchaseOrder({
              ...order,
              ...patch,
              updatedAt: new Date().toISOString()
            })
          : order
      )
    })),
  deleteMerchPurchaseOrder: (id) =>
    set((state) => ({
      merchPurchaseOrders: state.merchPurchaseOrders.filter((order) => order.id !== id)
    })),
  addUploadedDocuments: (entries) =>
    set((state) => ({
      uploadedDocuments: [
        ...entries.map((entry) => normalizeUploadedDocumentEntry(entry)),
        ...state.uploadedDocuments
      ]
    })),
  deleteUploadedDocument: (id) =>
    set((state) => ({
      uploadedDocuments: state.uploadedDocuments.filter((entry) => entry.id !== id)
    })),
  updateEpkProfile: (patch) =>
    set((state) => ({
      epkProfile: normalizeEpkProfile({
        ...state.epkProfile,
        ...patch
      })
    })),
  addWorkspaceTask: (payload) =>
    set((state) => ({
      workspaceTasks: [
        normalizeEditableTaskItem({
          id: `task-custom-${Date.now()}`,
          ...payload,
          comments: payload.comments ?? 0,
          attachments: payload.attachments ?? 0
        }),
        ...state.workspaceTasks
      ]
    })),
  updateWorkspaceTask: (id, patch) =>
    set((state) => ({
      workspaceTasks: state.workspaceTasks.map((task) =>
        task.id === id
          ? normalizeEditableTaskItem({
              ...task,
              ...patch
            })
          : task
      )
    })),
  moveWorkspaceTask: (id, status) =>
    set((state) => ({
      workspaceTasks: state.workspaceTasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status
            }
          : task
      )
    })),
  deleteWorkspaceTask: (id) =>
    set((state) => ({
      workspaceTasks: state.workspaceTasks.filter((task) => task.id !== id)
    }))
}));
