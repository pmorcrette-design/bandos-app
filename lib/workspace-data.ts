import {
  crmContacts as defaultCrmContacts,
  merchProducts as defaultMerchProducts,
  tasks as defaultTasks,
  teamMembers as defaultTeamMembers,
  tourProviders as defaultTourProviders,
  type CrmContact,
  type MerchProduct,
  type TaskItem,
  type TeamMember
} from "@/lib/mock-data";
import type { ImportedTourStop } from "@/lib/tours/import-types";
import { normalizeCurrency, type SupportedCurrency } from "@/lib/utils";

export type ImportedLocalAct = {
  id: string;
  name: string;
  role: "opener" | "support" | "other";
  fee: number | null;
  crmContactId: string | null;
};

export type RunningOrderEntryType =
  | "headliner"
  | "support"
  | "local support"
  | "changeover"
  | "doors"
  | "curfew"
  | "load-in"
  | "soundcheck";

export type ShowRunningOrderEntry = {
  id: string;
  artistName: string;
  type: RunningOrderEntryType;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  notes: string;
};

export type ShowGuestlistStatus =
  | "pending"
  | "confirmed"
  | "checked-in"
  | "denied";

export type ShowGuestlistEntry = {
  id: string;
  name: string;
  guestOf: string;
  spots: number;
  status: ShowGuestlistStatus;
  notes: string;
  checkedInAt: string | null;
};

export type ShowVenueContactEntry = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
};

export type ShowDayOfShowInfo = {
  doorsTime: string;
  settlementTime: string;
  wifi: string;
  parkingInfo: string;
  hospitalityInfo: string;
  dressingRoomInfo: string;
  notes: string;
};

export type ShowMerchSetupInfo = {
  sellerName: string;
  tableLocation: string;
  cutPercent: number | null;
  powerRequired: boolean;
  stockNotes: string;
};

export type ShowTravelInfo = {
  departureTime: string;
  arrivalTime: string;
  travelNotes: string;
  hotelName: string;
  hotelAddress: string;
  hotelRooms: string;
  hotelCheckIn: string;
  hotelCheckOut: string;
  borderNotes: string;
};

export type ShowSetlistEntry = {
  id: string;
  songTitle: string;
  tuning: string;
  tempo: string;
  clickTrack: boolean;
  durationMinutes: number | null;
  transitionNotes: string;
  notes: string;
  isEncore: boolean;
};

export type ShowGearChecklistStatus =
  | "pending"
  | "loaded"
  | "missing"
  | "damaged";

export type ShowGearChecklistItem = {
  id: string;
  category: string;
  itemName: string;
  serialNumber: string;
  quantity: number;
  photoUrl: string | null;
  qrLabel: string;
  status: ShowGearChecklistStatus;
  notes: string;
};

export type ImportedShowFolder = {
  id: string;
  importKey: string;
  isStandalone: boolean;
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
  showFee: number | null;
  roomHire: number | null;
  soundEngineerId: string | null;
  soundEngineerCost: number | null;
  localSupportActs: ImportedLocalAct[];
  localBandCount: number;
  localBandFeePerBand: number | null;
  validated: boolean;
  status: "pending" | "booked" | "cancelled" | "local support needed";
  notes: string;
  runningOrder: ShowRunningOrderEntry[];
  guestlistEntries: ShowGuestlistEntry[];
  guestlistCapacity: number | null;
  guestlistCheckInMode: boolean;
  venueContacts: ShowVenueContactEntry[];
  dayOfShowInfo: ShowDayOfShowInfo;
  posterOverride: string | null;
  daySheetNotes: string;
  merchSetup: ShowMerchSetupInfo;
  travelInfo: ShowTravelInfo;
  setlistEntries: ShowSetlistEntry[];
  gearChecklistItems: ShowGearChecklistItem[];
  ticketingEventId: string | null;
  importOrder: number;
  createdAt: string;
  updatedAt: string;
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

export type TourVehicleAssignment = {
  id: string;
  tourName: string;
  vehicleId: string;
  createdAt: string;
  updatedAt: string;
};

export type EditableMerchProduct = MerchProduct;
export type EditableTeamMember = TeamMember;
export type EditableTaskItem = TaskItem;

export type UploadedDocumentEntry = {
  id: string;
  name: string;
  category: string;
  tour: string;
  show: string;
  showId: string | null;
  updatedAt: string;
  owner: string;
  previewUrl: string | null;
  mimeType: string | null;
  subject: string;
};

export type EpkMemberEntry = {
  id: string;
  name: string;
  role: string;
};

export type EpkReleaseEntry = {
  id: string;
  year: string;
  title: string;
  format: string;
};

export type EpkPressQuoteEntry = {
  id: string;
  source: string;
  quote: string;
};

export type EpkProfile = {
  bandName: string;
  genre: string;
  origin: string;
  foundedYear: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  instagramUrl: string;
  facebookUrl: string;
  spotifyUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  instagramFollowers: number | null;
  facebookFollowers: number | null;
  streamCount: number | null;
  youtubeViews: number | null;
  spotifyMonthlyListeners: number | null;
  bio: string;
  supportTitle: string;
  supportSubtitle: string;
  heroImageUrl: string | null;
  liveImageUrl: string | null;
  detailImageUrl: string | null;
  closingImageUrl: string | null;
  supportImageUrl: string | null;
  logoUrl: string | null;
  members: EpkMemberEntry[];
  sharedStageWith: string[];
  releases: EpkReleaseEntry[];
  pressQuotes: EpkPressQuoteEntry[];
  assetList: string[];
};

export type BandosWorkspaceData = {
  importedShowFolders: ImportedShowFolder[];
  hiddenStandaloneShowIds: string[];
  crmCatalog: EditableCrmContact[];
  teamRoster: EditableTeamMember[];
  vehicleCatalog: VehicleCatalogItem[];
  tourVehicleAssignments: TourVehicleAssignment[];
  merchCatalog: EditableMerchProduct[];
  workspaceTasks: EditableTaskItem[];
  uploadedDocuments: UploadedDocumentEntry[];
  epkProfile: EpkProfile;
};

export type BandosWorkspaceDataRecord = {
  workspaceId: string;
  seeded: boolean;
  updatedAt: string;
  snapshot: BandosWorkspaceData;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildImportKey(
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

function parseImportedShowFolderDateValue(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const timestamp = Date.parse(normalizedValue);

  if (!Number.isNaN(timestamp)) {
    return timestamp;
  }

  const dayFirstMatch = normalizedValue.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/
  );

  if (!dayFirstMatch) {
    return null;
  }

  const [, dayToken, monthToken, yearToken] = dayFirstMatch;
  const day = Number(dayToken);
  const monthIndex = Number(monthToken) - 1;
  const year = Number(yearToken);
  const parsed = Date.UTC(year, monthIndex, day);

  return Number.isNaN(parsed) ? null : parsed;
}

function compareImportedShowFolderDateValues(left: string, right: string) {
  const leftTimestamp = parseImportedShowFolderDateValue(left);
  const rightTimestamp = parseImportedShowFolderDateValue(right);

  if (leftTimestamp !== null && rightTimestamp !== null) {
    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp - rightTimestamp;
    }

    return 0;
  }

  if (leftTimestamp !== null) {
    return -1;
  }

  if (rightTimestamp !== null) {
    return 1;
  }

  return left.trim().localeCompare(right.trim());
}

export function sortImportedShowFolders(folders: ImportedShowFolder[]) {
  return [...folders].sort((left, right) => {
    if (left.isStandalone !== right.isStandalone) {
      return left.isStandalone ? 1 : -1;
    }

    const dateComparison = compareImportedShowFolderDateValues(left.date, right.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    if (!left.isStandalone && !right.isStandalone && left.tourName !== right.tourName) {
      return left.tourName.localeCompare(right.tourName);
    }

    if (left.importOrder !== right.importOrder) {
      return left.importOrder - right.importOrder;
    }

    return left.folderName.localeCompare(right.folderName);
  });
}

export function getUniqueTourName(
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

export function normalizeImportedLocalAct(
  act: Partial<ImportedLocalAct> & Pick<ImportedLocalAct, "id">
): ImportedLocalAct {
  return {
    id: act.id,
    name: act.name?.trim() || "Local band",
    role:
      act.role === "opener" || act.role === "support" || act.role === "other"
        ? act.role
        : "other",
    fee: typeof act.fee === "number" ? act.fee : null,
    crmContactId: act.crmContactId?.trim() || null
  };
}

function normalizeRunningOrderType(value?: string | null): RunningOrderEntryType {
  switch (value) {
    case "headliner":
    case "support":
    case "local support":
    case "changeover":
    case "doors":
    case "curfew":
    case "load-in":
    case "soundcheck":
      return value;
    default:
      return "support";
  }
}

function calculateDurationMinutes(startTime: string, endTime: string) {
  const startMatch = /^(\d{2}):(\d{2})$/.exec(startTime.trim());
  const endMatch = /^(\d{2}):(\d{2})$/.exec(endTime.trim());

  if (!startMatch || !endMatch) {
    return null;
  }

  const startTotal = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endTotal = Number(endMatch[1]) * 60 + Number(endMatch[2]);

  if (endTotal < startTotal) {
    return null;
  }

  return endTotal - startTotal;
}

export function normalizeShowRunningOrderEntry(
  entry: Partial<ShowRunningOrderEntry> & Pick<ShowRunningOrderEntry, "id">
): ShowRunningOrderEntry {
  const startTime = entry.startTime?.trim() || "";
  const endTime = entry.endTime?.trim() || "";

  return {
    id: entry.id,
    artistName: entry.artistName?.trim() || "",
    type: normalizeRunningOrderType(entry.type),
    startTime,
    endTime,
    durationMinutes:
      typeof entry.durationMinutes === "number"
        ? Math.max(0, Math.floor(entry.durationMinutes))
        : calculateDurationMinutes(startTime, endTime),
    notes: entry.notes?.trim() || ""
  };
}

function normalizeGuestlistStatus(value?: string | null): ShowGuestlistStatus {
  switch (value) {
    case "pending":
    case "confirmed":
    case "checked-in":
    case "denied":
      return value;
    default:
      return "pending";
  }
}

export function normalizeShowGuestlistEntry(
  entry: Partial<ShowGuestlistEntry> & Pick<ShowGuestlistEntry, "id">
): ShowGuestlistEntry {
  return {
    id: entry.id,
    name: entry.name?.trim() || "",
    guestOf: entry.guestOf?.trim() || "",
    spots:
      typeof entry.spots === "number" && entry.spots > 0
        ? Math.floor(entry.spots)
        : 1,
    status: normalizeGuestlistStatus(entry.status),
    notes: entry.notes?.trim() || "",
    checkedInAt: entry.checkedInAt?.trim() || null
  };
}

export function normalizeShowVenueContactEntry(
  entry: Partial<ShowVenueContactEntry> & Pick<ShowVenueContactEntry, "id">
): ShowVenueContactEntry {
  return {
    id: entry.id,
    name: entry.name?.trim() || "",
    role: entry.role?.trim() || "",
    email: entry.email?.trim() || "",
    phone: entry.phone?.trim() || ""
  };
}

export function normalizeShowDayOfShowInfo(
  info?: Partial<ShowDayOfShowInfo> | null
): ShowDayOfShowInfo {
  return {
    doorsTime: info?.doorsTime?.trim() || "",
    settlementTime: info?.settlementTime?.trim() || "",
    wifi: info?.wifi?.trim() || "",
    parkingInfo: info?.parkingInfo?.trim() || "",
    hospitalityInfo: info?.hospitalityInfo?.trim() || "",
    dressingRoomInfo: info?.dressingRoomInfo?.trim() || "",
    notes: info?.notes?.trim() || ""
  };
}

export function normalizeShowMerchSetupInfo(
  info?: Partial<ShowMerchSetupInfo> | null
): ShowMerchSetupInfo {
  return {
    sellerName: info?.sellerName?.trim() || "",
    tableLocation: info?.tableLocation?.trim() || "",
    cutPercent:
      typeof info?.cutPercent === "number" && info.cutPercent >= 0
        ? info.cutPercent
        : null,
    powerRequired: Boolean(info?.powerRequired),
    stockNotes: info?.stockNotes?.trim() || ""
  };
}

export function normalizeShowTravelInfo(
  info?: Partial<ShowTravelInfo> | null
): ShowTravelInfo {
  return {
    departureTime: info?.departureTime?.trim() || "",
    arrivalTime: info?.arrivalTime?.trim() || "",
    travelNotes: info?.travelNotes?.trim() || "",
    hotelName: info?.hotelName?.trim() || "",
    hotelAddress: info?.hotelAddress?.trim() || "",
    hotelRooms: info?.hotelRooms?.trim() || "",
    hotelCheckIn: info?.hotelCheckIn?.trim() || "",
    hotelCheckOut: info?.hotelCheckOut?.trim() || "",
    borderNotes: info?.borderNotes?.trim() || ""
  };
}

function normalizeGearStatus(value?: string | null): ShowGearChecklistStatus {
  switch (value) {
    case "loaded":
    case "missing":
    case "damaged":
    case "pending":
      return value;
    default:
      return "pending";
  }
}

export function normalizeShowSetlistEntry(
  entry: Partial<ShowSetlistEntry> & Pick<ShowSetlistEntry, "id">
): ShowSetlistEntry {
  return {
    id: entry.id,
    songTitle: entry.songTitle?.trim() || "",
    tuning: entry.tuning?.trim() || "",
    tempo: entry.tempo?.trim() || "",
    clickTrack: Boolean(entry.clickTrack),
    durationMinutes:
      typeof entry.durationMinutes === "number" && entry.durationMinutes >= 0
        ? Math.floor(entry.durationMinutes)
        : null,
    transitionNotes: entry.transitionNotes?.trim() || "",
    notes: entry.notes?.trim() || "",
    isEncore: Boolean(entry.isEncore)
  };
}

export function normalizeShowGearChecklistItem(
  item: Partial<ShowGearChecklistItem> & Pick<ShowGearChecklistItem, "id">
): ShowGearChecklistItem {
  return {
    id: item.id,
    category: item.category?.trim() || "Backline",
    itemName: item.itemName?.trim() || "",
    serialNumber: item.serialNumber?.trim() || "",
    quantity:
      typeof item.quantity === "number" && item.quantity > 0
        ? Math.floor(item.quantity)
        : 1,
    photoUrl: item.photoUrl?.trim() || null,
    qrLabel: item.qrLabel?.trim() || "",
    status: normalizeGearStatus(item.status),
    notes: item.notes?.trim() || ""
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

export function normalizeImportedShowFolder(
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
    isStandalone: Boolean(folder.isStandalone),
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
    showFee: typeof folder.showFee === "number" ? folder.showFee : null,
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
    runningOrder:
      folder.runningOrder?.map((entry) => normalizeShowRunningOrderEntry(entry)) ?? [],
    guestlistEntries:
      folder.guestlistEntries?.map((entry) =>
        normalizeShowGuestlistEntry(entry)
      ) ?? [],
    guestlistCapacity:
      typeof folder.guestlistCapacity === "number" && folder.guestlistCapacity >= 0
        ? Math.floor(folder.guestlistCapacity)
        : null,
    guestlistCheckInMode: Boolean(folder.guestlistCheckInMode),
    venueContacts:
      folder.venueContacts?.map((entry) =>
        normalizeShowVenueContactEntry(entry)
      ) ?? [],
    dayOfShowInfo: normalizeShowDayOfShowInfo(folder.dayOfShowInfo),
    posterOverride: folder.posterOverride?.trim() || null,
    daySheetNotes: folder.daySheetNotes?.trim() || "",
    merchSetup: normalizeShowMerchSetupInfo(folder.merchSetup),
    travelInfo: normalizeShowTravelInfo(folder.travelInfo),
    setlistEntries:
      folder.setlistEntries?.map((entry) => normalizeShowSetlistEntry(entry)) ?? [],
    gearChecklistItems:
      folder.gearChecklistItems?.map((item) =>
        normalizeShowGearChecklistItem(item)
      ) ?? [],
    ticketingEventId: folder.ticketingEventId?.trim() || null,
    importOrder: folder.importOrder ?? 0,
    createdAt: folder.createdAt ?? new Date().toISOString(),
    updatedAt: folder.updatedAt ?? new Date().toISOString()
  };
}

export function normalizeEditableMerchProduct(
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

export function normalizeEditableCrmContact(
  contact: Partial<EditableCrmContact> & Pick<EditableCrmContact, "id">
): EditableCrmContact {
  return {
    id: contact.id,
    company: contact.company?.trim() || "New contact",
      kind:
      contact.kind === "venue" ||
      contact.kind === "promoter" ||
      contact.kind === "festival" ||
      contact.kind === "booking agent" ||
      contact.kind === "band"
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
    roomHire: typeof contact.roomHire === "number" ? contact.roomHire : null,
    defaultFee:
      typeof contact.defaultFee === "number" ? contact.defaultFee : null
  };
}

export function normalizeVehicleCatalogItem(
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

export function normalizeTourVehicleAssignment(
  assignment: Partial<TourVehicleAssignment> & Pick<TourVehicleAssignment, "id">
): TourVehicleAssignment {
  const now = new Date().toISOString();

  return {
    id: assignment.id,
    tourName: assignment.tourName?.trim() || "Imported tour",
    vehicleId: assignment.vehicleId?.trim() || "",
    createdAt: assignment.createdAt ?? now,
    updatedAt: assignment.updatedAt ?? now
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

export function normalizeEditableTeamMember(
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

export function normalizeEditableTaskItem(
  task: Partial<EditableTaskItem> & Pick<EditableTaskItem, "id">
): EditableTaskItem {
  return {
    id: task.id,
    title: task.title?.trim() || "New task",
    assignee: task.assignee?.trim() || "",
    deadline: task.deadline?.trim() || "",
    priority:
      task.priority === "low" ||
      task.priority === "medium" ||
      task.priority === "high" ||
      task.priority === "critical"
        ? task.priority
        : "medium",
    status:
      task.status === "todo" ||
      task.status === "in progress" ||
      task.status === "waiting" ||
      task.status === "done"
        ? task.status
        : "todo",
    comments:
      typeof task.comments === "number" && task.comments >= 0
        ? Math.floor(task.comments)
        : 0,
    attachments:
      typeof task.attachments === "number" && task.attachments >= 0
        ? Math.floor(task.attachments)
        : 0
  };
}

export function normalizeUploadedDocumentEntry(
  entry: Partial<UploadedDocumentEntry> & Pick<UploadedDocumentEntry, "id">
): UploadedDocumentEntry {
  return {
    id: entry.id,
    name: entry.name?.trim() || "Uploaded file",
    category: entry.category?.trim() || "Uploaded",
    tour: entry.tour?.trim() || "-",
    show: entry.show?.trim() || "-",
    showId: entry.showId?.trim() || null,
    updatedAt: entry.updatedAt?.trim() || new Date().toISOString().slice(0, 10),
    owner: entry.owner?.trim() || "Current user",
    previewUrl: entry.previewUrl?.trim() || null,
    mimeType: entry.mimeType?.trim() || null,
    subject: entry.subject?.trim() || ""
  };
}

export function normalizeEpkMemberEntry(
  entry: Partial<EpkMemberEntry> & Pick<EpkMemberEntry, "id">
): EpkMemberEntry {
  return {
    id: entry.id,
    name: entry.name?.trim() || "",
    role: entry.role?.trim() || ""
  };
}

export function normalizeEpkReleaseEntry(
  entry: Partial<EpkReleaseEntry> & Pick<EpkReleaseEntry, "id">
): EpkReleaseEntry {
  return {
    id: entry.id,
    year: entry.year?.trim() || "",
    title: entry.title?.trim() || "",
    format: entry.format?.trim() || ""
  };
}

export function normalizeEpkPressQuoteEntry(
  entry: Partial<EpkPressQuoteEntry> & Pick<EpkPressQuoteEntry, "id">
): EpkPressQuoteEntry {
  return {
    id: entry.id,
    source: entry.source?.trim() || "",
    quote: entry.quote?.trim() || ""
  };
}

function normalizeNullablePositiveInteger(value?: number | null) {
  return typeof value === "number" && value >= 0 ? Math.floor(value) : null;
}

export function buildEmptyEpkProfile(): EpkProfile {
  return {
    bandName: "",
    genre: "",
    origin: "",
    foundedYear: "",
    contactPhone: "",
    contactEmail: "",
    website: "",
    instagramUrl: "",
    facebookUrl: "",
    spotifyUrl: "",
    youtubeUrl: "",
    tiktokUrl: "",
    instagramFollowers: null,
    facebookFollowers: null,
    streamCount: null,
    youtubeViews: null,
    spotifyMonthlyListeners: null,
    bio: "",
    supportTitle: "",
    supportSubtitle: "",
    heroImageUrl: null,
    liveImageUrl: null,
    detailImageUrl: null,
    closingImageUrl: null,
    supportImageUrl: null,
    logoUrl: null,
    members: [],
    sharedStageWith: [],
    releases: [],
    pressQuotes: [],
    assetList: []
  };
}

export function normalizeEpkProfile(profile?: Partial<EpkProfile> | null): EpkProfile {
  const empty = buildEmptyEpkProfile();

  return {
    bandName: profile?.bandName?.trim() || empty.bandName,
    genre: profile?.genre?.trim() || empty.genre,
    origin: profile?.origin?.trim() || empty.origin,
    foundedYear: profile?.foundedYear?.trim() || empty.foundedYear,
    contactPhone: profile?.contactPhone?.trim() || empty.contactPhone,
    contactEmail: profile?.contactEmail?.trim() || empty.contactEmail,
    website: profile?.website?.trim() || empty.website,
    instagramUrl: profile?.instagramUrl?.trim() || empty.instagramUrl,
    facebookUrl: profile?.facebookUrl?.trim() || empty.facebookUrl,
    spotifyUrl: profile?.spotifyUrl?.trim() || empty.spotifyUrl,
    youtubeUrl: profile?.youtubeUrl?.trim() || empty.youtubeUrl,
    tiktokUrl: profile?.tiktokUrl?.trim() || empty.tiktokUrl,
    instagramFollowers: normalizeNullablePositiveInteger(profile?.instagramFollowers),
    facebookFollowers: normalizeNullablePositiveInteger(profile?.facebookFollowers),
    streamCount: normalizeNullablePositiveInteger(profile?.streamCount),
    youtubeViews: normalizeNullablePositiveInteger(profile?.youtubeViews),
    spotifyMonthlyListeners: normalizeNullablePositiveInteger(
      profile?.spotifyMonthlyListeners
    ),
    bio: profile?.bio?.trim() || empty.bio,
    supportTitle: profile?.supportTitle?.trim() || empty.supportTitle,
    supportSubtitle: profile?.supportSubtitle?.trim() || empty.supportSubtitle,
    heroImageUrl: profile?.heroImageUrl?.trim() || null,
    liveImageUrl: profile?.liveImageUrl?.trim() || null,
    detailImageUrl: profile?.detailImageUrl?.trim() || null,
    closingImageUrl: profile?.closingImageUrl?.trim() || null,
    supportImageUrl: profile?.supportImageUrl?.trim() || null,
    logoUrl: profile?.logoUrl?.trim() || null,
    members:
      profile?.members?.map((entry) => normalizeEpkMemberEntry(entry)).filter((entry) =>
        [entry.name, entry.role].some(Boolean)
      ) ?? empty.members,
    sharedStageWith:
      profile?.sharedStageWith?.map((entry) => entry.trim()).filter(Boolean) ??
      empty.sharedStageWith,
    releases:
      profile?.releases
        ?.map((entry) => normalizeEpkReleaseEntry(entry))
        .filter((entry) => [entry.year, entry.title, entry.format].some(Boolean)) ??
      empty.releases,
    pressQuotes:
      profile?.pressQuotes
        ?.map((entry) => normalizeEpkPressQuoteEntry(entry))
        .filter((entry) => [entry.source, entry.quote].some(Boolean)) ??
      empty.pressQuotes,
    assetList:
      profile?.assetList?.map((entry) => entry.trim()).filter(Boolean) ?? empty.assetList
  };
}

export function buildDefaultTeamRoster() {
  return defaultTeamMembers.map((member) => normalizeEditableTeamMember(member));
}

export function buildDefaultVehicleCatalog() {
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

export function buildInitialWorkspaceData(): BandosWorkspaceData {
  return {
    importedShowFolders: [],
    hiddenStandaloneShowIds: [],
    crmCatalog: defaultCrmContacts.map((contact) =>
      normalizeEditableCrmContact(contact)
    ),
    teamRoster: buildDefaultTeamRoster(),
    vehicleCatalog: buildDefaultVehicleCatalog(),
    tourVehicleAssignments: [],
    merchCatalog: defaultMerchProducts.map((product) =>
      normalizeEditableMerchProduct(product)
    ),
    workspaceTasks: defaultTasks.map((task) => normalizeEditableTaskItem(task)),
    uploadedDocuments: [],
    epkProfile: buildEmptyEpkProfile()
  };
}

export function buildEmptyWorkspaceData(): BandosWorkspaceData {
  return {
    importedShowFolders: [],
    hiddenStandaloneShowIds: [],
    crmCatalog: [],
    teamRoster: [],
    vehicleCatalog: [],
    tourVehicleAssignments: [],
    merchCatalog: [],
    workspaceTasks: [],
    uploadedDocuments: [],
    epkProfile: buildEmptyEpkProfile()
  };
}

export function normalizeWorkspaceData(
  snapshot?: Partial<BandosWorkspaceData> | null
): BandosWorkspaceData {
  const initial = buildInitialWorkspaceData();

  return {
    importedShowFolders: sortImportedShowFolders(
      (snapshot?.importedShowFolders ?? []).map((folder) =>
        normalizeImportedShowFolder(folder)
      )
    ),
    hiddenStandaloneShowIds: snapshot?.hiddenStandaloneShowIds ?? [],
    crmCatalog:
      snapshot?.crmCatalog?.map((contact) =>
        normalizeEditableCrmContact(contact)
      ) ?? initial.crmCatalog,
    teamRoster:
      snapshot?.teamRoster?.map((member) =>
        normalizeEditableTeamMember(member)
      ) ?? initial.teamRoster,
    vehicleCatalog:
      snapshot?.vehicleCatalog?.map((item) =>
        normalizeVehicleCatalogItem(item)
      ) ?? initial.vehicleCatalog,
    tourVehicleAssignments:
      snapshot?.tourVehicleAssignments?.map((assignment) =>
        normalizeTourVehicleAssignment(assignment)
      ) ?? [],
    merchCatalog:
      snapshot?.merchCatalog?.map((product) =>
        normalizeEditableMerchProduct(product)
      ) ?? initial.merchCatalog,
    workspaceTasks:
      snapshot?.workspaceTasks?.map((task) =>
        normalizeEditableTaskItem(task)
      ) ?? initial.workspaceTasks,
    uploadedDocuments:
      snapshot?.uploadedDocuments?.map((entry) => ({
        ...normalizeUploadedDocumentEntry(entry)
      })) ?? [],
    epkProfile: normalizeEpkProfile(snapshot?.epkProfile)
  };
}

export function extractLegacyPersistedWorkspaceData(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as
      | {
          state?: Partial<BandosWorkspaceData>;
        }
      | Partial<BandosWorkspaceData>;

    const state =
      parsed && typeof parsed === "object" && "state" in parsed
        ? parsed.state
        : parsed;

    return normalizeWorkspaceData(
      (state as Partial<BandosWorkspaceData> | undefined) ?? null
    );
  } catch {
    return null;
  }
}

export function hasCustomWorkspaceData(snapshot: BandosWorkspaceData) {
  return (
    JSON.stringify(normalizeWorkspaceData(snapshot)) !==
    JSON.stringify(buildInitialWorkspaceData())
  );
}
