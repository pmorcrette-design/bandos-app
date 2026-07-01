"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  GripVertical,
  Plus,
  RefreshCcw,
  Ticket,
  Trash2,
  Upload,
  Users
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { PremiumDaySheet } from "@/components/shows/premium-day-sheet";
import { ShowDaySheetPrintShell } from "@/components/shows/show-day-sheet-print-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  t,
  translateShowStatus,
  type Locale
} from "@/lib/i18n";
import {
  getAttendanceProjectionMetrics,
  getGearChecklistSummary,
  getGuestlistUsage,
  getImportedShowManualFeeNet,
  getImportedShowNightCosts,
  getRunningOrderConflicts,
  getSetlistTotalDuration
} from "@/lib/shows";
import type {
  TicketAttendee,
  TicketClass,
  TicketOrder,
  TicketSalesSnapshot,
  TicketingEvent,
  TicketingIntegration,
  TicketingProvider,
  TicketingSyncLog
} from "@/lib/ticketing/types";
import {
  cn,
  convertCurrency,
  formatCurrency,
  normalizeCurrency,
  supportedCurrencyMeta,
  type SupportedCurrency
} from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";
import type {
  ImportedShowFolder,
  ImportedLocalAct,
  ShowGearChecklistItem,
  ShowGearChecklistStatus,
  ShowGuestlistEntry,
  ShowRunningOrderEntry,
  ShowSetlistEntry,
  ShowVenueContactEntry
} from "@/lib/workspace-data";

type ShowWorkspaceViewProps = {
  showFolderId: string;
  currency: SupportedCurrency;
  locale: Locale;
  workspaceName: string;
  workspaceLogo: string;
  canManageTicketing: boolean;
};

type ShowWorkspaceTab =
  | "overview"
  | "running-order"
  | "guestlist"
  | "ticketing"
  | "merch"
  | "travel"
  | "contacts"
  | "day-sheet";

type TicketingWorkspacePayload = {
  integrations: TicketingIntegration[];
  event: TicketingEvent | null;
  ticketClasses: TicketClass[];
  orders: TicketOrder[];
  attendees: TicketAttendee[];
  snapshots: TicketSalesSnapshot[];
  logs: TicketingSyncLog[];
};

type TicketingFormState = {
  provider: TicketingProvider;
  label: string;
  apiKey: string;
  privateToken: string;
  organizerId: string;
  webhookSecret: string;
};

const tabOrder: Array<{ id: ShowWorkspaceTab; labelFr: string; labelEn: string }> = [
  { id: "overview", labelFr: "Overview", labelEn: "Overview" },
  { id: "running-order", labelFr: "Running Order", labelEn: "Running Order" },
  { id: "guestlist", labelFr: "Guestlist", labelEn: "Guestlist" },
  { id: "ticketing", labelFr: "Ticketing", labelEn: "Ticketing" },
  { id: "merch", labelFr: "Merch", labelEn: "Merch" },
  { id: "travel", labelFr: "Travel", labelEn: "Travel" },
  { id: "contacts", labelFr: "Contacts", labelEn: "Contacts" },
  { id: "day-sheet", labelFr: "Day Sheet", labelEn: "Day Sheet" }
];

const runningOrderTypes: Array<ShowRunningOrderEntry["type"]> = [
  "load-in",
  "soundcheck",
  "doors",
  "support",
  "local support",
  "changeover",
  "headliner",
  "curfew"
];

const guestlistStatuses: Array<ShowGuestlistEntry["status"]> = [
  "pending",
  "confirmed",
  "checked-in",
  "denied"
];

const gearChecklistStatuses: Array<ShowGearChecklistStatus> = [
  "pending",
  "loaded",
  "missing",
  "damaged"
];

const gearChecklistCategories = [
  "Drums",
  "Guitars",
  "Bass",
  "Vocals",
  "Playback",
  "Lights",
  "Merch",
  "Cases",
  "Power",
  "Backline"
] as const;

const productionDocumentSlots = [
  {
    category: "Stage Plot",
    subject: "stage-plot",
    accept: ".pdf,image/*",
    multiple: false,
    labelFr: "Uploader stage plot",
    labelEn: "Upload stage plot"
  },
  {
    category: "Input List",
    subject: "input-list",
    accept: ".pdf,image/*",
    multiple: false,
    labelFr: "Uploader input list",
    labelEn: "Upload input list"
  },
  {
    category: "Venue Photo",
    subject: "loading-dock",
    accept: "image/*",
    multiple: true,
    labelFr: "Photos loading dock",
    labelEn: "Loading dock photos"
  },
  {
    category: "Venue Photo",
    subject: "stage",
    accept: "image/*",
    multiple: true,
    labelFr: "Photos scène",
    labelEn: "Stage photos"
  },
  {
    category: "Venue Photo",
    subject: "dressing-room",
    accept: "image/*",
    multiple: true,
    labelFr: "Photos backstage",
    labelEn: "Backstage photos"
  },
  {
    category: "Venue Photo",
    subject: "parking",
    accept: "image/*",
    multiple: true,
    labelFr: "Photos parking",
    labelEn: "Parking photos"
  }
] as const;

function createClientId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

function parseOptionalNumber(value: string) {
  const normalized = value.replace(",", ".").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string) {
  const parsed = parseOptionalNumber(value);

  if (parsed === null) {
    return null;
  }

  return Math.max(0, Math.floor(parsed));
}

async function readFileAsDataUrl(file: File) {
  const baseUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  if (!file.type.startsWith("image/")) {
    return baseUrl;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("image-load-failed"));
    nextImage.src = baseUrl;
  });

  const maxSide = 1800;
  const scale = Math.min(1, maxSide / image.width, maxSide / image.height);

  if (scale >= 1) {
    return baseUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");

  if (!context) {
    return baseUrl;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (file.type === "image/png") {
    return canvas.toDataURL("image/png");
  }

  return canvas.toDataURL("image/jpeg", 0.86);
}

function buildUploadedDocumentId(file: File) {
  return `show-doc-${file.name}-${file.size}-${file.lastModified}-${Date.now()}`;
}

function formatEditableMoney(
  amount: number | null,
  currency: SupportedCurrency
) {
  if (typeof amount !== "number") {
    return "";
  }

  const converted = convertCurrency(amount, "GBP", currency);
  return Number.isInteger(converted)
    ? String(converted)
    : converted.toFixed(2).replace(/\.00$/, "");
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseGuestlistCsv(rawCsv: string) {
  const lines = rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const sampleHeader = lines[0] ?? "";
  const delimiter =
    sampleHeader.split(";").length > sampleHeader.split(",").length ? ";" : ",";
  const header = parseCsvLine(sampleHeader, delimiter).map((value) =>
    value.trim().toLowerCase()
  );
  const bodyLines = lines.slice(1);

  return bodyLines.map((line, index) => {
    const cells = parseCsvLine(line, delimiter);
    const getValue = (keys: string[], fallbackIndex: number) => {
      const headerIndex = header.findIndex((value) => keys.includes(value));
      return headerIndex >= 0 ? cells[headerIndex] ?? "" : cells[fallbackIndex] ?? "";
    };

    const rawStatus = getValue(["status", "statut"], 3).toLowerCase();
    const normalizedStatus = guestlistStatuses.includes(
      rawStatus as ShowGuestlistEntry["status"]
    )
      ? (rawStatus as ShowGuestlistEntry["status"])
      : "pending";

    return {
      id: createClientId(`guest-csv-${index + 1}`),
      name: getValue(["name", "nom"], 0),
      guestOf: getValue(["guest of", "guestof", "invité de", "invite de"], 1),
      spots: Math.max(1, parseOptionalInteger(getValue(["spots", "places"], 2)) ?? 1),
      status: normalizedStatus,
      notes: getValue(["notes", "note"], 4),
      checkedInAt: normalizedStatus === "checked-in" ? new Date().toISOString() : null
    } satisfies ShowGuestlistEntry;
  });
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function buildGuestlistCsv(entries: ShowGuestlistEntry[]) {
  const escapeCell = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;

  return [
    ["name", "guest of", "spots", "status", "notes"].map(escapeCell).join(","),
    ...entries.map((entry) =>
      [
        entry.name,
        entry.guestOf,
        entry.spots,
        entry.status,
        entry.notes
      ]
        .map(escapeCell)
        .join(",")
    )
  ].join("\n");
}

function getGuestlistStatusLabel(locale: Locale, status: ShowGuestlistEntry["status"]) {
  switch (status) {
    case "confirmed":
      return t(locale, "confirmé", "confirmed");
    case "checked-in":
      return t(locale, "check-in", "checked-in");
    case "denied":
      return t(locale, "refusé", "denied");
    default:
      return t(locale, "en attente", "pending");
  }
}

function getRunningOrderTypeLabel(locale: Locale, type: ShowRunningOrderEntry["type"]) {
  const labels: Record<ShowRunningOrderEntry["type"], [string, string]> = {
    headliner: ["headliner", "headliner"],
    support: ["support", "support"],
    "local support": ["support local", "local support"],
    changeover: ["changeover", "changeover"],
    doors: ["doors", "doors"],
    curfew: ["curfew", "curfew"],
    "load-in": ["load-in", "load-in"],
    soundcheck: ["soundcheck", "soundcheck"]
  };

  const [labelFr, labelEn] = labels[type];
  return t(locale, labelFr, labelEn);
}

function getGearChecklistStatusLabel(
  locale: Locale,
  status: ShowGearChecklistStatus
) {
  switch (status) {
    case "loaded":
      return t(locale, "chargé", "loaded");
    case "missing":
      return t(locale, "manquant", "missing");
    case "damaged":
      return t(locale, "endommagé", "damaged");
    default:
      return t(locale, "à charger", "pending");
  }
}

function getProductionDocumentLabel(
  locale: Locale,
  category: string,
  subject: string
) {
  if (category === "Stage Plot") {
    return t(locale, "Stage plot", "Stage plot");
  }

  if (category === "Input List") {
    return t(locale, "Input list", "Input list");
  }

  switch (subject) {
    case "loading-dock":
      return t(locale, "Loading dock", "Loading dock");
    case "stage":
      return t(locale, "Scène", "Stage");
    case "dressing-room":
      return t(locale, "Backstage", "Backstage");
    case "parking":
      return t(locale, "Parking", "Parking");
    default:
      return t(locale, "Photo de salle", "Venue photo");
  }
}

function getShowStatusTone(status: ImportedShowFolder["status"]) {
  if (status === "booked") {
    return "success" as const;
  }

  if (status === "cancelled") {
    return "warning" as const;
  }

  return "accent" as const;
}

function getTicketingSalesSnapshot(
  payload: TicketingWorkspacePayload | null
) {
  if (!payload) {
    return null;
  }

  return payload.snapshots[0] ?? null;
}

function buildTicketingFormDefaults(): TicketingFormState {
  return {
    provider: "ticket-tailor",
    label: "",
    apiKey: "",
    privateToken: "",
    organizerId: "",
    webhookSecret: ""
  };
}

export function ShowWorkspaceView({
  showFolderId,
  currency,
  locale,
  workspaceName,
  workspaceLogo,
  canManageTicketing
}: ShowWorkspaceViewProps) {
  const searchParams = useSearchParams();
  const importedShowFolders = useBandosUIStore((state) => state.importedShowFolders);
  const crmCatalog = useBandosUIStore((state) => state.crmCatalog);
  const merchCatalog = useBandosUIStore((state) => state.merchCatalog);
  const teamRoster = useBandosUIStore((state) => state.teamRoster);
  const uploadedDocuments = useBandosUIStore((state) => state.uploadedDocuments);
  const addCrmContact = useBandosUIStore((state) => state.addCrmContact);
  const addUploadedDocuments = useBandosUIStore((state) => state.addUploadedDocuments);
  const deleteUploadedDocument = useBandosUIStore(
    (state) => state.deleteUploadedDocument
  );
  const updateImportedShowFolder = useBandosUIStore(
    (state) => state.updateImportedShowFolder
  );
  const show = useMemo(
    () => importedShowFolders.find((entry) => entry.id === showFolderId) ?? null,
    [importedShowFolders, showFolderId]
  );
  const [activeTab, setActiveTab] = useState<ShowWorkspaceTab>("overview");
  const [ticketing, setTicketing] = useState<TicketingWorkspacePayload | null>(null);
  const [ticketingLoading, setTicketingLoading] = useState(false);
  const [ticketingError, setTicketingError] = useState<string | null>(null);
  const [ticketingMessage, setTicketingMessage] = useState<string | null>(null);
  const [ticketingForm, setTicketingForm] = useState<TicketingFormState>(
    buildTicketingFormDefaults()
  );
  const [ticketingSaving, setTicketingSaving] = useState(false);
  const [integrationEvents, setIntegrationEvents] = useState<Record<string, Array<{
    id: string;
    title: string;
    startsAt: string | null;
    venueName: string | null;
    venueCity: string | null;
    currency: string;
    capacity: number | null;
    url: string | null;
  }>>>({});
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [selectedExternalEventId, setSelectedExternalEventId] = useState<string>("");
  const [loadingEventsForIntegration, setLoadingEventsForIntegration] = useState<string | null>(
    null
  );
  const [draggedRunningOrderId, setDraggedRunningOrderId] = useState<string | null>(
    null
  );
  const [newLocalBandName, setNewLocalBandName] = useState("");
  const [newLocalBandRole, setNewLocalBandRole] = useState<ImportedLocalAct["role"]>("support");
  const [newLocalBandFee, setNewLocalBandFee] = useState("");
  const [localBandMessage, setLocalBandMessage] = useState<string | null>(null);
  const backTourName = searchParams.get("tour");
  const printMode = searchParams.get("print") === "1";
  const autoprint = searchParams.get("autoprint") === "1";
  const backHref = backTourName
    ? `/app/shows?tour=${encodeURIComponent(backTourName)}`
    : "/app/shows";
  const printHref = `/app/shows/date/${encodeURIComponent(showFolderId)}?${
    backTourName ? `tour=${encodeURIComponent(backTourName)}&` : ""
  }print=1&autoprint=1`;

  const effectiveCurrency = show?.tourCurrency ?? currency;
  const soundEngineers = useMemo(
    () =>
      teamRoster.filter((member) => {
        const normalizedRole = member.role.trim().toLowerCase();
        return (
          normalizedRole.includes("sound engineer") ||
          normalizedRole.includes("foh") ||
          normalizedRole.includes("ingé son") ||
          normalizedRole.includes("inge son")
        );
      }),
    [teamRoster]
  );
  const localBandContacts = useMemo(
    () => crmCatalog.filter((entry) => entry.kind === "band"),
    [crmCatalog]
  );
  const showDocuments = useMemo(() => {
    if (!show) {
      return [];
    }

    const normalizedShowName = show.folderName.trim().toLowerCase();
    const normalizedVenueName = show.venue.trim().toLowerCase();

    return uploadedDocuments.filter((document) => {
      if (document.showId === show.id) {
        return true;
      }

      const normalizedDocumentShow = document.show.trim().toLowerCase();
      return (
        normalizedDocumentShow === normalizedShowName ||
        normalizedDocumentShow === normalizedVenueName
      );
    });
  }, [show, uploadedDocuments]);
  const soundEngineerName = useMemo(() => {
    if (!show?.soundEngineerId) {
      return null;
    }

    return teamRoster.find((member) => member.id === show.soundEngineerId)?.name ?? null;
  }, [show?.soundEngineerId, teamRoster]);
  const stagePlotDocuments = useMemo(
    () => showDocuments.filter((document) => document.category === "Stage Plot"),
    [showDocuments]
  );
  const inputListDocuments = useMemo(
    () => showDocuments.filter((document) => document.category === "Input List"),
    [showDocuments]
  );
  const venuePhotoDocuments = useMemo(
    () => showDocuments.filter((document) => document.category === "Venue Photo"),
    [showDocuments]
  );
  const runningOrderConflicts = useMemo(
    () => (show ? getRunningOrderConflicts(show.runningOrder) : new Set<string>()),
    [show]
  );
  const guestlistUsage = useMemo(
    () =>
      show
        ? getGuestlistUsage(show.guestlistEntries, show.guestlistCapacity)
        : { usedSpots: 0, remainingSpots: null, overCapacity: false },
    [show]
  );
  const nightCosts = show ? getImportedShowNightCosts(show) : 0;
  const manualFeeNet = show ? getImportedShowManualFeeNet(show) : null;
  const setlistTotalDuration = useMemo(
    () => (show ? getSetlistTotalDuration(show.setlistEntries) : 0),
    [show]
  );
  const gearSummary = useMemo(
    () =>
      show
        ? getGearChecklistSummary(show.gearChecklistItems)
        : {
            total: 0,
            loaded: 0,
            missing: 0,
            damaged: 0,
            pending: 0
          },
    [show]
  );
  const occupancyProjection = show
    ? getAttendanceProjectionMetrics({
        capacity: show.capacity,
        ticketPrice: show.ticketPrice,
        fixedCosts: nightCosts
      })
    : null;
  const latestSnapshot = getTicketingSalesSnapshot(ticketing);
  const ticketingSourceCurrency = ticketing?.event
    ? normalizeCurrency(ticketing.event.currency)
    : "GBP";
  const ticketingMetrics = useMemo(() => {
    if (!ticketing?.event && !latestSnapshot) {
      return null;
    }

    const linkedEvent = ticketing?.event ?? null;

    return {
      grossRevenue: latestSnapshot?.grossRevenue ?? linkedEvent?.grossRevenue ?? 0,
      netRevenue: latestSnapshot?.netRevenue ?? linkedEvent?.netRevenue ?? 0,
      fees: latestSnapshot?.fees ?? linkedEvent?.fees ?? 0,
      ticketsSold: latestSnapshot?.ticketsSold ?? linkedEvent?.ticketsSold ?? 0,
      capacitySoldPercentage:
        latestSnapshot?.capacitySoldPercentage ??
        (linkedEvent?.capacity && linkedEvent.capacity > 0
          ? (linkedEvent.ticketsSold / linkedEvent.capacity) * 100
          : null),
      averageTicketPrice:
        latestSnapshot?.averageTicketPrice ?? linkedEvent?.averageTicketPrice ?? null,
      guestlistCount: latestSnapshot?.guestlistCount ?? linkedEvent?.guestlistCount ?? 0,
      refundCount: latestSnapshot?.refundCount ?? linkedEvent?.refundCount ?? 0
    };
  }, [latestSnapshot, ticketing?.event]);
  async function refreshTicketing() {
    setTicketingLoading(true);
    setTicketingError(null);

    try {
      const response = await fetch(`/api/ticketing/shows/${showFolderId}`, {
        method: "GET",
        cache: "no-store"
      });
      const payload = (await response.json().catch(() => null)) as
        | TicketingWorkspacePayload
        | { error?: string }
        | null;

      if (!response.ok || !payload || "error" in payload) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : "Unable to load ticketing data."
        );
      }

      const ticketingPayload = payload as TicketingWorkspacePayload;
      setTicketing(ticketingPayload);
      if (!selectedIntegrationId && ticketingPayload.integrations[0]) {
        setSelectedIntegrationId(ticketingPayload.integrations[0].id);
      }
    } catch (error) {
      setTicketingError(
        error instanceof Error ? error.message : "Unable to load ticketing data."
      );
    } finally {
      setTicketingLoading(false);
    }
  }

  useEffect(() => {
    void refreshTicketing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFolderId]);

  useEffect(() => {
    if (!show) {
      return;
    }

    const nextTicketingEventId = ticketing?.event?.id ?? null;

    if ((show.ticketingEventId ?? null) === nextTicketingEventId) {
      return;
    }

    updateImportedShowFolder(show.id, {
      ticketingEventId: nextTicketingEventId
    });
  }, [show, ticketing?.event?.id, updateImportedShowFolder]);

  useEffect(() => {
    setNewLocalBandName("");
    setNewLocalBandRole("support");
    setNewLocalBandFee("");
    setLocalBandMessage(null);
  }, [showFolderId]);

  function patchShow(
    patch: Partial<
      Pick<
        ImportedShowFolder,
        | "ticketPrice"
        | "showFee"
        | "roomHire"
        | "capacity"
        | "folderName"
        | "venue"
        | "city"
        | "country"
        | "address"
        | "status"
        | "validated"
        | "notes"
        | "soundEngineerId"
        | "soundEngineerCost"
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
        | "localSupportActs"
        | "setlistEntries"
        | "gearChecklistItems"
      >
    >
  ) {
    if (!show) {
      return;
    }

    updateImportedShowFolder(show.id, patch);
  }

  function addRunningOrderRow() {
    if (!show) {
      return;
    }

    patchShow({
      runningOrder: [
        ...show.runningOrder,
        {
          id: createClientId("running-order"),
          artistName: "",
          type: "support",
          startTime: "",
          endTime: "",
          durationMinutes: null,
          notes: ""
        }
      ]
    });
  }

  function updateRunningOrderRow(
    rowId: string,
    patch: Partial<ShowRunningOrderEntry>
  ) {
    if (!show) {
      return;
    }

    patchShow({
      runningOrder: show.runningOrder.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...patch
            }
          : row
      )
    });
  }

  function deleteRunningOrderRow(rowId: string) {
    if (!show) {
      return;
    }

    patchShow({
      runningOrder: show.runningOrder.filter((row) => row.id !== rowId)
    });
  }

  function moveRunningOrderRow(targetId: string) {
    if (!show || !draggedRunningOrderId || draggedRunningOrderId === targetId) {
      return;
    }

    const currentEntries = [...show.runningOrder];
    const draggedIndex = currentEntries.findIndex((row) => row.id === draggedRunningOrderId);
    const targetIndex = currentEntries.findIndex((row) => row.id === targetId);

    if (draggedIndex < 0 || targetIndex < 0) {
      return;
    }

    const [draggedRow] = currentEntries.splice(draggedIndex, 1);
    currentEntries.splice(targetIndex, 0, draggedRow);
    patchShow({ runningOrder: currentEntries });
    setDraggedRunningOrderId(null);
  }

  function addGuestlistEntry() {
    if (!show) {
      return;
    }

    patchShow({
      guestlistEntries: [
        ...show.guestlistEntries,
        {
          id: createClientId("guest"),
          name: "",
          guestOf: "",
          spots: 1,
          status: "pending",
          notes: "",
          checkedInAt: null
        }
      ]
    });
  }

  function updateGuestlistEntry(
    entryId: string,
    patch: Partial<ShowGuestlistEntry>
  ) {
    if (!show) {
      return;
    }

    patchShow({
      guestlistEntries: show.guestlistEntries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              ...patch
            }
          : entry
      )
    });
  }

  function deleteGuestlistEntry(entryId: string) {
    if (!show) {
      return;
    }

    patchShow({
      guestlistEntries: show.guestlistEntries.filter((entry) => entry.id !== entryId)
    });
  }

  function addVenueContact() {
    if (!show) {
      return;
    }

    patchShow({
      venueContacts: [
        ...show.venueContacts,
        {
          id: createClientId("venue-contact"),
          name: "",
          role: "",
          email: "",
          phone: ""
        }
      ]
    });
  }

  function updateVenueContact(
    contactId: string,
    patch: Partial<ShowVenueContactEntry>
  ) {
    if (!show) {
      return;
    }

    patchShow({
      venueContacts: show.venueContacts.map((entry) =>
        entry.id === contactId
          ? {
              ...entry,
              ...patch
            }
          : entry
      )
    });
  }

  function deleteVenueContact(contactId: string) {
    if (!show) {
      return;
    }

    patchShow({
      venueContacts: show.venueContacts.filter((entry) => entry.id !== contactId)
    });
  }

  function addLocalBandFromCrm(contactId: string, role: ImportedLocalAct["role"]) {
    if (!show) {
      return;
    }

    const crmBand = localBandContacts.find((entry) => entry.id === contactId);

    if (!crmBand) {
      return;
    }

    patchShow({
      localSupportActs: [
        ...show.localSupportActs,
        {
          id: createClientId("local-band"),
          name: crmBand.company,
          role,
          fee: crmBand.defaultFee ?? null,
          crmContactId: crmBand.id
        }
      ]
    });
  }

  function createCrmBandFromShow() {
    if (!show) {
      return;
    }

    const trimmedName = newLocalBandName.trim();

    if (!trimmedName) {
      setLocalBandMessage(
        t(
          locale,
          "Entre d'abord le nom du groupe.",
          "Enter the band name first."
        )
      );
      return;
    }

    const existingBand =
      localBandContacts.find(
        (entry) => entry.company.trim().toLowerCase() === trimmedName.toLowerCase()
      ) ?? null;
    const parsedFee = parseOptionalNumber(newLocalBandFee);
    const normalizedFee =
      parsedFee !== null
        ? convertCurrency(parsedFee, effectiveCurrency, "GBP")
        : existingBand?.defaultFee ?? null;
    const crmBand =
      existingBand ??
      addCrmContact({
        company: trimmedName,
        kind: "band",
        email: "",
        phone: "",
        instagram: "",
        capacity: 0,
        city: show.city,
        country: show.country,
        dealHistory: "",
        previousShows: "",
        notes: "",
        status: "confirmed",
        lastContact: new Date().toISOString().slice(0, 10),
        tags: ["local support"],
        roomHire: null,
        defaultFee: normalizedFee
      });

    const alreadyAssigned = show.localSupportActs.some(
      (entry) => entry.crmContactId === crmBand.id
    );

    if (alreadyAssigned) {
      setLocalBandMessage(
        t(
          locale,
          `${crmBand.company} existe déjà dans le CRM et est déjà assigné à cette date.`,
          `${crmBand.company} already exists in the CRM and is already assigned to this show.`
        )
      );
      return;
    }

    patchShow({
      localSupportActs: [
        ...show.localSupportActs,
        {
          id: createClientId("local-band"),
          name: crmBand.company,
          role: newLocalBandRole,
          fee: normalizedFee,
          crmContactId: crmBand.id
        }
      ]
    });

    setNewLocalBandName("");
    setNewLocalBandRole("support");
    setNewLocalBandFee("");
    setLocalBandMessage(
      existingBand
        ? t(
            locale,
            `${crmBand.company} était déjà dans le CRM et a été assigné à cette date.`,
            `${crmBand.company} was already in the CRM and has been assigned to this show.`
          )
        : t(
            locale,
            `${crmBand.company} a été créé dans le CRM puis assigné à cette date.`,
            `${crmBand.company} was created in the CRM and assigned to this show.`
          )
    );
  }

  async function handleGuestlistImport(file: File | null) {
    if (!file || !show) {
      return;
    }

    const rawCsv = await file.text();
    const importedEntries = parseGuestlistCsv(rawCsv);

    if (!importedEntries.length) {
      return;
    }

    patchShow({
      guestlistEntries: [...show.guestlistEntries, ...importedEntries]
    });
  }

  function exportGuestlistCsv() {
    if (!show) {
      return;
    }

    downloadTextFile(
      buildGuestlistCsv(show.guestlistEntries),
      `${show.folderName}-guestlist.csv`,
      "text/csv;charset=utf-8"
    );
  }

  function addSetlistEntry() {
    if (!show) {
      return;
    }

    patchShow({
      setlistEntries: [
        ...show.setlistEntries,
        {
          id: createClientId("setlist"),
          songTitle: "",
          tuning: "",
          tempo: "",
          clickTrack: false,
          durationMinutes: null,
          transitionNotes: "",
          notes: "",
          isEncore: false
        }
      ]
    });
  }

  function updateSetlistEntry(entryId: string, patch: Partial<ShowSetlistEntry>) {
    if (!show) {
      return;
    }

    patchShow({
      setlistEntries: show.setlistEntries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              ...patch
            }
          : entry
      )
    });
  }

  function moveSetlistEntry(entryId: string, direction: "up" | "down") {
    if (!show) {
      return;
    }

    const currentEntries = [...show.setlistEntries];
    const currentIndex = currentEntries.findIndex((entry) => entry.id === entryId);

    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= currentEntries.length) {
      return;
    }

    const [entry] = currentEntries.splice(currentIndex, 1);
    currentEntries.splice(targetIndex, 0, entry);
    patchShow({ setlistEntries: currentEntries });
  }

  function deleteSetlistEntry(entryId: string) {
    if (!show) {
      return;
    }

    patchShow({
      setlistEntries: show.setlistEntries.filter((entry) => entry.id !== entryId)
    });
  }

  function addGearChecklistItem() {
    if (!show) {
      return;
    }

    patchShow({
      gearChecklistItems: [
        ...show.gearChecklistItems,
        {
          id: createClientId("gear"),
          category: "Backline",
          itemName: "",
          serialNumber: "",
          quantity: 1,
          photoUrl: null,
          qrLabel: "",
          status: "pending",
          notes: ""
        }
      ]
    });
  }

  function updateGearChecklistItem(
    itemId: string,
    patch: Partial<ShowGearChecklistItem>
  ) {
    if (!show) {
      return;
    }

    patchShow({
      gearChecklistItems: show.gearChecklistItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch
            }
          : item
      )
    });
  }

  function deleteGearChecklistItem(itemId: string) {
    if (!show) {
      return;
    }

    patchShow({
      gearChecklistItems: show.gearChecklistItems.filter((item) => item.id !== itemId)
    });
  }

  async function handleProductionDocumentUpload(
    slot: (typeof productionDocumentSlots)[number],
    files: FileList | null
  ) {
    if (!show || !files?.length) {
      return;
    }

    const nextEntries = await Promise.all(
      Array.from(files).map(async (file) => ({
        id: buildUploadedDocumentId(file),
        name: file.name,
        category: slot.category,
        tour: show.tourName,
        show: show.folderName,
        showId: show.id,
        updatedAt: new Date().toISOString().slice(0, 10),
        owner: "Current user",
        previewUrl: await readFileAsDataUrl(file),
        mimeType: file.type || null,
        subject: slot.subject
      }))
    );

    addUploadedDocuments(nextEntries);
  }

  async function handleFlyerUpload(file: File | null) {
    if (!show || !file) {
      return;
    }

    const previewUrl = await readFileAsDataUrl(file);
    patchShow({
      posterOverride: previewUrl || null
    });
  }

  async function saveTicketingIntegration() {
    setTicketingSaving(true);
    setTicketingError(null);
    setTicketingMessage(null);

    try {
      const response = await fetch("/api/ticketing/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: ticketingForm.provider,
          label: ticketingForm.label,
          credentials: {
            apiKey: ticketingForm.apiKey,
            privateToken: ticketingForm.privateToken,
            organizerId: ticketingForm.organizerId,
            webhookSecret: ticketingForm.webhookSecret
          }
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { integration?: TicketingIntegration; error?: string }
        | null;

      if (!response.ok || !payload?.integration) {
        throw new Error(payload?.error || "Unable to save the ticketing integration.");
      }

      setTicketingForm(buildTicketingFormDefaults());
      setTicketingMessage(
        t(
          locale,
          "Provider connecté et prêt à être lié à cette date.",
          "Provider connected and ready to link to this show."
        )
      );
      await refreshTicketing();
      setSelectedIntegrationId(payload.integration.id);
    } catch (error) {
      setTicketingError(
        error instanceof Error ? error.message : "Unable to save the ticketing integration."
      );
    } finally {
      setTicketingSaving(false);
    }
  }

  async function loadProviderEvents(integrationId: string) {
    setLoadingEventsForIntegration(integrationId);
    setTicketingError(null);

    try {
      const response = await fetch(
        `/api/ticketing/integrations/${integrationId}/events`,
        {
          method: "GET",
          cache: "no-store"
        }
      );
      const payload = (await response.json().catch(() => null)) as
        | { events?: Array<{
            id: string;
            title: string;
            startsAt: string | null;
            venueName: string | null;
            venueCity: string | null;
            currency: string;
            capacity: number | null;
            url: string | null;
          }>; error?: string }
        | null;

      if (!response.ok || !payload?.events) {
        throw new Error(payload?.error || "Unable to load provider events.");
      }

      setIntegrationEvents((current) => ({
        ...current,
        [integrationId]: payload.events ?? []
      }));
      setSelectedIntegrationId(integrationId);
      setSelectedExternalEventId(payload.events[0]?.id ?? "");
    } catch (error) {
      setTicketingError(
        error instanceof Error ? error.message : "Unable to load provider events."
      );
    } finally {
      setLoadingEventsForIntegration(null);
    }
  }

  async function linkExternalEvent() {
    if (!selectedIntegrationId || !selectedExternalEventId) {
      return;
    }

    const externalEvent =
      integrationEvents[selectedIntegrationId]?.find(
        (entry) => entry.id === selectedExternalEventId
      ) ?? null;

    setTicketingSaving(true);
    setTicketingError(null);

    try {
      const response = await fetch(`/api/ticketing/shows/${showFolderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          integrationId: selectedIntegrationId,
          externalEventId: selectedExternalEventId,
          externalEvent
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { event?: TicketingEvent; error?: string }
        | null;

      if (!response.ok || !payload?.event) {
        throw new Error(payload?.error || "Unable to link this external ticketing event.");
      }

      if (show) {
        updateImportedShowFolder(show.id, {
          ticketingEventId: payload.event.id
        });
      }
      setTicketingMessage(
        t(
          locale,
          "Event externe lié à la date. Lance maintenant une synchro complète.",
          "External event linked to this show. You can now run a full sync."
        )
      );
      await refreshTicketing();
    } catch (error) {
      setTicketingError(
        error instanceof Error ? error.message : "Unable to link this external event."
      );
    } finally {
      setTicketingSaving(false);
    }
  }

  async function syncTicketingEvent() {
    setTicketingSaving(true);
    setTicketingError(null);

    try {
      const response = await fetch(`/api/ticketing/shows/${showFolderId}/sync`, {
        method: "POST"
      });
      const payload = (await response.json().catch(() => null)) as
        | TicketingWorkspacePayload
        | { error?: string }
        | null;

      if (!response.ok || !payload || "error" in payload) {
        throw new Error(
          payload && "error" in payload
            ? payload.error
            : "Unable to sync ticketing."
        );
      }

      setTicketing(payload as TicketingWorkspacePayload);
      setTicketingMessage(
        t(locale, "Billetterie synchronisée.", "Ticketing synced.")
      );
    } catch (error) {
      setTicketingError(
        error instanceof Error ? error.message : "Unable to sync ticketing."
      );
    } finally {
      setTicketingSaving(false);
    }
  }

  async function unlinkTicketingEvent() {
    setTicketingSaving(true);
    setTicketingError(null);

    try {
      const response = await fetch(`/api/ticketing/shows/${showFolderId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to unlink ticketing.");
      }

      if (show) {
        updateImportedShowFolder(show.id, {
          ticketingEventId: null
        });
      }
      setTicketingMessage(
        t(locale, "Billetterie déliée de la date.", "Ticketing unlinked from the show.")
      );
      await refreshTicketing();
    } catch (error) {
      setTicketingError(
        error instanceof Error ? error.message : "Unable to unlink ticketing."
      );
    } finally {
      setTicketingSaving(false);
    }
  }

  async function deleteIntegration(integrationId: string) {
    setTicketingSaving(true);
    setTicketingError(null);

    try {
      const response = await fetch(`/api/ticketing/integrations/${integrationId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to remove the provider.");
      }

      setTicketingMessage(
        t(locale, "Provider supprimé.", "Provider removed.")
      );
      await refreshTicketing();
    } catch (error) {
      setTicketingError(
        error instanceof Error ? error.message : "Unable to remove the provider."
      );
    } finally {
      setTicketingSaving(false);
    }
  }

  if (!show) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t(locale, "Fiche date", "Show detail")}
          title={t(locale, "Date introuvable", "Show not found")}
          description={t(
            locale,
            "Cette date n'existe plus dans ton workspace ou n'a jamais été importée ici.",
            "This show no longer exists in your workspace or was never imported here."
          )}
          actions={
            <Link href={backHref} className={buttonStyles({ variant: "secondary" })}>
              <ArrowLeft className="h-4 w-4" />
              {t(locale, "Retour concerts", "Back to shows")}
            </Link>
          }
        />
        <EmptyState
          title={t(locale, "Aucune fiche date à ouvrir", "No show detail to open")}
          body={t(
            locale,
            "Retourne dans Concerts pour ouvrir une date existante depuis ta tournée.",
            "Go back to Shows and open an existing date from your tour."
          )}
        />
      </div>
    );
  }

  if (printMode) {
    return (
      <ShowDaySheetPrintShell
        autoprint={autoprint}
        show={show}
        locale={locale}
        currency={effectiveCurrency}
        workspaceName={workspaceName}
        workspaceLogo={workspaceLogo}
        soundEngineerName={soundEngineerName}
        showDocuments={showDocuments}
        ticketingMetrics={ticketingMetrics}
        ticketingSourceCurrency={ticketingSourceCurrency}
      />
    );
  }

  return (
    <div className="space-y-6" data-show-workspace="true" data-print-mode="false">
      <PageHeader
        eyebrow={t(locale, "Fiche date", "Show detail")}
        title={`${show.folderName} • ${show.city || show.country}`}
        description={t(
          locale,
          "Chaque date agit ici comme un vrai workspace de prod: déroulé, guestlist, ticketing, merch, travel, contacts et day sheet.",
          "Each date works here like a real production workspace: running order, guestlist, ticketing, merch, travel, contacts, and day sheet."
        )}
        actions={
          <>
            <Link href={backHref} className={buttonStyles({ variant: "secondary" })}>
              <ArrowLeft className="h-4 w-4" />
              {t(locale, "Retour concerts", "Back to shows")}
            </Link>
            <Button
              type="button"
              variant="primary"
              onClick={() => window.open(printHref, "_blank", "noopener,noreferrer")}
            >
              <Download className="h-4 w-4" />
              {t(locale, "Imprimer la day sheet", "Print day sheet")}
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{show.date || "—"}</Badge>
          <Badge tone={show.validated ? "success" : "warning"}>
            {show.validated
              ? t(locale, "date validée", "validated")
              : t(locale, "à compléter", "needs setup")}
          </Badge>
          <Badge tone={getShowStatusTone(show.status)}>
            {translateShowStatus(locale, show.status)}
          </Badge>
          {show.ticketingEventId ? (
            <Badge tone="accent">
              <Ticket className="mr-1 h-3.5 w-3.5" />
              {t(locale, "ticketing lié", "ticketing linked")}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Billet", "Ticket")}
            </p>
            <p className="mt-2 font-medium text-mist-50">
              {typeof show.ticketPrice === "number"
                ? formatCurrency(show.ticketPrice, effectiveCurrency, "GBP")
                : "—"}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Cachet", "Show fee")}
            </p>
            <p className="mt-2 font-medium text-mist-50">
              {typeof show.showFee === "number"
                ? formatCurrency(show.showFee, effectiveCurrency, "GBP")
                : "—"}
            </p>
            <p className="mt-1 text-xs text-mist-300">
              {manualFeeNet !== null
                ? `${manualFeeNet >= 0 ? "+" : "-"}${formatCurrency(
                    Math.abs(manualFeeNet),
                    effectiveCurrency,
                    "GBP"
                  )} ${t(locale, "net après coûts", "net after costs")}`
                : t(locale, "Revenu manuel de la date", "Manual show revenue")}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Coûts fixes", "Fixed costs")}
            </p>
            <p className="mt-2 font-medium text-mist-50">
              {formatCurrency(nightCosts, effectiveCurrency, "GBP")}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Projection 80%", "80% projection")}
            </p>
            <p className="mt-2 font-medium text-mist-50">
              {occupancyProjection
                ? `${occupancyProjection.delta >= 0 ? "+" : "-"}${formatCurrency(
                    Math.abs(occupancyProjection.delta),
                    effectiveCurrency,
                    "GBP"
                  )}`
                : "—"}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Guestlist", "Guestlist")}
            </p>
            <p className="mt-2 font-medium text-mist-50">
              {guestlistUsage.usedSpots}
              {typeof show.guestlistCapacity === "number"
                ? ` / ${show.guestlistCapacity}`
                : ""}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Billetterie", "Ticketing")}
            </p>
            <p className="mt-2 font-medium text-mist-50">
                {ticketingMetrics
                  ? `${ticketingMetrics.ticketsSold} ${t(locale, "vendus", "sold")}`
                  : t(locale, "non liée", "not linked")}
                </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabOrder.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition",
              activeTab === tab.id
                ? "border-coral-500/30 bg-coral-500/15 text-coral-200"
                : "border-white/10 bg-white/[0.03] text-mist-200 hover:bg-white/[0.06]"
            )}
          >
            {t(locale, tab.labelFr, tab.labelEn)}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Économie de la date", "Show economics")}
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Nom de la salle", "Venue name")}
                </span>
                <Input
                  value={show.venue}
                  onChange={(event) =>
                    patchShow({
                      venue: event.target.value,
                      folderName: event.target.value
                    })
                  }
                  placeholder={t(locale, "Nom de la salle", "Venue name")}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Ville", "City")}
                </span>
                <Input
                  value={show.city}
                  onChange={(event) =>
                    patchShow({
                      city: event.target.value
                    })
                  }
                  placeholder={t(locale, "Ville", "City")}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Pays", "Country")}
                </span>
                <Input
                  value={show.country}
                  onChange={(event) =>
                    patchShow({
                      country: event.target.value
                    })
                  }
                  placeholder={t(locale, "Pays", "Country")}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Adresse de la salle", "Venue address")}
                </span>
                <Input
                  value={show.address}
                  onChange={(event) =>
                    patchShow({
                      address: event.target.value
                    })
                  }
                  placeholder={t(locale, "Adresse complète", "Full address")}
                />
              </label>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Date", "Date")}
                </span>
                <Input
                  type="date"
                  value={show.date}
                  onChange={(event) =>
                    updateImportedShowFolder(show.id, { date: event.target.value })
                  }
                  className="[color-scheme:dark]"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Devise", "Currency")}
                </span>
                <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100">
                  {supportedCurrencyMeta[effectiveCurrency].label} (
                  {supportedCurrencyMeta[effectiveCurrency].symbol})
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Prix billet", "Ticket price")}
                </span>
                <Input
                  value={formatEditableMoney(show.ticketPrice, effectiveCurrency)}
                  onChange={(event) =>
                    patchShow({
                      ticketPrice:
                        parseOptionalNumber(event.target.value) !== null
                          ? convertCurrency(
                              parseOptionalNumber(event.target.value) ?? 0,
                              effectiveCurrency,
                              "GBP"
                            )
                          : null
                    })
                  }
                  placeholder="15"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Cachet", "Show fee")}
                </span>
                <Input
                  value={formatEditableMoney(show.showFee, effectiveCurrency)}
                  onChange={(event) =>
                    patchShow({
                      showFee:
                        parseOptionalNumber(event.target.value) !== null
                          ? convertCurrency(
                              parseOptionalNumber(event.target.value) ?? 0,
                              effectiveCurrency,
                              "GBP"
                            )
                          : null
                    })
                  }
                  placeholder="500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Prix de la salle", "Room hire")}
                </span>
                <Input
                  value={formatEditableMoney(show.roomHire, effectiveCurrency)}
                  onChange={(event) =>
                    patchShow({
                      roomHire:
                        parseOptionalNumber(event.target.value) !== null
                          ? convertCurrency(
                              parseOptionalNumber(event.target.value) ?? 0,
                              effectiveCurrency,
                              "GBP"
                            )
                          : null
                    })
                  }
                  placeholder="350"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Jauge", "Capacity")}
                </span>
                <Input
                  value={show.capacity ?? ""}
                  onChange={(event) =>
                    patchShow({ capacity: parseOptionalInteger(event.target.value) })
                  }
                  placeholder="180"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Statut", "Status")}
                </span>
                <select
                  value={show.status}
                  onChange={(event) =>
                    patchShow({
                      status: event.target.value as ImportedShowFolder["status"]
                    })
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                >
                  <option value="pending" className="bg-graphite-900">
                    {translateShowStatus(locale, "pending")}
                  </option>
                  <option value="booked" className="bg-graphite-900">
                    {translateShowStatus(locale, "booked")}
                  </option>
                  <option value="cancelled" className="bg-graphite-900">
                    {translateShowStatus(locale, "cancelled")}
                  </option>
                  <option value="local support needed" className="bg-graphite-900">
                    {translateShowStatus(locale, "local support needed")}
                  </option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Ingé son assigné", "Assigned sound engineer")}
                </span>
                <select
                  value={show.soundEngineerId ?? ""}
                  onChange={(event) =>
                    patchShow({
                      soundEngineerId: event.target.value || null
                    })
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                >
                  <option value="" className="bg-graphite-900">
                    {t(locale, "Aucun ingé", "No engineer")}
                  </option>
                  {soundEngineers.map((member) => (
                    <option key={member.id} value={member.id} className="bg-graphite-900">
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Coût ingé son", "Sound engineer cost")}
                </span>
                <Input
                  value={formatEditableMoney(show.soundEngineerCost, effectiveCurrency)}
                  onChange={(event) =>
                    patchShow({
                      soundEngineerCost:
                        parseOptionalNumber(event.target.value) !== null
                          ? convertCurrency(
                              parseOptionalNumber(event.target.value) ?? 0,
                              effectiveCurrency,
                              "GBP"
                            )
                          : null
                    })
                  }
                  placeholder="120"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <label className="space-y-2">
                  <span className="text-sm text-mist-200">
                    {t(locale, "Flyer de la date (URL)", "Show flyer (URL)")}
                  </span>
                  <Input
                    value={show.posterOverride ?? ""}
                    onChange={(event) =>
                      patchShow({
                        posterOverride: event.target.value.trim() || null
                      })
                    }
                    placeholder="https://..."
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className={buttonStyles({ variant: "secondary", size: "sm" })}>
                    <Upload className="h-4 w-4" />
                    {t(locale, "Uploader un flyer", "Upload flyer")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] ?? null;
                        void handleFlyerUpload(nextFile);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {show.posterOverride ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => patchShow({ posterOverride: null })}
                      className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t(locale, "Retirer", "Remove")}
                    </Button>
                  ) : null}
                </div>
                {show.posterOverride ? (
                  <div className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03]">
                    <img
                      src={show.posterOverride}
                      alt={t(locale, "Flyer de la date", "Show flyer")}
                      className="h-48 w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Validation", "Validation")}
                </span>
                <button
                  type="button"
                  onClick={() => patchShow({ validated: !show.validated })}
                  className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 transition hover:bg-white/10"
                >
                  <span>
                    {show.validated
                      ? t(locale, "Date validée", "Validated show")
                      : t(locale, "Date non validée", "Show not validated")}
                  </span>
                  {show.validated ? <Check className="h-4 w-4 text-emerald-300" /> : null}
                </button>
              </label>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Notes internes", "Internal notes")}
              </span>
              <textarea
                value={show.notes}
                onChange={(event) => patchShow({ notes: event.target.value })}
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition placeholder:text-mist-300/70 focus:border-coral-500/50 focus:bg-white/[0.07]"
              />
            </label>

            <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-mist-50">
                    {t(locale, "Groupes locaux", "Local bands")}
                  </p>
                  <p className="mt-1 text-sm text-mist-300">
                    {t(
                      locale,
                      "Assigne directement un groupe CRM à la date et son cachet remonte dans les calculs.",
                      "Assign a CRM band directly to the show and its fee will feed the calculations."
                    )}
                  </p>
                </div>
                {localBandContacts.length ? (
                  <div className="flex flex-wrap gap-2">
                    {(["opener", "support"] as Array<ImportedLocalAct["role"]>).map((role) => (
                      <select
                        key={role}
                        onChange={(event) => {
                          if (event.target.value) {
                            addLocalBandFromCrm(event.target.value, role);
                            event.currentTarget.value = "";
                          }
                        }}
                        className="h-11 min-w-[220px] rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                        defaultValue=""
                      >
                        <option value="" className="bg-graphite-900">
                          {role === "opener"
                            ? t(locale, "Ajouter un opener CRM", "Add CRM opener")
                            : t(locale, "Ajouter un support CRM", "Add CRM support")}
                        </option>
                        {localBandContacts.map((contact) => (
                          <option key={contact.id} value={contact.id} className="bg-graphite-900">
                            {contact.company}
                            {typeof contact.defaultFee === "number"
                              ? ` • ${formatCurrency(contact.defaultFee, effectiveCurrency, "GBP")}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 rounded-[22px] border border-white/8 bg-black/15 p-4 md:grid-cols-[1fr_160px_160px_auto]">
                  <Input
                    value={newLocalBandName}
                    onChange={(event) => {
                      setNewLocalBandName(event.target.value);
                      if (localBandMessage) {
                        setLocalBandMessage(null);
                      }
                    }}
                    placeholder={t(locale, "Créer un groupe CRM depuis cette date", "Create a CRM band from this show")}
                  />
                  <select
                    value={newLocalBandRole}
                    onChange={(event) => setNewLocalBandRole(event.target.value as ImportedLocalAct["role"])}
                    className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                  >
                    <option value="opener" className="bg-graphite-900">
                      {t(locale, "Opener", "Opener")}
                    </option>
                    <option value="support" className="bg-graphite-900">
                      {t(locale, "Support", "Support")}
                    </option>
                    <option value="other" className="bg-graphite-900">
                      {t(locale, "Autre", "Other")}
                    </option>
                  </select>
                  <Input
                    value={newLocalBandFee}
                    onChange={(event) => {
                      setNewLocalBandFee(event.target.value);
                      if (localBandMessage) {
                        setLocalBandMessage(null);
                      }
                    }}
                    placeholder={t(locale, "Cachet CRM", "CRM fee")}
                  />
                  <Button type="button" variant="secondary" onClick={createCrmBandFromShow}>
                    <Plus className="h-4 w-4" />
                    {t(locale, "Créer + assigner", "Create + assign")}
                  </Button>
                </div>
                {localBandMessage ? (
                  <p className="text-sm text-coral-200">{localBandMessage}</p>
                ) : null}
                {show.localSupportActs.length ? (
                  show.localSupportActs.map((act) => (
                    <div
                      key={act.id}
                      className="grid gap-3 rounded-[22px] border border-white/8 bg-black/15 p-4 md:grid-cols-[1fr_160px_160px_auto]"
                    >
                      <Input
                        value={act.name}
                        onChange={(event) =>
                          patchShow({
                            localSupportActs: show.localSupportActs.map((entry) =>
                              entry.id === act.id
                                ? {
                                    ...entry,
                                    name: event.target.value
                                  }
                                : entry
                            )
                          })
                        }
                        placeholder={t(locale, "Nom du groupe", "Band name")}
                      />
                      <select
                        value={act.role}
                        onChange={(event) =>
                          patchShow({
                            localSupportActs: show.localSupportActs.map((entry) =>
                              entry.id === act.id
                                ? {
                                    ...entry,
                                    role: event.target.value as ImportedLocalAct["role"]
                                  }
                                : entry
                            )
                          })
                        }
                        className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                      >
                        <option value="opener" className="bg-graphite-900">
                          {t(locale, "Opener", "Opener")}
                        </option>
                        <option value="support" className="bg-graphite-900">
                          {t(locale, "Support", "Support")}
                        </option>
                        <option value="other" className="bg-graphite-900">
                          {t(locale, "Autre", "Other")}
                        </option>
                      </select>
                      <Input
                        value={formatEditableMoney(act.fee, effectiveCurrency)}
                        onChange={(event) =>
                          patchShow({
                            localSupportActs: show.localSupportActs.map((entry) =>
                              entry.id === act.id
                                ? {
                                    ...entry,
                                    fee:
                                      parseOptionalNumber(event.target.value) !== null
                                        ? convertCurrency(
                                            parseOptionalNumber(
                                              event.target.value
                                            ) ?? 0,
                                            effectiveCurrency,
                                            "GBP"
                                          )
                                        : null
                                  }
                                : entry
                            )
                          })
                        }
                        placeholder="150"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          patchShow({
                            localSupportActs: show.localSupportActs.filter(
                              (entry) => entry.id !== act.id
                            )
                          })
                        }
                        className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-mist-300">
                    {t(
                      locale,
                      "Aucun groupe local assigné à cette date pour l'instant.",
                      "No local band assigned to this show yet."
                    )}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Infos day of show", "Day of show info")}
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Doors", "Doors")}
                </span>
                <Input
                  value={show.dayOfShowInfo.doorsTime}
                  onChange={(event) =>
                    patchShow({
                      dayOfShowInfo: {
                        ...show.dayOfShowInfo,
                        doorsTime: event.target.value
                      }
                    })
                  }
                  placeholder="19:00"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Settlement", "Settlement")}
                </span>
                <Input
                  value={show.dayOfShowInfo.settlementTime}
                  onChange={(event) =>
                    patchShow({
                      dayOfShowInfo: {
                        ...show.dayOfShowInfo,
                        settlementTime: event.target.value
                      }
                    })
                  }
                  placeholder="23:15"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-mist-200">WiFi</span>
                <Input
                  value={show.dayOfShowInfo.wifi}
                  onChange={(event) =>
                    patchShow({
                      dayOfShowInfo: {
                        ...show.dayOfShowInfo,
                        wifi: event.target.value
                      }
                    })
                  }
                  placeholder="Venue WiFi / code"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Parking", "Parking")}
                </span>
                <Input
                  value={show.dayOfShowInfo.parkingInfo}
                  onChange={(event) =>
                    patchShow({
                      dayOfShowInfo: {
                        ...show.dayOfShowInfo,
                        parkingInfo: event.target.value
                      }
                    })
                  }
                  placeholder={t(locale, "Parking, accès, code…", "Parking, access, code...")}
                />
              </label>
            </div>
            <label className="mt-4 block space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Hospitality", "Hospitality")}
              </span>
              <textarea
                value={show.dayOfShowInfo.hospitalityInfo}
                onChange={(event) =>
                  patchShow({
                    dayOfShowInfo: {
                      ...show.dayOfShowInfo,
                      hospitalityInfo: event.target.value
                    }
                  })
                }
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition focus:border-coral-500/50 focus:bg-white/[0.07]"
              />
            </label>
            <label className="mt-4 block space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Dressing room", "Dressing room")}
              </span>
              <textarea
                value={show.dayOfShowInfo.dressingRoomInfo}
                onChange={(event) =>
                  patchShow({
                    dayOfShowInfo: {
                      ...show.dayOfShowInfo,
                      dressingRoomInfo: event.target.value
                    }
                  })
                }
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition focus:border-coral-500/50 focus:bg-white/[0.07]"
              />
            </label>
            <label className="mt-4 block space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Notes day sheet", "Day sheet notes")}
              </span>
              <textarea
                value={show.daySheetNotes}
                onChange={(event) =>
                  patchShow({
                    daySheetNotes: event.target.value
                  })
                }
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition focus:border-coral-500/50 focus:bg-white/[0.07]"
              />
            </label>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-medium text-mist-50">
                  {t(locale, "Pack de prod", "Production pack")}
                </p>
                <p className="mt-2 text-sm text-mist-300">
                  {t(
                    locale,
                    "Ajoute ici stage plot, input list et photos utiles pour que la day sheet soit complète et imprimable.",
                    "Add the stage plot, input list, and useful venue photos here so the day sheet stays complete and printable."
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {productionDocumentSlots.map((slot) => (
                <label
                  key={`${slot.category}-${slot.subject}`}
                  className={buttonStyles({ variant: "secondary" })}
                >
                  <Upload className="h-4 w-4" />
                  {t(locale, slot.labelFr, slot.labelEn)}
                  <input
                    type="file"
                    accept={slot.accept}
                    multiple={slot.multiple}
                    className="hidden"
                    onChange={(event) => {
                      void handleProductionDocumentUpload(slot, event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-mist-50">
                    {t(locale, "Stage plot + input list", "Stage plot + input list")}
                  </p>
                  <Badge>{stagePlotDocuments.length + inputListDocuments.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {[...stagePlotDocuments, ...inputListDocuments].length ? (
                    [...stagePlotDocuments, ...inputListDocuments].map((document) => (
                      <div
                        key={document.id}
                        className="flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-black/15 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-mist-50">
                            {document.name}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mist-300">
                            {getProductionDocumentLabel(
                              locale,
                              document.category,
                              document.subject
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {document.previewUrl ? (
                            <a
                              href={document.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={buttonStyles({ variant: "secondary", size: "sm" })}
                            >
                              <ExternalLink className="h-4 w-4" />
                              {t(locale, "Ouvrir", "Open")}
                            </a>
                          ) : null}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => deleteUploadedDocument(document.id)}
                            className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title={t(locale, "Aucun document prod", "No production document yet")}
                      body={t(
                        locale,
                        "Upload le stage plot ou l'input list pour les retrouver ensuite dans la day sheet.",
                        "Upload the stage plot or input list to surface them inside the day sheet."
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-mist-50">
                    {t(locale, "Photos salle", "Venue photos")}
                  </p>
                  <Badge>{venuePhotoDocuments.length}</Badge>
                </div>
                {venuePhotoDocuments.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {venuePhotoDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="overflow-hidden rounded-[22px] border border-white/8 bg-black/15"
                      >
                        {document.previewUrl ? (
                          <a
                            href={document.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                          >
                            <img
                              src={document.previewUrl}
                              alt={document.name}
                              className="h-36 w-full object-cover"
                            />
                          </a>
                        ) : (
                          <div className="flex h-36 items-center justify-center bg-white/[0.03] text-sm text-mist-300">
                            {document.name}
                          </div>
                        )}
                        <div className="space-y-2 px-4 py-3">
                          <p className="truncate text-sm font-medium text-mist-50">
                            {document.name}
                          </p>
                          <p className="text-xs uppercase tracking-[0.18em] text-mist-300">
                            {getProductionDocumentLabel(
                              locale,
                              document.category,
                              document.subject
                            )}
                          </p>
                          <div className="flex gap-2">
                            {document.previewUrl ? (
                              <a
                                href={document.previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={buttonStyles({ variant: "secondary", size: "sm" })}
                              >
                                <ExternalLink className="h-4 w-4" />
                                {t(locale, "Voir", "View")}
                              </a>
                            ) : null}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => deleteUploadedDocument(document.id)}
                              className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4">
                    <EmptyState
                      title={t(locale, "Pas encore de photos utiles", "No venue photo yet")}
                      body={t(
                        locale,
                        "Ajoute loading dock, scène, backstage ou parking pour mieux briefer l'équipe.",
                        "Add loading dock, stage, backstage, or parking photos to brief the crew faster."
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-medium text-mist-50">
                  {t(locale, "Setlist", "Setlist")}
                </p>
                <p className="mt-2 text-sm text-mist-300">
                  {t(
                    locale,
                    "Prépare le déroulé musical avec durée, tempo, tuning, click et notes de transition.",
                    "Prepare the musical flow with duration, tempo, tuning, click, and transition notes."
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{show.setlistEntries.length} {t(locale, "titres", "songs")}</Badge>
                <Badge tone="accent">
                  {setlistTotalDuration} min
                </Badge>
                <Button type="button" variant="secondary" onClick={addSetlistEntry}>
                  <Plus className="h-4 w-4" />
                  {t(locale, "Ajouter un titre", "Add song")}
                </Button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {show.setlistEntries.length ? (
                show.setlistEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-[1.4fr_120px_120px_120px_150px_auto]">
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                          {t(locale, "Titre", "Song")}
                        </span>
                        <Input
                          value={entry.songTitle}
                          onChange={(event) =>
                            updateSetlistEntry(entry.id, { songTitle: event.target.value })
                          }
                          placeholder="Abyss Walker"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                          {t(locale, "Durée", "Duration")}
                        </span>
                        <Input
                          value={entry.durationMinutes ?? ""}
                          onChange={(event) =>
                            updateSetlistEntry(entry.id, {
                              durationMinutes: parseOptionalInteger(event.target.value)
                            })
                          }
                          placeholder="4"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                          Tempo
                        </span>
                        <Input
                          value={entry.tempo}
                          onChange={(event) =>
                            updateSetlistEntry(entry.id, { tempo: event.target.value })
                          }
                          placeholder="160 BPM"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                          Tuning
                        </span>
                        <Input
                          value={entry.tuning}
                          onChange={(event) =>
                            updateSetlistEntry(entry.id, { tuning: event.target.value })
                          }
                          placeholder="Drop A"
                        />
                      </label>
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateSetlistEntry(entry.id, {
                              clickTrack: !entry.clickTrack
                            })
                          }
                          className="flex h-11 items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 transition hover:bg-white/10"
                        >
                          <span>{t(locale, "Click", "Click")}</span>
                          {entry.clickTrack ? (
                            <Check className="h-4 w-4 text-emerald-300" />
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSetlistEntry(entry.id, {
                              isEncore: !entry.isEncore
                            })
                          }
                          className="flex h-11 items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 transition hover:bg-white/10"
                        >
                          <span>{t(locale, "Encore", "Encore")}</span>
                          {entry.isEncore ? (
                            <Check className="h-4 w-4 text-emerald-300" />
                          ) : null}
                        </button>
                      </div>
                      <div className="flex items-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => moveSetlistEntry(entry.id, "up")}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => moveSetlistEntry(entry.id, "down")}
                          disabled={index === show.setlistEntries.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => deleteSetlistEntry(entry.id)}
                          className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                          {t(locale, "Transition", "Transition")}
                        </span>
                        <Input
                          value={entry.transitionNotes}
                          onChange={(event) =>
                            updateSetlistEntry(entry.id, {
                              transitionNotes: event.target.value
                            })
                          }
                          placeholder={t(locale, "Sample, accordage, silence…", "Sample, retune, silence...")}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                          {t(locale, "Notes", "Notes")}
                        </span>
                        <Input
                          value={entry.notes}
                          onChange={(event) =>
                            updateSetlistEntry(entry.id, { notes: event.target.value })
                          }
                          placeholder={t(locale, "Pyro, cues, guest, speech…", "Pyro, cues, guest, speech...")}
                        />
                      </label>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title={t(locale, "Setlist vide", "Setlist is empty")}
                  body={t(
                    locale,
                    "Ajoute les morceaux de la soirée pour les retrouver dans la day sheet et le print.",
                    "Add the songs for the night to surface them inside the day sheet and print view."
                  )}
                />
              )}
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Checklist matos", "Gear checklist")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Suis l'état du matos par date avec quantité, série, QR label, photo et statut de chargement.",
                  "Track per-show gear with quantity, serial, QR label, photo, and loading status."
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{gearSummary.total} {t(locale, "pièces", "pieces")}</Badge>
              <Badge tone="success">{gearSummary.loaded} {t(locale, "chargées", "loaded")}</Badge>
              {gearSummary.missing ? (
                <Badge tone="warning">{gearSummary.missing} {t(locale, "manquantes", "missing")}</Badge>
              ) : null}
              {gearSummary.damaged ? (
                <Badge tone="warning">{gearSummary.damaged} {t(locale, "endommagées", "damaged")}</Badge>
              ) : null}
              <Button type="button" variant="secondary" onClick={addGearChecklistItem}>
                <Plus className="h-4 w-4" />
                {t(locale, "Ajouter une pièce", "Add item")}
              </Button>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {show.gearChecklistItems.length ? (
              show.gearChecklistItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="grid gap-3 md:grid-cols-[180px_1.2fr_140px_140px_180px_auto]">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        {t(locale, "Catégorie", "Category")}
                      </span>
                      <select
                        value={item.category}
                        onChange={(event) =>
                          updateGearChecklistItem(item.id, {
                            category: event.target.value
                          })
                        }
                        className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                      >
                        {gearChecklistCategories.map((category) => (
                          <option key={category} value={category} className="bg-graphite-900">
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        {t(locale, "Pièce", "Item")}
                      </span>
                      <Input
                        value={item.itemName}
                        onChange={(event) =>
                          updateGearChecklistItem(item.id, {
                            itemName: event.target.value
                          })
                        }
                        placeholder="Kick mic case"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        {t(locale, "Qté", "Qty")}
                      </span>
                      <Input
                        value={item.quantity}
                        onChange={(event) =>
                          updateGearChecklistItem(item.id, {
                            quantity: Math.max(
                              1,
                              parseOptionalInteger(event.target.value) ?? 1
                            )
                          })
                        }
                        placeholder="1"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        {t(locale, "Série", "Serial")}
                      </span>
                      <Input
                        value={item.serialNumber}
                        onChange={(event) =>
                          updateGearChecklistItem(item.id, {
                            serialNumber: event.target.value
                          })
                        }
                        placeholder="SN-001"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        Status
                      </span>
                      <select
                        value={item.status}
                        onChange={(event) =>
                          updateGearChecklistItem(item.id, {
                            status: event.target.value as ShowGearChecklistStatus
                          })
                        }
                        className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                      >
                        {gearChecklistStatuses.map((status) => (
                          <option key={status} value={status} className="bg-graphite-900">
                            {getGearChecklistStatusLabel(locale, status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => deleteGearChecklistItem(item.id)}
                        className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        QR label
                      </span>
                      <Input
                        value={item.qrLabel}
                        onChange={(event) =>
                          updateGearChecklistItem(item.id, {
                            qrLabel: event.target.value
                          })
                        }
                        placeholder="CASE-01"
                      />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        {t(locale, "Photo (URL)", "Photo (URL)")}
                      </span>
                      <Input
                        value={item.photoUrl ?? ""}
                        onChange={(event) =>
                          updateGearChecklistItem(item.id, {
                            photoUrl: event.target.value.trim() || null
                          })
                        }
                        placeholder="https://..."
                      />
                    </label>
                  </div>

                  <label className="mt-3 block space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                      {t(locale, "Notes", "Notes")}
                    </span>
                    <textarea
                      value={item.notes}
                      onChange={(event) =>
                        updateGearChecklistItem(item.id, {
                          notes: event.target.value
                        })
                      }
                      rows={2}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition focus:border-coral-500/50 focus:bg-white/[0.07]"
                    />
                  </label>
                </div>
              ))
            ) : (
              <EmptyState
                title={t(locale, "Checklist matos vide", "Gear checklist is empty")}
                body={t(
                  locale,
                  "Ajoute les éléments critiques de la date pour préparer le load-in et le load-out.",
                  "Add the critical show gear here to prep load-in and load-out."
                )}
              />
            )}
          </div>
        </Card>
        </>
      ) : null}

      {activeTab === "running-order" ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Running order", "Running order")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Glisse-dépose les lignes, complète les horaires, et repère les overlaps automatiquement.",
                  "Drag and drop rows, fill timings, and spot overlaps automatically."
                )}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={addRunningOrderRow}>
              <Plus className="h-4 w-4" />
              {t(locale, "Ajouter une ligne", "Add row")}
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {show.runningOrder.length ? (
              show.runningOrder.map((entry) => {
                const hasConflict = runningOrderConflicts.has(entry.id);

                return (
                  <div
                    key={entry.id}
                    draggable
                    onDragStart={() => setDraggedRunningOrderId(entry.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveRunningOrderRow(entry.id)}
                    className={cn(
                      "grid gap-3 rounded-[24px] border p-4 md:grid-cols-[42px_1.2fr_170px_120px_120px_auto]",
                      hasConflict
                        ? "border-amber-400/25 bg-amber-400/6"
                        : "border-white/8 bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/15 text-mist-300">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        {t(locale, "Artiste", "Artist")}
                      </span>
                      <Input
                        value={entry.artistName}
                        onChange={(event) =>
                          updateRunningOrderRow(entry.id, {
                            artistName: event.target.value
                          })
                        }
                        placeholder="Widespread Disease"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        {t(locale, "Type", "Type")}
                      </span>
                      <select
                        value={entry.type}
                        onChange={(event) =>
                          updateRunningOrderRow(entry.id, {
                            type: event.target.value as ShowRunningOrderEntry["type"]
                          })
                        }
                        className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                      >
                        {runningOrderTypes.map((type) => (
                          <option key={type} value={type} className="bg-graphite-900">
                            {getRunningOrderTypeLabel(locale, type)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        {t(locale, "Début", "Start")}
                      </span>
                      <Input
                        value={entry.startTime}
                        onChange={(event) =>
                          updateRunningOrderRow(entry.id, {
                            startTime: event.target.value
                          })
                        }
                        placeholder="19:00"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        {t(locale, "Fin", "End")}
                      </span>
                      <Input
                        value={entry.endTime}
                        onChange={(event) =>
                          updateRunningOrderRow(entry.id, {
                            endTime: event.target.value
                          })
                        }
                        placeholder="19:30"
                      />
                    </label>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist-100">
                        {entry.durationMinutes
                          ? `${entry.durationMinutes} min`
                          : t(locale, "Durée auto", "Auto duration")}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => deleteRunningOrderRow(entry.id)}
                        className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <label className="md:col-span-6">
                      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist-300">
                        {t(locale, "Notes", "Notes")}
                      </span>
                      <textarea
                        value={entry.notes}
                        onChange={(event) =>
                          updateRunningOrderRow(entry.id, {
                            notes: event.target.value
                          })
                        }
                        rows={2}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition focus:border-coral-500/50 focus:bg-white/[0.07]"
                      />
                    </label>
                    {hasConflict ? (
                      <div className="md:col-span-6 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-200">
                        <AlertTriangle className="mr-2 inline h-4 w-4" />
                        {t(
                          locale,
                          "Chevauchement détecté avec une autre ligne du running order.",
                          "An overlap has been detected with another running-order row."
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <EmptyState
                title={t(locale, "Aucune ligne de running order", "No running-order row yet")}
                body={t(
                  locale,
                  "Ajoute les moments clés de la journée: load-in, soundcheck, doors, supports, headliner et curfew.",
                  "Add the key moments of the day: load-in, soundcheck, doors, supports, headliner, and curfew."
                )}
              />
            )}
          </div>
        </Card>
      ) : null}

      {activeTab === "guestlist" ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Guestlist", "Guestlist")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Suis les invités, la capacité dédiée et le mode check-in pour la porte.",
                  "Track guests, reserved capacity, and the door check-in mode."
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className={buttonStyles({ variant: "secondary" })}>
                <Upload className="h-4 w-4" />
                {t(locale, "Importer CSV", "Import CSV")}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    void handleGuestlistImport(nextFile);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <Button type="button" variant="secondary" onClick={exportGuestlistCsv}>
                <Download className="h-4 w-4" />
                {t(locale, "Exporter CSV", "Export CSV")}
              </Button>
              <Button type="button" variant="secondary" onClick={addGuestlistEntry}>
                <Plus className="h-4 w-4" />
                {t(locale, "Ajouter un invité", "Add guest")}
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Capacité guestlist", "Guestlist capacity")}
              </span>
              <Input
                value={show.guestlistCapacity ?? ""}
                onChange={(event) =>
                  patchShow({
                    guestlistCapacity: parseOptionalInteger(event.target.value)
                  })
                }
                placeholder="20"
              />
            </label>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Spots utilisés", "Used spots")}
              </p>
              <p className="mt-2 text-xl font-semibold text-mist-50">
                {guestlistUsage.usedSpots}
              </p>
              <p className="mt-1 text-sm text-mist-300">
                {guestlistUsage.remainingSpots === null
                  ? t(locale, "Capacité libre", "Open capacity")
                  : t(
                      locale,
                      `${guestlistUsage.remainingSpots} restants`,
                      `${guestlistUsage.remainingSpots} remaining`
                    )}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                patchShow({ guestlistCheckInMode: !show.guestlistCheckInMode })
              }
              className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Mode check-in porte", "Door check-in mode")}
              </p>
              <p className="mt-2 text-xl font-semibold text-mist-50">
                {show.guestlistCheckInMode
                  ? t(locale, "Activé", "Enabled")
                  : t(locale, "Désactivé", "Disabled")}
              </p>
              <p className="mt-1 text-sm text-mist-300">
                {t(
                  locale,
                  "Permet de valider les invités en direct à l'entrée.",
                  "Lets the door person check guests in live."
                )}
              </p>
            </button>
          </div>

          {guestlistUsage.overCapacity ? (
            <div className="mt-4 rounded-[24px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {t(
                locale,
                "La guestlist dépasse la capacité dédiée à cette date.",
                "The guestlist is over the capacity reserved for this show."
              )}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {show.guestlistEntries.length ? (
              show.guestlistEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[1fr_1fr_120px_180px_auto]"
                >
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                      {t(locale, "Nom", "Name")}
                    </span>
                    <Input
                      value={entry.name}
                      onChange={(event) =>
                        updateGuestlistEntry(entry.id, { name: event.target.value })
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                      {t(locale, "Guest of", "Guest of")}
                    </span>
                    <Input
                      value={entry.guestOf}
                      onChange={(event) =>
                        updateGuestlistEntry(entry.id, { guestOf: event.target.value })
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                      {t(locale, "Spots", "Spots")}
                    </span>
                    <Input
                      value={entry.spots}
                      onChange={(event) =>
                        updateGuestlistEntry(entry.id, {
                          spots: Math.max(
                            1,
                            parseOptionalInteger(event.target.value) ?? 1
                          )
                        })
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                      {t(locale, "Statut", "Status")}
                    </span>
                    <select
                      value={entry.status}
                      onChange={(event) =>
                        updateGuestlistEntry(entry.id, {
                          status: event.target.value as ShowGuestlistEntry["status"],
                          checkedInAt:
                            event.target.value === "checked-in"
                              ? new Date().toISOString()
                              : entry.checkedInAt
                        })
                      }
                      className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                    >
                      {guestlistStatuses.map((status) => (
                        <option key={status} value={status} className="bg-graphite-900">
                          {getGuestlistStatusLabel(locale, status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end gap-2">
                    {show.guestlistCheckInMode ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          updateGuestlistEntry(entry.id, {
                            status:
                              entry.status === "checked-in" ? "confirmed" : "checked-in",
                            checkedInAt:
                              entry.status === "checked-in"
                                ? null
                                : new Date().toISOString()
                          })
                        }
                        className="whitespace-nowrap"
                      >
                        <Users className="h-4 w-4" />
                        {entry.status === "checked-in"
                          ? t(locale, "Annuler", "Undo")
                          : t(locale, "Check-in", "Check in")}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => deleteGuestlistEntry(entry.id)}
                      className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <label className="md:col-span-5">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist-300">
                      {t(locale, "Notes", "Notes")}
                    </span>
                    <textarea
                      value={entry.notes}
                      onChange={(event) =>
                        updateGuestlistEntry(entry.id, { notes: event.target.value })
                      }
                      rows={2}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition focus:border-coral-500/50 focus:bg-white/[0.07]"
                    />
                  </label>
                </div>
              ))
            ) : (
              <EmptyState
                title={t(locale, "Guestlist vide", "Guestlist is empty")}
                body={t(
                  locale,
                  "Ajoute tes invités, importe un CSV ou active le mode check-in pour la porte.",
                  "Add your guests, import a CSV, or enable check-in mode for the door."
                )}
              />
            )}
          </div>
        </Card>
      ) : null}

      {activeTab === "ticketing" ? (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-medium text-mist-50">
                  {t(locale, "Ticketing externe", "External ticketing")}
                </p>
                <p className="mt-2 text-sm text-mist-300">
                  {t(
                    locale,
                    "Connecte Ticket Tailor ou Eventbrite, lie l'event externe, puis synchronise revenus, frais, ordres et attendees.",
                    "Connect Ticket Tailor or Eventbrite, link the external event, then sync revenue, fees, orders, and attendees."
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void refreshTicketing()}
                  disabled={ticketingLoading}
                >
                  <RefreshCcw className={cn("h-4 w-4", ticketingLoading ? "animate-spin" : "")} />
                  {t(locale, "Rafraîchir", "Refresh")}
                </Button>
                {ticketing?.event ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void syncTicketingEvent()}
                      disabled={ticketingSaving}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {t(locale, "Sync", "Sync")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void unlinkTicketingEvent()}
                      disabled={ticketingSaving}
                      className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t(locale, "Délier", "Unlink")}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            {ticketingError ? (
              <div className="mt-4 rounded-[24px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {ticketingError}
              </div>
            ) : null}
            {ticketingMessage ? (
              <div className="mt-4 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {ticketingMessage}
              </div>
            ) : null}

            {canManageTicketing ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-mist-50">
                    {t(locale, "Connecter un provider", "Connect a provider")}
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm text-mist-200">
                        {t(locale, "Provider", "Provider")}
                      </span>
                      <select
                        value={ticketingForm.provider}
                        onChange={(event) =>
                          setTicketingForm((current) => ({
                            ...current,
                            provider: event.target.value as TicketingProvider
                          }))
                        }
                        className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                      >
                        <option value="ticket-tailor" className="bg-graphite-900">
                          Ticket Tailor
                        </option>
                        <option value="eventbrite" className="bg-graphite-900">
                          Eventbrite
                        </option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-mist-200">
                        {t(locale, "Label interne", "Internal label")}
                      </span>
                      <Input
                        value={ticketingForm.label}
                        onChange={(event) =>
                          setTicketingForm((current) => ({
                            ...current,
                            label: event.target.value
                          }))
                        }
                        placeholder="BandOS Ticketing"
                      />
                    </label>
                    {ticketingForm.provider === "ticket-tailor" ? (
                      <label className="space-y-2 md:col-span-2">
                        <span className="text-sm text-mist-200">API key</span>
                        <Input
                          value={ticketingForm.apiKey}
                          onChange={(event) =>
                            setTicketingForm((current) => ({
                              ...current,
                              apiKey: event.target.value
                            }))
                          }
                          placeholder="tt_live_..."
                        />
                      </label>
                    ) : (
                      <>
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm text-mist-200">
                            {t(locale, "Private token", "Private token")}
                          </span>
                          <Input
                            value={ticketingForm.privateToken}
                            onChange={(event) =>
                              setTicketingForm((current) => ({
                                ...current,
                                privateToken: event.target.value
                              }))
                            }
                            placeholder="EB_PRIVATE_TOKEN"
                          />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm text-mist-200">
                            Organizer ID
                          </span>
                          <Input
                            value={ticketingForm.organizerId}
                            onChange={(event) =>
                              setTicketingForm((current) => ({
                                ...current,
                                organizerId: event.target.value
                              }))
                            }
                            placeholder="Optional organizer id"
                          />
                        </label>
                      </>
                    )}
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm text-mist-200">
                        {t(locale, "Webhook secret", "Webhook secret")}
                      </span>
                      <Input
                        value={ticketingForm.webhookSecret}
                        onChange={(event) =>
                          setTicketingForm((current) => ({
                            ...current,
                            webhookSecret: event.target.value
                          }))
                        }
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void saveTicketingIntegration()}
                      disabled={ticketingSaving}
                    >
                      {ticketingSaving
                        ? t(locale, "Connexion…", "Connecting...")
                        : t(locale, "Enregistrer le provider", "Save provider")}
                    </Button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-mist-50">
                    {t(locale, "Providers connectés", "Connected providers")}
                  </p>
                  <div className="mt-4 space-y-3">
                    {ticketing?.integrations.length ? (
                      ticketing.integrations.map((integration) => (
                        <div
                          key={integration.id}
                          className="rounded-[22px] border border-white/8 bg-black/15 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-mist-50">
                                {integration.label}
                              </p>
                              <p className="mt-1 text-sm text-mist-300">
                                {integration.credentialsPreview.primary}
                                {integration.credentialsPreview.secondary
                                  ? ` • ${integration.credentialsPreview.secondary}`
                                  : ""}
                              </p>
                            </div>
                            <Badge
                              tone={
                                integration.status === "connected"
                                  ? "success"
                                  : integration.status === "needs-attention"
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {integration.status}
                            </Badge>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void loadProviderEvents(integration.id)}
                              disabled={loadingEventsForIntegration === integration.id}
                            >
                              {loadingEventsForIntegration === integration.id
                                ? t(locale, "Chargement…", "Loading...")
                                : t(locale, "Charger les events", "Load events")}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void deleteIntegration(integration.id)}
                              disabled={ticketingSaving}
                              className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t(locale, "Supprimer", "Delete")}
                            </Button>
                          </div>

                          {selectedIntegrationId === integration.id &&
                          integrationEvents[integration.id]?.length ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                              <select
                                value={selectedExternalEventId}
                                onChange={(event) =>
                                  setSelectedExternalEventId(event.target.value)
                                }
                                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                              >
                                {integrationEvents[integration.id].map((event) => (
                                  <option
                                    key={event.id}
                                    value={event.id}
                                    className="bg-graphite-900"
                                  >
                                    {event.title}
                                    {event.startsAt ? ` • ${event.startsAt.slice(0, 10)}` : ""}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                variant="primary"
                                onClick={() => void linkExternalEvent()}
                                disabled={!selectedExternalEventId || ticketingSaving}
                              >
                                {t(locale, "Lier à cette date", "Link to this show")}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title={t(locale, "Aucun provider connecté", "No provider connected")}
                        body={t(
                          locale,
                          "Ajoute un provider pour commencer à suivre les ventes et la capacité en live.",
                          "Add a provider to start tracking live sales and capacity."
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Gross", "Gross")}
                </p>
                <p className="mt-2 text-xl font-semibold text-mist-50">
                {ticketingMetrics
                    ? formatCurrency(ticketingMetrics.grossRevenue, effectiveCurrency, ticketingSourceCurrency)
                    : "—"}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Net", "Net")}
                </p>
                <p className="mt-2 text-xl font-semibold text-mist-50">
                {ticketingMetrics
                    ? formatCurrency(ticketingMetrics.netRevenue, effectiveCurrency, ticketingSourceCurrency)
                    : "—"}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Tickets vendus", "Tickets sold")}
                </p>
                <p className="mt-2 text-xl font-semibold text-mist-50">
                {ticketingMetrics?.ticketsSold ?? "—"}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {ticketingMetrics?.capacitySoldPercentage != null
                    ? `${ticketingMetrics.capacitySoldPercentage.toFixed(1)}% ${t(locale, "de la jauge", "of capacity")}`
                    : t(locale, "Pas encore de snapshot", "No snapshot yet")}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Moyenne billet", "Average ticket")}
                </p>
                <p className="mt-2 text-xl font-semibold text-mist-50">
                  {ticketingMetrics?.averageTicketPrice != null
                    ? formatCurrency(
                        ticketingMetrics.averageTicketPrice,
                        effectiveCurrency,
                        ticketingSourceCurrency
                      )
                    : "—"}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {ticketingMetrics
                    ? `${ticketingMetrics.refundCount} ${t(locale, "refunds", "refunds")} • ${ticketingMetrics.guestlistCount} guestlist`
                    : t(locale, "Event non lié", "Event not linked")}
                </p>
              </div>
            </div>

            {ticketing?.event ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-mist-300">
                        {t(locale, "Event lié", "Linked event")}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-mist-50">
                        {ticketing.event.title}
                      </p>
                      <p className="mt-2 text-sm text-mist-300">
                        {[ticketing.event.startsAt?.slice(0, 10), ticketing.event.venueName, ticketing.event.venueCity]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                    {ticketing.event.externalEventUrl ? (
                      <a
                        href={ticketing.event.externalEventUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonStyles({ variant: "secondary", size: "sm" })}
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t(locale, "Ouvrir", "Open")}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {ticketing.ticketClasses.map((ticketClass) => (
                      <div
                        key={ticketClass.id}
                        className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
                      >
                        <p className="font-medium text-mist-50">{ticketClass.name}</p>
                        <p className="mt-1 text-sm text-mist-300">
                          {formatCurrency(
                            ticketClass.price,
                            effectiveCurrency,
                            normalizeCurrency(ticketClass.currency)
                          )}
                        </p>
                        <p className="mt-3 text-sm text-mist-200">
                          {ticketClass.quantitySold}
                          {ticketClass.quantityTotal != null
                            ? ` / ${ticketClass.quantityTotal}`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  <p className="text-sm uppercase tracking-[0.24em] text-mist-300">
                    {t(locale, "Logs de sync", "Sync logs")}
                  </p>
                  <div className="mt-4 space-y-3">
                    {ticketing.logs.length ? (
                      ticketing.logs.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Badge
                              tone={
                                entry.level === "error"
                                  ? "warning"
                                  : entry.level === "warning"
                                    ? "accent"
                                    : "success"
                              }
                            >
                              {entry.level}
                            </Badge>
                            <span className="text-xs text-mist-300">
                              {entry.createdAt.slice(0, 16).replace("T", " ")}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-mist-50">{entry.message}</p>
                          {entry.context ? (
                            <p className="mt-1 text-sm text-mist-300">{entry.context}</p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title={t(locale, "Aucun log ticketing", "No ticketing log")}
                        body={t(
                          locale,
                          "Les traces de sync et d'erreur apparaîtront ici dès que tu connecteras une billetterie.",
                          "Sync and error traces will appear here once you connect a ticketing provider."
                        )}
                      />
                    )}
                  </div>
                </Card>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      {activeTab === "merch" ? (
        <Card>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Merch setup", "Merch setup")}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Responsable merch", "Merch seller")}
              </span>
              <Input
                value={show.merchSetup.sellerName}
                onChange={(event) =>
                  patchShow({
                    merchSetup: {
                      ...show.merchSetup,
                      sellerName: event.target.value
                    }
                  })
                }
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Emplacement table", "Table location")}
              </span>
              <Input
                value={show.merchSetup.tableLocation}
                onChange={(event) =>
                  patchShow({
                    merchSetup: {
                      ...show.merchSetup,
                      tableLocation: event.target.value
                    }
                  })
                }
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Merch cut %", "Merch cut %")}
              </span>
              <Input
                value={show.merchSetup.cutPercent ?? ""}
                onChange={(event) =>
                  patchShow({
                    merchSetup: {
                      ...show.merchSetup,
                      cutPercent: parseOptionalNumber(event.target.value)
                    }
                  })
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                patchShow({
                  merchSetup: {
                    ...show.merchSetup,
                    powerRequired: !show.merchSetup.powerRequired
                  }
                })
              }
              className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Power required", "Power required")}
              </p>
              <p className="mt-2 text-xl font-semibold text-mist-50">
                {show.merchSetup.powerRequired
                  ? t(locale, "Oui", "Yes")
                  : t(locale, "Non", "No")}
              </p>
            </button>
          </div>
          <label className="mt-4 block space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Notes stock & setup", "Stock & setup notes")}
            </span>
            <textarea
              value={show.merchSetup.stockNotes}
              onChange={(event) =>
                patchShow({
                  merchSetup: {
                    ...show.merchSetup,
                    stockNotes: event.target.value
                  }
                })
              }
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition focus:border-coral-500/50 focus:bg-white/[0.07]"
            />
          </label>
          <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-mist-300">
              {t(
                locale,
                `${merchCatalog.length} article(s) merch disponibles dans ce workspace.`,
                `${merchCatalog.length} merch item(s) available in this workspace.`
              )}
            </p>
          </div>
        </Card>
      ) : null}

      {activeTab === "travel" ? (
        <Card>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Travel & hotel", "Travel & hotel")}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Départ", "Departure")}
              </span>
              <Input
                value={show.travelInfo.departureTime}
                onChange={(event) =>
                  patchShow({
                    travelInfo: {
                      ...show.travelInfo,
                      departureTime: event.target.value
                    }
                  })
                }
                placeholder="09:00"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Arrivée", "Arrival")}
              </span>
              <Input
                value={show.travelInfo.arrivalTime}
                onChange={(event) =>
                  patchShow({
                    travelInfo: {
                      ...show.travelInfo,
                      arrivalTime: event.target.value
                    }
                  })
                }
                placeholder="14:00"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Hôtel", "Hotel")}
              </span>
              <Input
                value={show.travelInfo.hotelName}
                onChange={(event) =>
                  patchShow({
                    travelInfo: {
                      ...show.travelInfo,
                      hotelName: event.target.value
                    }
                  })
                }
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Adresse hôtel", "Hotel address")}
              </span>
              <Input
                value={show.travelInfo.hotelAddress}
                onChange={(event) =>
                  patchShow({
                    travelInfo: {
                      ...show.travelInfo,
                      hotelAddress: event.target.value
                    }
                  })
                }
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Rooms", "Rooms")}
              </span>
              <Input
                value={show.travelInfo.hotelRooms}
                onChange={(event) =>
                  patchShow({
                    travelInfo: {
                      ...show.travelInfo,
                      hotelRooms: event.target.value
                    }
                  })
                }
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                Check-in / check-out
              </span>
              <Input
                value={[show.travelInfo.hotelCheckIn, show.travelInfo.hotelCheckOut]
                  .filter(Boolean)
                  .join(" → ")}
                onChange={(event) => {
                  const [hotelCheckIn, hotelCheckOut] = event.target.value
                    .split("→")
                    .map((value) => value.trim());
                  patchShow({
                    travelInfo: {
                      ...show.travelInfo,
                      hotelCheckIn: hotelCheckIn ?? "",
                      hotelCheckOut: hotelCheckOut ?? ""
                    }
                  });
                }}
                placeholder="15:00 → 11:00"
              />
            </label>
          </div>
          <label className="mt-4 block space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Notes travel", "Travel notes")}
            </span>
            <textarea
              value={show.travelInfo.travelNotes}
              onChange={(event) =>
                patchShow({
                  travelInfo: {
                    ...show.travelInfo,
                    travelNotes: event.target.value
                  }
                })
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition focus:border-coral-500/50 focus:bg-white/[0.07]"
            />
          </label>
          <label className="mt-4 block space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Notes frontière / customs", "Border / customs notes")}
            </span>
            <textarea
              value={show.travelInfo.borderNotes}
              onChange={(event) =>
                patchShow({
                  travelInfo: {
                    ...show.travelInfo,
                    borderNotes: event.target.value
                  }
                })
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition focus:border-coral-500/50 focus:bg-white/[0.07]"
            />
          </label>
        </Card>
      ) : null}

      {activeTab === "contacts" ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Venue contacts", "Venue contacts")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Contacts salle, promoter, sécurité, backstage ou hospitality pour la date.",
                  "Venue, promoter, security, backstage, or hospitality contacts for the show."
                )}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={addVenueContact}>
              <Plus className="h-4 w-4" />
              {t(locale, "Ajouter un contact", "Add contact")}
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {show.venueContacts.length ? (
              show.venueContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                >
                  <Input
                    value={contact.name}
                    onChange={(event) =>
                      updateVenueContact(contact.id, { name: event.target.value })
                    }
                    placeholder={t(locale, "Nom", "Name")}
                  />
                  <Input
                    value={contact.role}
                    onChange={(event) =>
                      updateVenueContact(contact.id, { role: event.target.value })
                    }
                    placeholder={t(locale, "Rôle", "Role")}
                  />
                  <Input
                    value={contact.email}
                    onChange={(event) =>
                      updateVenueContact(contact.id, { email: event.target.value })
                    }
                    placeholder="mail@example.com"
                  />
                  <Input
                    value={contact.phone}
                    onChange={(event) =>
                      updateVenueContact(contact.id, { phone: event.target.value })
                    }
                    placeholder="+44 ..."
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => deleteVenueContact(contact.id)}
                    className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <EmptyState
                title={t(locale, "Aucun contact saisi", "No contact added yet")}
                body={t(
                  locale,
                  "Ajoute ici les bons numéros et mails pour que la day sheet soit immédiatement exploitable.",
                  "Add the right numbers and emails here so the day sheet becomes immediately usable."
                )}
              />
            )}
          </div>
        </Card>
      ) : null}

      {activeTab === "day-sheet" ? (
        <PremiumDaySheet
          show={show}
          locale={locale}
          currency={effectiveCurrency}
          workspaceName={workspaceName}
          workspaceLogo={workspaceLogo}
          ticketingMetrics={ticketingMetrics}
          ticketingSourceCurrency={ticketingSourceCurrency}
        />
      ) : null}
    </div>
  );
}
