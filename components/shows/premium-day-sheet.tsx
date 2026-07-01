"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CloudRain,
  CloudSun,
  Clock3,
  ExternalLink,
  FileText,
  Hotel,
  Mail,
  MapPinned,
  MessageCircle,
  Phone,
  Route,
  Store,
  Sunrise,
  Sunset,
  Ticket,
  Users,
  Wallet,
  Wind,
  Wifi
} from "lucide-react";

import { WorkspaceLogo } from "@/components/shared/workspace-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { t, type Locale } from "@/lib/i18n";
import {
  getGearChecklistSummary,
  getSetlistTotalDuration
} from "@/lib/shows";
import { cn, formatCurrency, type SupportedCurrency } from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";
import type {
  ImportedShowFolder,
  ShowGearChecklistItem,
  ShowGuestlistEntry,
  ShowRunningOrderEntry,
  ShowSetlistEntry,
  UploadedDocumentEntry
} from "@/lib/workspace-data";

type PremiumDaySheetProps = {
  show: ImportedShowFolder;
  locale: Locale;
  currency: SupportedCurrency;
  workspaceName: string;
  workspaceLogo: string;
  printMode?: boolean;
  onPrintReady?: () => void;
  ticketingMetrics: {
    grossRevenue: number;
    netRevenue: number;
    fees: number;
    ticketsSold: number;
    capacitySoldPercentage: number | null;
    averageTicketPrice: number | null;
    guestlistCount: number;
    refundCount: number;
  } | null;
  ticketingSourceCurrency: SupportedCurrency;
};

type OpsContext = {
  name: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
  currentTime: string | null;
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  rainProbability: number | null;
  weatherCode: number | null;
  sunrise: string | null;
  sunset: string | null;
  uvIndex: number | null;
  hourlyForecast: Array<{
    time: string;
    temperature: number | null;
    weatherCode: number | null;
    precipitationProbability: number | null;
  }>;
  warning: string | null;
};

type TimelineItem = {
  id: string;
  type:
    | "departure"
    | "arrival"
    | "load-in"
    | "soundcheck"
    | "doors"
    | "show"
    | "support"
    | "local support"
    | "changeover"
    | "curfew"
    | "settlement"
    | "hotel";
  label: string;
  startTime: string;
  endTime: string;
  responsible: string;
  notes: string;
  durationLabel: string | null;
  icon: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function normalizeWhatsappPhone(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return normalized.startsWith("+") ? normalized.slice(1) : normalized;
}

function buildMapsQuery(...parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(", ");
}

function buildGoogleMapsLink(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildAppleMapsLink(query: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}

function buildOpenStreetMapLink(query: string) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

function getWeatherLabel(locale: Locale, code: number | null) {
  if (code === null) {
    return t(locale, "Météo indisponible", "Weather unavailable");
  }

  if ([0].includes(code)) {
    return t(locale, "Ciel clair", "Clear sky");
  }

  if ([1, 2].includes(code)) {
    return t(locale, "Peu nuageux", "Partly cloudy");
  }

  if (code === 3) {
    return t(locale, "Couvert", "Overcast");
  }

  if ([45, 48].includes(code)) {
    return t(locale, "Brume", "Fog");
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return t(locale, "Bruine", "Drizzle");
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return t(locale, "Pluie", "Rain");
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return t(locale, "Neige", "Snow");
  }

  if ([95, 96, 99].includes(code)) {
    return t(locale, "Orage", "Thunderstorm");
  }

  return t(locale, "Conditions mixtes", "Mixed conditions");
}

function getWeatherTone(code: number | null) {
  if (code === null) {
    return "neutral";
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
    return "warning";
  }

  return "accent";
}

function getCountryGuide(
  country: string,
  locale: Locale,
  currency: SupportedCurrency
) {
  const normalized = country.trim().toLowerCase();

  if (
    normalized.includes("united kingdom") ||
    normalized.includes("royaume-uni") ||
    normalized === "uk" ||
    normalized.includes("england") ||
    normalized.includes("scotland")
  ) {
    return {
      language: t(locale, "Anglais", "English"),
      outlets: "Type G",
      voltage: "230V",
      emergency: "999",
      localCurrency: "GBP (£)"
    };
  }

  if (normalized.includes("france")) {
    return {
      language: t(locale, "Français", "French"),
      outlets: "Type C / E",
      voltage: "230V",
      emergency: "112",
      localCurrency: "EUR (€)"
    };
  }

  if (
    normalized.includes("usa") ||
    normalized.includes("united states") ||
    normalized.includes("états-unis")
  ) {
    return {
      language: t(locale, "Anglais", "English"),
      outlets: "Type A / B",
      voltage: "120V",
      emergency: "911",
      localCurrency: "USD ($)"
    };
  }

  return {
    language: locale === "fr" ? "Langue locale" : "Local language",
    outlets: "Type C / F",
    voltage: "230V",
    emergency: "112",
    localCurrency: `${currency}`
  };
}

function formatLongDate(
  date: string,
  locale: Locale,
  timeZone?: string | null
) {
  if (!date) {
    return "—";
  }

  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(timeZone ? { timeZone } : {})
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

function toLocalDateTime(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(utcGuess)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<string, string>;

  const asLocalUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    0
  );

  return new Date(utcGuess.getTime() - (asLocalUtc - utcGuess.getTime()));
}

function formatCountdown(
  date: string,
  time: string,
  timeZone: string,
  locale: Locale,
  nowTick: number
) {
  if (!date || !time) {
    return t(locale, "Horaire non renseigné", "Time not set");
  }

  const targetDate = toLocalDateTime(date, time, timeZone);
  const delta = targetDate.getTime() - nowTick;

  if (delta <= 0) {
    return t(locale, "En cours ou passé", "Live or passed");
  }

  const hours = Math.floor(delta / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);

  return `${hours}h${String(minutes).padStart(2, "0")}m`;
}

function formatTimeInZone(
  timeZone: string | null | undefined,
  locale: Locale,
  nowTick: number
) {
  if (!timeZone) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(nowTick));
}

function formatShortTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const [, time] = value.split("T");
  return time?.slice(0, 5) ?? value.slice(-5);
}

function formatDurationLabel(startTime: string, endTime: string) {
  if (!startTime || !endTime) {
    return null;
  }

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return null;
  }

  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);

  if (minutes <= 0) {
    return null;
  }

  return `${minutes} min`;
}

function getTimelineState(
  item: TimelineItem,
  date: string,
  timeZone: string | null,
  nowTick: number
) {
  if (!timeZone || !item.startTime) {
    return "neutral" as const;
  }

  const startDate = toLocalDateTime(date, item.startTime, timeZone);
  const fallbackEnd = item.endTime
    ? toLocalDateTime(date, item.endTime, timeZone)
    : new Date(startDate.getTime() + 30 * 60_000);

  if (nowTick > fallbackEnd.getTime()) {
    return "completed" as const;
  }

  if (nowTick >= startDate.getTime() && nowTick <= fallbackEnd.getTime()) {
    return "current" as const;
  }

  return "upcoming" as const;
}

function buildTimelineItems(
  show: ImportedShowFolder,
  locale: Locale
) {
  const items: TimelineItem[] = [];

  if (show.travelInfo.departureTime) {
    items.push({
      id: "departure",
      type: "departure",
      label: t(locale, "Départ", "Departure"),
      startTime: show.travelInfo.departureTime,
      endTime: "",
      responsible: t(locale, "Équipe route", "Travel team"),
      notes: show.travelInfo.travelNotes,
      durationLabel: null,
      icon: "🚐"
    });
  }

  if (show.travelInfo.arrivalTime) {
    items.push({
      id: "arrival",
      type: "arrival",
      label: t(locale, "Arrivée venue", "Venue arrival"),
      startTime: show.travelInfo.arrivalTime,
      endTime: "",
      responsible: t(locale, "Accès parking / dock", "Parking / dock access"),
      notes: show.dayOfShowInfo.parkingInfo,
      durationLabel: null,
      icon: "📍"
    });
  }

  show.runningOrder.forEach((entry) => {
    items.push({
      id: entry.id,
      type:
        entry.type === "headliner" ? "show" : (entry.type as TimelineItem["type"]),
      label:
        entry.artistName || getRunningOrderFallbackLabel(locale, entry.type),
      startTime: entry.startTime,
      endTime: entry.endTime,
      responsible: getRunningOrderResponsible(locale, entry),
      notes: entry.notes,
      durationLabel: formatDurationLabel(entry.startTime, entry.endTime),
      icon: getRunningOrderIcon(entry.type)
    });
  });

  if (show.dayOfShowInfo.settlementTime) {
    items.push({
      id: "settlement",
      type: "settlement",
      label: t(locale, "Settlement", "Settlement"),
      startTime: show.dayOfShowInfo.settlementTime,
      endTime: "",
      responsible: t(locale, "Tour / prod", "Tour / production"),
      notes: "",
      durationLabel: null,
      icon: "💷"
    });
  }

  if (show.travelInfo.hotelCheckIn) {
    items.push({
      id: "hotel-check-in",
      type: "hotel",
      label: t(locale, "Check-in hôtel", "Hotel check-in"),
      startTime: show.travelInfo.hotelCheckIn,
      endTime: "",
      responsible: show.travelInfo.hotelName || t(locale, "Hôtel", "Hotel"),
      notes: show.travelInfo.hotelAddress,
      durationLabel: null,
      icon: "🏨"
    });
  }

  return items.sort((left, right) => left.startTime.localeCompare(right.startTime));
}

function getRunningOrderFallbackLabel(
  locale: Locale,
  type: ShowRunningOrderEntry["type"]
) {
  const labels: Record<ShowRunningOrderEntry["type"], [string, string]> = {
    headliner: ["Headliner", "Headliner"],
    support: ["Support", "Support"],
    "local support": ["Support local", "Local support"],
    changeover: ["Changeover", "Changeover"],
    doors: ["Doors", "Doors"],
    curfew: ["Curfew", "Curfew"],
    "load-in": ["Load-in", "Load-in"],
    soundcheck: ["Soundcheck", "Soundcheck"]
  };

  const [fr, en] = labels[type];
  return t(locale, fr, en);
}

function getRunningOrderResponsible(
  locale: Locale,
  entry: ShowRunningOrderEntry
) {
  switch (entry.type) {
    case "load-in":
      return t(locale, "Tout le monde", "All crew");
    case "soundcheck":
      return t(locale, "Tous les membres", "All members");
    case "doors":
      return t(locale, "Salle / billetterie", "Venue / ticketing");
    case "curfew":
      return t(locale, "Venue ops", "Venue ops");
    default:
      return t(locale, "Production", "Production");
  }
}

function getRunningOrderIcon(type: ShowRunningOrderEntry["type"]) {
  switch (type) {
    case "load-in":
      return "🟠";
    case "soundcheck":
      return "🟣";
    case "doors":
      return "🟢";
    case "headliner":
      return "🔴";
    case "support":
    case "local support":
      return "🔵";
    case "changeover":
      return "⚫";
    case "curfew":
      return "⚪";
    default:
      return "•";
  }
}

function getTourShowNumber(
  show: ImportedShowFolder,
  shows: ImportedShowFolder[]
) {
  if (show.isStandalone) {
    return 1;
  }

  const sameTour = shows
    .filter((entry) => entry.tourName === show.tourName && !entry.isStandalone)
    .sort((left, right) => {
      if (left.date === right.date) {
        return left.importOrder - right.importOrder;
      }

      return left.date.localeCompare(right.date);
    });

  return Math.max(
    1,
    sameTour.findIndex((entry) => entry.id === show.id) + 1
  );
}

function getPrimaryContactRole(role: string, locale: Locale) {
  const normalized = role.trim().toLowerCase();

  if (normalized.includes("promoter")) {
    return t(locale, "Promoteur", "Promoter");
  }

  if (normalized.includes("production")) {
    return t(locale, "Production", "Production");
  }

  if (normalized.includes("stage")) {
    return t(locale, "Stage manager", "Stage manager");
  }

  if (normalized.includes("security")) {
    return t(locale, "Sécurité", "Security");
  }

  if (normalized.includes("merch")) {
    return t(locale, "Merch", "Merch");
  }

  if (normalized.includes("driver") || normalized.includes("chauff")) {
    return t(locale, "Chauffeur", "Driver");
  }

  return t(locale, "Venue contact", "Venue contact");
}

function groupContactRole(role: string) {
  const normalized = role.trim().toLowerCase();

  if (normalized.includes("security")) {
    return "security";
  }

  if (normalized.includes("driver") || normalized.includes("chauff")) {
    return "drivers";
  }

  if (normalized.includes("merch")) {
    return "merch";
  }

  if (
    normalized.includes("production") ||
    normalized.includes("stage") ||
    normalized.includes("tour")
  ) {
    return "production";
  }

  return "venue";
}

function getContactGroupLabel(group: string, locale: Locale) {
  if (group === "security") {
    return t(locale, "Sécurité", "Security");
  }

  if (group === "drivers") {
    return t(locale, "Drivers", "Drivers");
  }

  if (group === "merch") {
    return t(locale, "Merch", "Merch");
  }

  if (group === "production") {
    return t(locale, "Production", "Production");
  }

  return t(locale, "Venue", "Venue");
}

function filterRelevantDocuments(
  show: ImportedShowFolder,
  documents: UploadedDocumentEntry[]
) {
  const venueName = show.folderName.trim().toLowerCase();
  return documents.filter((document) => {
    const sameTour = document.tour === show.tourName;
    const sameShowId = document.showId === show.id;
    const sameShow =
      document.show === show.folderName ||
      document.show === show.venue ||
      document.subject.trim().toLowerCase() === venueName;

    const isTourWideDocument = sameTour && document.show === "-" && !document.showId;

    return sameShowId || sameShow || isTourWideDocument;
  });
}

function getProductionDocumentLabel(
  locale: Locale,
  document: Pick<UploadedDocumentEntry, "category" | "subject">
) {
  if (document.category === "Stage Plot") {
    return t(locale, "Stage plot", "Stage plot");
  }

  if (document.category === "Input List") {
    return t(locale, "Input list", "Input list");
  }

  switch (document.subject) {
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

function getSetlistLineLabel(entry: ShowSetlistEntry) {
  return [entry.tuning, entry.tempo]
    .filter(Boolean)
    .join(" • ");
}

function getGearStatusTone(item: ShowGearChecklistItem) {
  switch (item.status) {
    case "loaded":
      return "success" as const;
    case "missing":
    case "damaged":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function buildOpsAlerts(params: {
  locale: Locale;
  warning: string | null;
  show: ImportedShowFolder;
  guestlistEntries: ShowGuestlistEntry[];
  guestlistCapacity: number | null;
  documentsCount: number;
}) {
  const alerts: string[] = [];

  if (params.warning) {
    alerts.push(params.warning);
  }

  if (
    typeof params.guestlistCapacity === "number" &&
    params.guestlistEntries.reduce((sum, entry) => sum + entry.spots, 0) >
      params.guestlistCapacity
  ) {
    alerts.push(
      t(
        params.locale,
        "La guestlist dépasse la capacité prévue pour la date.",
        "Guestlist is over the planned capacity for this show."
      )
    );
  }

  if (params.show.status === "local support needed") {
    alerts.push(
      t(
        params.locale,
        "Le support local n'est pas encore entièrement verrouillé.",
        "Local support is not fully locked yet."
      )
    );
  }

  if (!params.documentsCount) {
    alerts.push(
      t(
        params.locale,
        "Aucun document show-specific n'est rattaché à cette date.",
        "No show-specific document is attached to this date."
      )
    );
  }

  return alerts;
}

export function PremiumDaySheet({
  show,
  locale,
  currency,
  workspaceName,
  workspaceLogo,
  printMode = false,
  onPrintReady,
  ticketingMetrics,
  ticketingSourceCurrency
}: PremiumDaySheetProps) {
  const importedShowFolders = useBandosUIStore((state) => state.importedShowFolders);
  const teamRoster = useBandosUIStore((state) => state.teamRoster);
  const merchCatalog = useBandosUIStore((state) => state.merchCatalog);
  const uploadedDocuments = useBandosUIStore((state) => state.uploadedDocuments);
  const [opsContext, setOpsContext] = useState<OpsContext | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [opsResolved, setOpsResolved] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOpsContext() {
      setOpsLoading(true);
      setOpsError(null);
      setOpsResolved(false);

      try {
        const response = await fetch("/api/day-sheet/ops-context", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            address: show.address,
            city: show.city,
            country: show.country,
            venue: show.venue,
            locale
          })
        });

        const payload = (await response.json().catch(() => null)) as
          | { context?: OpsContext | null; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load ops context.");
        }

        if (!cancelled) {
          setOpsContext(payload?.context ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setOpsError(
            error instanceof Error ? error.message : "Unable to load ops context."
          );
        }
      } finally {
        if (!cancelled) {
          setOpsLoading(false);
          setOpsResolved(true);
        }
      }
    }

    void loadOpsContext();

    return () => {
      cancelled = true;
    };
  }, [locale, show.address, show.city, show.country, show.venue]);

  useEffect(() => {
    if (onPrintReady && opsResolved) {
      onPrintReady();
    }
  }, [onPrintReady, opsResolved]);

  const timelineItems = useMemo(
    () => buildTimelineItems(show, locale),
    [locale, show]
  );
  const showNumber = useMemo(
    () => getTourShowNumber(show, importedShowFolders),
    [importedShowFolders, show]
  );
  const primaryContact = show.venueContacts[0] ?? null;
  const loadInTime = useMemo(
    () =>
      show.runningOrder.find((entry) => entry.type === "load-in")?.startTime ?? "",
    [show.runningOrder]
  );
  const curfewTime = useMemo(
    () =>
      show.runningOrder.find((entry) => entry.type === "curfew")?.startTime ?? "",
    [show.runningOrder]
  );
  const relevantDocuments = useMemo(
    () => filterRelevantDocuments(show, uploadedDocuments),
    [show, uploadedDocuments]
  );
  const stagePlotDocuments = useMemo(
    () => relevantDocuments.filter((document) => document.category === "Stage Plot"),
    [relevantDocuments]
  );
  const inputListDocuments = useMemo(
    () => relevantDocuments.filter((document) => document.category === "Input List"),
    [relevantDocuments]
  );
  const venuePhotoDocuments = useMemo(
    () => relevantDocuments.filter((document) => document.category === "Venue Photo"),
    [relevantDocuments]
  );
  const merchLowStock = useMemo(
    () => merchCatalog.filter((item) => item.alert).slice(0, 3),
    [merchCatalog]
  );
  const soundEngineerName = useMemo(() => {
    if (!show.soundEngineerId) {
      return null;
    }

    return (
      teamRoster.find((member) => member.id === show.soundEngineerId)?.name ?? null
    );
  }, [show.soundEngineerId, teamRoster]);
  const nightCosts = (show.roomHire ?? 0) + (show.soundEngineerCost ?? 0) +
    show.localSupportActs.reduce((sum, act) => sum + (act.fee ?? 0), 0);
  const setlistTotalDuration = useMemo(
    () => getSetlistTotalDuration(show.setlistEntries),
    [show.setlistEntries]
  );
  const gearSummary = useMemo(
    () => getGearChecklistSummary(show.gearChecklistItems),
    [show.gearChecklistItems]
  );
  const venueQuery = buildMapsQuery(show.address, show.city, show.country);
  const hotelQuery = buildMapsQuery(
    show.travelInfo.hotelAddress,
    show.travelInfo.hotelName,
    show.city,
    show.country
  );
  const parkingQuery = buildMapsQuery(
    show.dayOfShowInfo.parkingInfo,
    show.address,
    show.city,
    show.country
  );
  const hospitalQuery = buildMapsQuery(
    `hospital ${show.city}`.trim(),
    show.city,
    show.country
  );
  const pharmacyQuery = buildMapsQuery(
    `pharmacy ${show.city}`.trim(),
    show.city,
    show.country
  );
  const countryGuide = getCountryGuide(show.country, locale, show.tourCurrency);
  const opsAlerts = buildOpsAlerts({
    locale,
    warning: opsContext?.warning ?? null,
    show,
    guestlistEntries: show.guestlistEntries,
    guestlistCapacity: show.guestlistCapacity,
    documentsCount: relevantDocuments.length
  });
  const localTimeLabel = formatTimeInZone(
    opsContext?.timezone,
    locale,
    nowTick
  );
  const loadInCountdown =
    opsContext?.timezone && loadInTime
      ? formatCountdown(show.date, loadInTime, opsContext.timezone, locale, nowTick)
      : t(locale, "Load-in non calé", "Load-in not set");
  const openMapButtons = [
    {
      label: "Google Maps",
      href: buildGoogleMapsLink(venueQuery),
      visible: Boolean(venueQuery)
    },
    {
      label: "Apple Maps",
      href: buildAppleMapsLink(venueQuery),
      visible: Boolean(venueQuery)
    },
    {
      label: t(locale, "OpenStreetMap", "OpenStreetMap"),
      href: buildOpenStreetMapLink(venueQuery),
      visible: Boolean(venueQuery)
    }
  ].filter((entry) => entry.visible);
  const timelineWithState = timelineItems.map((item) => ({
    ...item,
    state: getTimelineState(item, show.date, opsContext?.timezone ?? null, nowTick)
  }));
  const activeTimelineItem =
    timelineWithState.find((item) => item.state === "current") ??
    timelineWithState.find((item) => item.state === "upcoming") ??
    null;
  const groupedContacts = Array.from(
    show.venueContacts.reduce((groups, contact) => {
      const key = groupContactRole(contact.role);
      const currentGroup = groups.get(key) ?? [];
      currentGroup.push(contact);
      groups.set(key, currentGroup);
      return groups;
    }, new Map<string, typeof show.venueContacts>())
  );

  return (
    <div className="space-y-4" data-day-sheet-root="true" data-print-mode={printMode ? "true" : "false"}>
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,94,74,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">
                {show.isStandalone
                  ? t(locale, "Date unique", "Single date")
                  : show.tourName}
              </Badge>
              <Badge>
                {t(
                  locale,
                  `Show #${String(showNumber).padStart(2, "0")}`,
                  `Show #${String(showNumber).padStart(2, "0")}`
                )}
              </Badge>
              <Badge>{formatLongDate(show.date, locale, opsContext?.timezone)}</Badge>
            </div>

            <div className="flex flex-wrap items-start gap-4">
              <WorkspaceLogo
                src={workspaceLogo}
                alt={`${workspaceName} logo`}
                size="lg"
                priority
              />
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.28em] text-mist-300">
                  {workspaceName}
                </p>
                <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-mist-50 xl:text-5xl">
                  {show.city || show.venue}
                </h2>
                <p className="text-base text-mist-200 xl:text-lg">
                  {[show.country, show.venue].filter(Boolean).join(" • ")}
                </p>
                <p className="max-w-3xl text-sm leading-7 text-mist-300">
                  {show.address || t(locale, "Adresse salle non renseignée.", "Venue address not set.")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[24px] border border-white/10 bg-black/25 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Heure locale", "Local time")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-mist-50">{localTimeLabel}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/25 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Météo", "Weather")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-mist-50">
                  {opsContext?.temperature != null ? `${Math.round(opsContext.temperature)}°C` : "—"}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {getWeatherLabel(locale, opsContext?.weatherCode ?? null)}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/25 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Sunset", "Sunset")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-mist-50">
                  {formatShortTime(opsContext?.sunset)}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/25 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Curfew", "Curfew")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-mist-50">
                  {curfewTime || "—"}
                </p>
              </div>
              <div className="rounded-[24px] border border-coral-400/20 bg-coral-500/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-coral-200">
                  {t(locale, "Load-in dans", "Load-in in")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {loadInCountdown}
                </p>
              </div>
            </div>
          </div>

          <div className="grid w-full gap-3 xl:max-w-[320px]">
            <div className="rounded-[28px] border border-white/10 bg-black/30 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-coral-300" />
                <div>
                  <p className="text-sm font-medium text-mist-50">
                    {t(locale, "Où sommes-nous ?", "Where are we?")}
                  </p>
                  <p className="mt-1 text-sm text-mist-300">
                    {show.venue} • {show.city}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-black/30 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-coral-300" />
                <div>
                  <p className="text-sm font-medium text-mist-50">
                    {t(locale, "Quel est le prochain call ?", "What is the next call?")}
                  </p>
                  <p className="mt-1 text-sm text-mist-300">
                    {activeTimelineItem
                      ? `${activeTimelineItem.label} • ${activeTimelineItem.startTime}`
                      : t(locale, "Aucun call saisi", "No call entered")}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-black/30 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-coral-300" />
                <div>
                  <p className="text-sm font-medium text-mist-50">
                    {t(locale, "Qui faut-il joindre ?", "Who do we call?")}
                  </p>
                  <p className="mt-1 text-sm text-mist-300">
                    {primaryContact
                      ? `${primaryContact.name} • ${getPrimaryContactRole(primaryContact.role, locale)}`
                      : t(locale, "Aucun contact prioritaire", "No primary contact")}
                  </p>
                </div>
              </div>
            </div>
            {opsLoading ? (
              <p className="text-sm text-mist-300">
                {t(locale, "Actualisation météo et heure locale…", "Refreshing weather and local time...")}
              </p>
            ) : null}
            {opsError ? <p className="text-sm text-amber-300">{opsError}</p> : null}
          </div>
        </div>
      </Card>

      {opsAlerts.length ? (
        <Card className="border-amber-400/20 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-amber-300" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-100">
                {t(locale, "Alertes opérationnelles", "Operational alerts")}
              </p>
              {opsAlerts.map((alert) => (
                <p key={alert} className="text-sm text-amber-50/90">
                  {alert}
                </p>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Live timeline", "Live timeline")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Le déroulé de journée se grise automatiquement une fois passé et surligne l'activité en cours.",
                  "The day timeline fades automatically once completed and highlights the live activity."
                )}
              </p>
            </div>
            {activeTimelineItem ? (
              <Badge tone="accent">
                {t(locale, "En direct", "Live")} • {activeTimelineItem.label}
              </Badge>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            {timelineWithState.length ? (
              timelineWithState.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-[26px] border p-4 transition",
                    item.state === "current"
                      ? "border-coral-400/30 bg-coral-500/12 shadow-card"
                      : item.state === "completed"
                        ? "border-white/5 bg-white/[0.02] opacity-65"
                        : "border-white/8 bg-white/[0.03]"
                  )}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-xl">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-base font-medium text-mist-50">{item.label}</p>
                        <p className="mt-1 text-sm text-mist-200">
                          {item.startTime || "--:--"}
                          {item.endTime ? `–${item.endTime}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-mist-300">{item.responsible}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-left lg:max-w-[280px] lg:text-right">
                      {item.durationLabel ? (
                        <p className="text-sm text-mist-200">{item.durationLabel}</p>
                      ) : null}
                      {item.notes ? (
                        <p className="text-sm text-mist-300">{item.notes}</p>
                      ) : null}
                      {opsContext?.timezone && item.startTime && item.state === "upcoming" ? (
                        <p className="text-xs uppercase tracking-[0.18em] text-coral-200">
                          {t(locale, "Dans", "In")}{" "}
                          {formatCountdown(
                            show.date,
                            item.startTime,
                            opsContext.timezone,
                            locale,
                            nowTick
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title={t(locale, "Aucune timeline pour cette date", "No timeline for this show")}
                body={t(
                  locale,
                  "Renseigne le running order et les départs dans Travel pour transformer la day sheet en déroulé live.",
                  "Fill the running order and travel calls to turn the day sheet into a live timeline."
                )}
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Routing & map", "Routing & map")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Venue, hôtel et accès parking réunis pour ouvrir la navigation sans quitter BandOS.",
                  "Venue, hotel, and parking access in one place to launch navigation without leaving BandOS."
                )}
              </p>
            </div>
            <Route className="h-5 w-5 text-coral-300" />
          </div>

          {opsContext ? (
            <div className="mt-5 overflow-hidden rounded-[24px] border border-white/8">
              <iframe
                title="Venue map"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${opsContext.longitude - 0.02}%2C${opsContext.latitude - 0.02}%2C${opsContext.longitude + 0.02}%2C${opsContext.latitude + 0.02}&layer=mapnik&marker=${opsContext.latitude}%2C${opsContext.longitude}`}
                className="h-[240px] w-full border-0"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title={t(locale, "Carte indisponible", "Map unavailable")}
                body={t(
                  locale,
                  "Ajoute une adresse exploitable pour afficher la carte venue et les raccourcis navigation.",
                  "Add a usable address to display the venue map and navigation shortcuts."
                )}
              />
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {openMapButtons.map((entry) => (
              <a
                key={entry.label}
                href={entry.href}
                target="_blank"
                rel="noreferrer"
              >
                <Button type="button" variant="secondary">
                  <ExternalLink className="h-4 w-4" />
                  {entry.label}
                </Button>
              </a>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Venue", "Venue")}
              </p>
              <p className="mt-2 text-sm text-mist-50">{show.address || "—"}</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Hôtel", "Hotel")}
              </p>
              <p className="mt-2 text-sm text-mist-50">
                {show.travelInfo.hotelName || t(locale, "Hôtel non saisi", "No hotel entered")}
              </p>
              <p className="mt-1 text-sm text-mist-300">
                {show.travelInfo.hotelAddress || "—"}
              </p>
              {hotelQuery ? (
                <a
                  href={buildGoogleMapsLink(hotelQuery)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm text-coral-200 hover:text-coral-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t(locale, "Ouvrir l'hôtel", "Open hotel")}
                </a>
              ) : null}
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Parking / accès", "Parking / access")}
              </p>
              <p className="mt-2 text-sm text-mist-50">
                {show.dayOfShowInfo.parkingInfo || t(locale, "Aucune consigne parking.", "No parking note.")}
              </p>
              {parkingQuery ? (
                <a
                  href={buildGoogleMapsLink(parkingQuery)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm text-coral-200 hover:text-coral-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t(locale, "GPS parking", "Parking GPS")}
                </a>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="flex items-center gap-3">
            <CloudSun className="h-5 w-5 text-coral-300" />
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Weather & daylight", "Weather & daylight")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Météo live, vent, humidité, UV et forecast horaire pour préparer la journée.",
                  "Live weather, wind, humidity, UV, and hourly forecast to prepare the day."
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                {getWeatherTone(opsContext?.weatherCode ?? null) === "warning" ? (
                  <CloudRain className="h-5 w-5 text-amber-300" />
                ) : (
                  <CloudSun className="h-5 w-5 text-coral-300" />
                )}
                <p className="text-sm font-medium text-mist-50">
                  {getWeatherLabel(locale, opsContext?.weatherCode ?? null)}
                </p>
              </div>
              <p className="mt-3 text-3xl font-semibold text-mist-50">
                {opsContext?.temperature != null ? `${Math.round(opsContext.temperature)}°C` : "—"}
              </p>
              <p className="mt-1 text-sm text-mist-300">
                {opsContext?.apparentTemperature != null
                  ? t(
                      locale,
                      `Ressenti ${Math.round(opsContext.apparentTemperature)}°C`,
                      `Feels like ${Math.round(opsContext.apparentTemperature)}°C`
                    )
                  : "—"}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-2 text-sm text-mist-200">
                    <Wind className="h-4 w-4 text-coral-300" />
                    {t(locale, "Vent", "Wind")}
                  </p>
                  <p className="mt-2 text-sm text-mist-50">
                    {opsContext?.windSpeed != null ? `${Math.round(opsContext.windSpeed)} km/h` : "—"}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm text-mist-200">
                    <CloudRain className="h-4 w-4 text-coral-300" />
                    {t(locale, "Pluie", "Rain")}
                  </p>
                  <p className="mt-2 text-sm text-mist-50">
                    {opsContext?.rainProbability != null ? `${Math.round(opsContext.rainProbability)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm text-mist-200">
                    <Sunrise className="h-4 w-4 text-coral-300" />
                    Sunrise
                  </p>
                  <p className="mt-2 text-sm text-mist-50">{formatShortTime(opsContext?.sunrise)}</p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm text-mist-200">
                    <Sunset className="h-4 w-4 text-coral-300" />
                    Sunset
                  </p>
                  <p className="mt-2 text-sm text-mist-50">{formatShortTime(opsContext?.sunset)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-4 xl:grid-cols-6">
            {opsContext?.hourlyForecast.length ? (
              opsContext.hourlyForecast.slice(0, 6).map((entry) => (
                <div
                  key={entry.time}
                  className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-mist-300">
                    {formatShortTime(entry.time)}
                  </p>
                  <p className="mt-2 text-sm font-medium text-mist-50">
                    {entry.temperature != null ? `${Math.round(entry.temperature)}°` : "—"}
                  </p>
                  <p className="mt-1 text-xs text-mist-300">
                    {entry.precipitationProbability != null
                      ? `${Math.round(entry.precipitationProbability)}%`
                      : "—"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-mist-300">
                {t(locale, "Forecast horaire indisponible.", "Hourly forecast unavailable.")}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-coral-300" />
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Contact directory", "Contact directory")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Appel, SMS, WhatsApp et email en un clic pour la prod, la salle, le merch et les drivers.",
                  "One-tap call, SMS, WhatsApp, and email for production, venue, merch, and drivers."
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {groupedContacts.length ? (
              groupedContacts.map(([group, contacts]) => (
                <div key={group} className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                    {getContactGroupLabel(group, locale)}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
                      >
                        <p className="text-base font-medium text-mist-50">
                          {contact.name || "—"}
                        </p>
                        <p className="mt-1 text-sm text-mist-300">
                          {contact.role || t(locale, "Contact", "Contact")}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {contact.phone ? (
                            <>
                              <a href={`tel:${normalizePhone(contact.phone)}`}>
                                <Button type="button" variant="secondary">
                                  <Phone className="h-4 w-4" />
                                  Call
                                </Button>
                              </a>
                              <a href={`sms:${normalizePhone(contact.phone)}`}>
                                <Button type="button" variant="secondary">
                                  <MessageCircle className="h-4 w-4" />
                                  SMS
                                </Button>
                              </a>
                              <a
                                href={`https://wa.me/${normalizeWhatsappPhone(contact.phone)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Button type="button" variant="secondary">
                                  <MessageCircle className="h-4 w-4" />
                                  WhatsApp
                                </Button>
                              </a>
                            </>
                          ) : null}
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`}>
                              <Button type="button" variant="secondary">
                                <Mail className="h-4 w-4" />
                                Email
                              </Button>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title={t(locale, "Aucun contact saisi", "No contact entered")}
                body={t(
                  locale,
                  "Ajoute des contacts dans l'onglet Contacts pour transformer la day sheet en vrai centre d'appel tournée.",
                  "Add contacts in the Contacts tab to turn the day sheet into a real tour call center."
                )}
              />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-coral-300" />
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Venue info", "Venue info")}
            </p>
          </div>
          <div className="mt-5 space-y-3 text-sm text-mist-200">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Venue", "Venue")}
              </p>
              <p className="mt-1">{show.venue}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Adresse", "Address")}
              </p>
              <p className="mt-1">{show.address || "—"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                  {t(locale, "Jauge", "Capacity")}
                </p>
                <p className="mt-1">
                  {show.capacity ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                  Curfew
                </p>
                <p className="mt-1">{curfewTime || "—"}</p>
              </div>
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-mist-300">
                  <Wifi className="h-3.5 w-3.5" />
                  WiFi
                </p>
                <p className="mt-1">{show.dayOfShowInfo.wifi || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                  {t(locale, "Accès parking", "Parking access")}
                </p>
                <p className="mt-1">{show.dayOfShowInfo.parkingInfo || "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Backstage / dressing", "Backstage / dressing")}
              </p>
              <p className="mt-1">
                {show.dayOfShowInfo.dressingRoomInfo || "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Hotel className="h-5 w-5 text-coral-300" />
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Travel / hotel / hospitality", "Travel / hotel / hospitality")}
            </p>
          </div>
          <div className="mt-5 space-y-3 text-sm text-mist-200">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Routing", "Routing")}
              </p>
              <p className="mt-1">
                {[show.travelInfo.departureTime, show.travelInfo.arrivalTime]
                  .filter(Boolean)
                  .join(" → ") || "—"}
              </p>
              <p className="mt-1 text-mist-300">{show.travelInfo.travelNotes || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Hôtel", "Hotel")}
              </p>
              <p className="mt-1">{show.travelInfo.hotelName || "—"}</p>
              <p className="mt-1 text-mist-300">
                {[show.travelInfo.hotelAddress, show.travelInfo.hotelRooms]
                  .filter(Boolean)
                  .join(" • ") || "—"}
              </p>
              <p className="mt-1 text-mist-300">
                {[show.travelInfo.hotelCheckIn, show.travelInfo.hotelCheckOut]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Hospitality", "Hospitality")}
              </p>
              <p className="mt-1">{show.dayOfShowInfo.hospitalityInfo || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Douane / border", "Customs / border")}
              </p>
              <p className="mt-1">{show.travelInfo.borderNotes || "—"}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-coral-300" />
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Merch / finances", "Merch / finances")}
            </p>
          </div>
          <div className="mt-5 space-y-4">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                Merch
              </p>
              <p className="mt-2 text-sm text-mist-50">
                {show.merchSetup.sellerName || t(locale, "Aucun vendeur assigné", "No merch seller assigned")}
              </p>
              <p className="mt-1 text-sm text-mist-300">
                {show.merchSetup.tableLocation || t(locale, "Emplacement table à définir", "Table location to define")}
              </p>
              <p className="mt-1 text-sm text-mist-300">
                {show.merchSetup.cutPercent != null
                  ? `${show.merchSetup.cutPercent}% merch cut`
                  : t(locale, "Merch cut non renseigné", "Merch cut not set")}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Économie de la date", "Show economics")}
              </p>
              <div className="mt-3 space-y-2 text-sm text-mist-50">
                <p>
                  {t(locale, "Cachet", "Guarantee")} •{" "}
                  {show.showFee != null
                    ? formatCurrency(show.showFee, currency, "GBP")
                    : "—"}
                </p>
                <p>
                  {t(locale, "Coûts fixes", "Fixed costs")} •{" "}
                  {formatCurrency(nightCosts, currency, "GBP")}
                </p>
                <p>
                  {t(locale, "Ingé son", "Sound engineer")} •{" "}
                  {soundEngineerName || "—"}
                </p>
                <p>
                  {t(locale, "Groupes locaux", "Local acts")} •{" "}
                  {show.localSupportActs.length}
                </p>
                {ticketingMetrics ? (
                  <p>
                    Ticketing •{" "}
                    {formatCurrency(
                      ticketingMetrics.netRevenue,
                      currency,
                      ticketingSourceCurrency
                    )}{" "}
                    net
                  </p>
                ) : null}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Alerte stock", "Stock watch")}
              </p>
              {merchLowStock.length ? (
                <div className="mt-3 space-y-2 text-sm text-mist-50">
                  {merchLowStock.map((item) => (
                    <p key={item.id}>
                      {item.name} • {item.stock} restant(s)
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-mist-300">
                  {t(locale, "Aucune alerte stock immédiate.", "No immediate stock alert.")}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-coral-300" />
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Stage plot / input list", "Stage plot / input list")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Les documents techniques du jour restent consultables sans quitter la day sheet.",
                  "The day's technical documents stay accessible without leaving the day sheet."
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {stagePlotDocuments.length || inputListDocuments.length ? (
              <>
                {[...stagePlotDocuments, ...inputListDocuments].map((document) => (
                  <div
                    key={document.id}
                    className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-mist-50">
                          {document.name}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mist-300">
                          {getProductionDocumentLabel(locale, document)}
                        </p>
                      </div>
                      {document.previewUrl ? (
                        <a href={document.previewUrl} target="_blank" rel="noreferrer">
                          <Button type="button" variant="secondary">
                            <ExternalLink className="h-4 w-4" />
                            {t(locale, "Ouvrir", "Open")}
                          </Button>
                        </a>
                      ) : null}
                    </div>
                    {document.previewUrl && document.mimeType?.startsWith("image/") ? (
                      <div className="mt-4 overflow-hidden rounded-[20px] border border-white/8">
                        <img
                          src={document.previewUrl}
                          alt={document.name}
                          className="max-h-[260px] w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </>
            ) : (
              <EmptyState
                title={t(locale, "Pas encore de pack technique", "No technical pack yet")}
                body={t(
                  locale,
                  "Ajoute stage plot et input list dans la fiche date pour les retrouver ici.",
                  "Add the stage plot and input list in the show workspace to surface them here."
                )}
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Setlist live", "Live setlist")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Vision rapide des morceaux, tunings, tempos, transitions et durée totale du set.",
                  "Quick read on songs, tunings, tempos, transitions, and total set duration."
                )}
              </p>
            </div>
            <Badge tone="accent">
              {show.setlistEntries.length} • {setlistTotalDuration} min
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {show.setlistEntries.length ? (
              show.setlistEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-base font-medium text-mist-50">
                        {String(index + 1).padStart(2, "0")} • {entry.songTitle || "—"}
                      </p>
                      <p className="mt-1 text-sm text-mist-300">
                        {getSetlistLineLabel(entry) || t(locale, "Tempo et tuning non saisis", "Tempo and tuning not entered")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {entry.durationMinutes != null ? <Badge>{entry.durationMinutes} min</Badge> : null}
                      {entry.clickTrack ? (
                        <Badge tone="success">{t(locale, "click", "click")}</Badge>
                      ) : null}
                      {entry.isEncore ? (
                        <Badge tone="accent">{t(locale, "encore", "encore")}</Badge>
                      ) : null}
                    </div>
                  </div>
                  {entry.transitionNotes || entry.notes ? (
                    <div className="mt-3 space-y-2 text-sm text-mist-200">
                      {entry.transitionNotes ? (
                        <p>
                          {t(locale, "Transition", "Transition")} • {entry.transitionNotes}
                        </p>
                      ) : null}
                      {entry.notes ? (
                        <p>
                          {t(locale, "Notes", "Notes")} • {entry.notes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState
                title={t(locale, "Setlist vide", "Setlist is empty")}
                body={t(
                  locale,
                  "Renseigne les morceaux dans la fiche date pour transformer la day sheet en vrai set companion.",
                  "Fill the songs in the show workspace to turn the day sheet into a real set companion."
                )}
              />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Gear checklist", "Gear checklist")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Le statut du matos critique pour le load-in, la scène et le load-out.",
                  "The status of critical gear for load-in, stage, and load-out."
                )}
              </p>
            </div>
            <Badge>
              {gearSummary.loaded}/{gearSummary.total}
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {show.gearChecklistItems.length ? (
              show.gearChecklistItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-mist-50">
                        {item.itemName || "—"}
                      </p>
                      <p className="mt-1 text-sm text-mist-300">
                        {item.category} • {item.quantity}x
                      </p>
                    </div>
                    <Badge tone={getGearStatusTone(item)}>{item.status}</Badge>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-mist-200">
                    {item.serialNumber ? <p>Serial • {item.serialNumber}</p> : null}
                    {item.qrLabel ? <p>QR • {item.qrLabel}</p> : null}
                    {item.notes ? <p>{item.notes}</p> : null}
                  </div>
                  {item.photoUrl ? (
                    <div className="mt-3 overflow-hidden rounded-[18px] border border-white/8">
                      <img
                        src={item.photoUrl}
                        alt={item.itemName || item.category}
                        className="h-28 w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState
                title={t(locale, "Aucune checklist matos", "No gear checklist yet")}
                body={t(
                  locale,
                  "Ajoute les pièces importantes depuis la fiche date pour les voir ici.",
                  "Add the important pieces in the show workspace to see them here."
                )}
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-coral-300" />
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Emergency / local ops", "Emergency / local ops")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Raccourcis rapides pour hôpital, pharmacie et infos essentielles du pays.",
                  "Fast shortcuts for hospital, pharmacy, and essential country-level info."
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm text-mist-200">
              <p>{t(locale, "Urgence", "Emergency")} • {countryGuide.emergency}</p>
              <p className="mt-2">{t(locale, "Langue", "Language")} • {countryGuide.language}</p>
              <p className="mt-2">{t(locale, "Devise locale", "Local currency")} • {countryGuide.localCurrency}</p>
              <p className="mt-2">{t(locale, "Prises", "Power outlets")} • {countryGuide.outlets}</p>
              <p className="mt-2">{t(locale, "Voltage", "Voltage")} • {countryGuide.voltage}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {hospitalQuery ? (
                <a href={buildGoogleMapsLink(hospitalQuery)} target="_blank" rel="noreferrer">
                  <Button type="button" variant="secondary">
                    <ExternalLink className="h-4 w-4" />
                    {t(locale, "Hôpital proche", "Nearby hospital")}
                  </Button>
                </a>
              ) : null}
              {pharmacyQuery ? (
                <a href={buildGoogleMapsLink(pharmacyQuery)} target="_blank" rel="noreferrer">
                  <Button type="button" variant="secondary">
                    <ExternalLink className="h-4 w-4" />
                    {t(locale, "Pharmacie", "Pharmacy")}
                  </Button>
                </a>
              ) : null}
              {parkingQuery ? (
                <a href={buildGoogleMapsLink(parkingQuery)} target="_blank" rel="noreferrer">
                  <Button type="button" variant="secondary">
                    <ExternalLink className="h-4 w-4" />
                    {t(locale, "Parking", "Parking")}
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-coral-300" />
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Flyer", "Flyer")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Le visuel officiel de la date, prêt pour l'impression et le partage crew.",
                  "The official show visual, ready for print and crew sharing."
                )}
              </p>
            </div>
          </div>

          {show.posterOverride ? (
            <div className="mt-5 overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03]">
              <img
                src={show.posterOverride}
                alt={t(locale, "Flyer de la date", "Show flyer")}
                className="max-h-[520px] w-full object-cover"
              />
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title={t(locale, "Aucun flyer", "No flyer yet")}
                body={t(
                  locale,
                  "Ajoute le flyer depuis la fiche date pour qu'il apparaisse dans la day sheet.",
                  "Add the flyer from the show workspace so it appears in the day sheet."
                )}
              />
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Photo gallery", "Photo gallery")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Repères visuels du lieu pour le van, le loading dock, la scène et le backstage.",
                  "Visual anchors for the van, loading dock, stage, and backstage."
                )}
              </p>
            </div>
            <Badge>{venuePhotoDocuments.length}</Badge>
          </div>

          {venuePhotoDocuments.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {venuePhotoDocuments.map((document) => (
                <div
                  key={document.id}
                  className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03]"
                >
                  {document.previewUrl ? (
                    <img
                      src={document.previewUrl}
                      alt={document.name}
                      className="h-32 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-black/15 text-sm text-mist-300">
                      {document.name}
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <p className="truncate text-sm font-medium text-mist-50">
                      {document.name}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mist-300">
                      {getProductionDocumentLabel(locale, document)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title={t(locale, "Galerie vide", "Gallery is empty")}
                body={t(
                  locale,
                  "Ajoute des photos de la salle depuis la fiche date pour les retrouver ici.",
                  "Add venue photos from the show workspace to find them here."
                )}
              />
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-coral-300" />
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Documents & local info", "Documents & local info")}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Documents liés", "Linked documents")}
              </p>
              {relevantDocuments.length ? (
                <div className="mt-3 space-y-2">
                  {relevantDocuments.slice(0, 6).map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/15 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm text-mist-50">{document.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mist-300">
                          {document.category}
                        </p>
                      </div>
                      {document.previewUrl ? (
                        <a
                          href={document.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-coral-200 hover:text-coral-100"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {t(locale, "Ouvrir", "Open")}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-mist-300">
                  {t(locale, "Aucun document rattaché à cette date.", "No document attached to this show.")}
                </p>
              )}
            </div>

            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                {t(locale, "Infos locales", "Local info")}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-mist-50">
                <p>{t(locale, "Devise locale", "Local currency")} • {countryGuide.localCurrency}</p>
                <p>{t(locale, "Langue", "Language")} • {countryGuide.language}</p>
                <p>{t(locale, "Prises", "Power outlets")} • {countryGuide.outlets}</p>
                <p>{t(locale, "Voltage", "Voltage")} • {countryGuide.voltage}</p>
                <p>{t(locale, "Urgence", "Emergency")} • {countryGuide.emergency}</p>
                <p>{t(locale, "Capacité", "Capacity")} • {show.capacity ?? "—"}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Ticket className="h-5 w-5 text-coral-300" />
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Guestlist / ticketing / notes", "Guestlist / ticketing / notes")}
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                Guestlist
              </p>
              <p className="mt-2 text-2xl font-semibold text-mist-50">
                {show.guestlistEntries.reduce((sum, entry) => sum + entry.spots, 0)}
                {typeof show.guestlistCapacity === "number"
                  ? ` / ${show.guestlistCapacity}`
                  : ""}
              </p>
              <div className="mt-3 space-y-2 text-sm text-mist-300">
                {show.guestlistEntries.slice(0, 5).map((entry) => (
                  <p key={entry.id}>
                    {entry.name || "—"} • {entry.spots}
                  </p>
                ))}
                {!show.guestlistEntries.length ? (
                  <p>{t(locale, "Guestlist vide.", "Guestlist empty.")}</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                Ticketing
              </p>
              <p className="mt-2 text-2xl font-semibold text-mist-50">
                {ticketingMetrics
                  ? `${ticketingMetrics.ticketsSold}`
                  : "—"}
              </p>
              <div className="mt-3 space-y-2 text-sm text-mist-300">
                <p>
                  {t(locale, "Tickets vendus", "Tickets sold")} •{" "}
                  {ticketingMetrics?.ticketsSold ?? 0}
                </p>
                <p>
                  Net •{" "}
                  {ticketingMetrics
                    ? formatCurrency(
                        ticketingMetrics.netRevenue,
                        currency,
                        ticketingSourceCurrency
                      )
                    : "—"}
                </p>
                <p>
                  {t(locale, "Refunds", "Refunds")} •{" "}
                  {ticketingMetrics?.refundCount ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
              {t(locale, "Notes de prod", "Production notes")}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-mist-200">
              {show.daySheetNotes || show.notes || show.dayOfShowInfo.notes || t(locale, "Aucune note de prod pour l'instant.", "No production note yet.")}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
