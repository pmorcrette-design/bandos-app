"use client";

import {
  CalendarDays,
  ClipboardList,
  MapPinned,
  Music4,
  Phone,
  Ticket,
  Truck,
  Users,
  Wallet
} from "lucide-react";

import {
  getAttendanceProjectionMetrics,
  getGearChecklistSummary,
  getGuestlistUsage,
  getImportedShowManualFeeNet,
  getImportedShowNightCosts,
  getSetlistTotalDuration
} from "@/lib/shows";
import { t, translateShowStatus, type Locale } from "@/lib/i18n";
import {
  formatCurrency,
  supportedCurrencyMeta,
  type SupportedCurrency
} from "@/lib/utils";
import type {
  ImportedShowFolder,
  ShowRunningOrderEntry,
  UploadedDocumentEntry
} from "@/lib/workspace-data";

type TicketingMetrics = {
  grossRevenue: number;
  netRevenue: number;
  fees: number;
  ticketsSold: number;
  capacitySoldPercentage: number | null;
  averageTicketPrice: number | null;
  guestlistCount: number;
  refundCount: number;
} | null;

type DaySheetPrintDocumentProps = {
  show: ImportedShowFolder;
  locale: Locale;
  currency: SupportedCurrency;
  workspaceName: string;
  workspaceLogo: string;
  soundEngineerName: string | null;
  showDocuments: UploadedDocumentEntry[];
  ticketingMetrics: TicketingMetrics;
  ticketingSourceCurrency: SupportedCurrency;
};

type SheetRow = {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  actor: string;
  duration: string;
  notes: string;
};

function formatLongDate(date: string, locale: Locale) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(date));
}

function formatShortDate(date: string, locale: Locale) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(date));
}

function cleanText(value?: string | null) {
  return value?.trim() || "";
}

function hasContent(value?: string | null) {
  return cleanText(value).length > 0;
}

function formatMaybeCurrency(
  amount: number | null | undefined,
  currency: SupportedCurrency,
  sourceCurrency: SupportedCurrency = "GBP"
) {
  return typeof amount === "number"
    ? formatCurrency(amount, currency, sourceCurrency)
    : "—";
}

function formatRunningOrderType(locale: Locale, type: ShowRunningOrderEntry["type"]) {
  switch (type) {
    case "headliner":
      return t(locale, "Tete d'affiche", "Headliner");
    case "support":
      return t(locale, "Support", "Support");
    case "local support":
      return t(locale, "Support local", "Local support");
    case "changeover":
      return t(locale, "Changeover", "Changeover");
    case "doors":
      return "Doors";
    case "curfew":
      return "Curfew";
    case "load-in":
      return t(locale, "Load-in", "Load-in");
    case "soundcheck":
      return t(locale, "Soundcheck", "Soundcheck");
    default:
      return type;
  }
}

function parseTimeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function sortRunningOrder(entries: ShowRunningOrderEntry[]) {
  return [...entries].sort((left, right) => {
    const leftMinutes = parseTimeToMinutes(left.startTime);
    const rightMinutes = parseTimeToMinutes(right.startTime);

    if (leftMinutes !== null && rightMinutes !== null && leftMinutes !== rightMinutes) {
      return leftMinutes - rightMinutes;
    }

    if (leftMinutes !== null) {
      return -1;
    }

    if (rightMinutes !== null) {
      return 1;
    }

    return left.type.localeCompare(right.type);
  });
}

function buildFallbackRows(show: ImportedShowFolder, locale: Locale): SheetRow[] {
  const entries = [
    {
      id: "fallback-loadin",
      startTime:
        sortRunningOrder(show.runningOrder).find((entry) => entry.type === "load-in")
          ?.startTime || "",
      endTime: "",
      label: t(locale, "Load-in", "Load-in"),
      actor: show.venue || "—",
      duration: "",
      notes: ""
    },
    {
      id: "fallback-soundcheck",
      startTime:
        sortRunningOrder(show.runningOrder).find((entry) => entry.type === "soundcheck")
          ?.startTime || "",
      endTime: "",
      label: t(locale, "Soundcheck", "Soundcheck"),
      actor: soundcheckActor(show, locale),
      duration: "",
      notes: ""
    },
    {
      id: "fallback-doors",
      startTime:
        cleanText(show.dayOfShowInfo.doorsTime) ||
        sortRunningOrder(show.runningOrder).find((entry) => entry.type === "doors")
          ?.startTime ||
        "",
      endTime: "",
      label: "Doors",
      actor: t(locale, "Ouverture public", "Public entry"),
      duration: "",
      notes: ""
    },
    {
      id: "fallback-headliner",
      startTime:
        sortRunningOrder(show.runningOrder).find((entry) => entry.type === "headliner")
          ?.startTime || "",
      endTime:
        sortRunningOrder(show.runningOrder).find((entry) => entry.type === "headliner")
          ?.endTime || "",
      label: t(locale, "Set principal", "Main set"),
      actor: show.folderName,
      duration: "",
      notes: ""
    },
    {
      id: "fallback-curfew",
      startTime:
        sortRunningOrder(show.runningOrder).find((entry) => entry.type === "curfew")
          ?.startTime || "",
      endTime: "",
      label: "Curfew",
      actor: show.venue || "—",
      duration: "",
      notes: ""
    }
  ];

  return entries.filter((entry) => entry.startTime || entry.label);
}

function soundcheckActor(show: ImportedShowFolder, locale: Locale) {
  return show.soundEngineerId
    ? t(locale, "Band + ingé son", "Band + sound engineer")
    : t(locale, "Band", "Band");
}

function buildRunningOrderRows(show: ImportedShowFolder, locale: Locale) {
  const orderedEntries = sortRunningOrder(show.runningOrder);

  if (!orderedEntries.length) {
    return buildFallbackRows(show, locale);
  }

  return orderedEntries.map((entry) => ({
    id: entry.id,
    startTime: cleanText(entry.startTime),
    endTime: cleanText(entry.endTime),
    label: formatRunningOrderType(locale, entry.type),
    actor: cleanText(entry.artistName) || "—",
    duration:
      typeof entry.durationMinutes === "number" && entry.durationMinutes > 0
        ? `${entry.durationMinutes} min`
        : "",
    notes: cleanText(entry.notes)
  }));
}

function getMissingItems(
  show: ImportedShowFolder,
  soundEngineerName: string | null,
  ticketingMetrics: TicketingMetrics,
  locale: Locale
) {
  const missingItems: string[] = [];

  if (!show.address) {
    missingItems.push(t(locale, "Adresse de la salle manquante", "Venue address missing"));
  }

  if (!show.dayOfShowInfo.doorsTime) {
    missingItems.push(t(locale, "Heure des doors manquante", "Doors time missing"));
  }

  if (!show.dayOfShowInfo.parkingInfo) {
    missingItems.push(t(locale, "Infos parking non remplies", "Parking info missing"));
  }

  if (!show.venueContacts.length) {
    missingItems.push(t(locale, "Aucun contact date saisi", "No show contacts entered"));
  }

  if (!soundEngineerName) {
    missingItems.push(t(locale, "Ingé son non assigné", "No sound engineer assigned"));
  }

  if (!ticketingMetrics && show.ticketPrice == null && show.showFee == null) {
    missingItems.push(
      t(
        locale,
        "Aucun revenu saisi: billet, cachet ou ticketing",
        "No income entered: ticket price, guarantee, or ticketing"
      )
    );
  }

  if (!show.posterOverride) {
    missingItems.push(t(locale, "Flyer non ajouté", "Flyer not added"));
  }

  if (!show.daySheetNotes && !show.dayOfShowInfo.notes && !show.notes) {
    missingItems.push(t(locale, "Notes day sheet vides", "Day sheet notes are empty"));
  }

  return missingItems;
}

function buildContactValue(email: string, phone: string) {
  return [cleanText(phone), cleanText(email)].filter(Boolean).join(" • ") || "—";
}

function formatStatusLabel(show: ImportedShowFolder, locale: Locale) {
  return `${translateShowStatus(locale, show.status)} • ${
    show.validated
      ? t(locale, "date validée", "validated show")
      : t(locale, "à compléter", "needs setup")
  }`;
}

function renderParagraphList(values: string[]) {
  return values.join(" • ");
}

function PrintPage({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <section
      data-show-print-page="true"
      className="mx-auto overflow-hidden rounded-[20px] border border-slate-300 bg-white text-slate-950 shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
    >
      {children}
    </section>
  );
}

function SectionBlock({
  icon: Icon,
  title,
  subtitle,
  children
}: {
  icon: typeof CalendarDays;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-slate-300 bg-white">
      <div className="border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-coral-500" />
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-900">
            {title}
          </h2>
        </div>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  note
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-[14px] border border-slate-300 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-none text-slate-950">{value}</p>
      {note ? <p className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

function InfoRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 py-2 last:border-b-0">
      <p className="min-w-[120px] text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="flex-1 text-right text-sm leading-6 text-slate-900">{value || "—"}</p>
    </div>
  );
}

function NotesPanel({
  title,
  text
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[14px] border border-slate-300 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-900">
        {text || "—"}
      </p>
    </div>
  );
}

export function DaySheetPrintDocument({
  show,
  locale,
  currency,
  workspaceName,
  workspaceLogo,
  soundEngineerName,
  showDocuments,
  ticketingMetrics,
  ticketingSourceCurrency
}: DaySheetPrintDocumentProps) {
  const nightCosts = getImportedShowNightCosts(show);
  const manualNet = getImportedShowManualFeeNet(show);
  const localActsTotal = show.localSupportActs.reduce((sum, act) => sum + (act.fee ?? 0), 0);
  const guestlistUsage = getGuestlistUsage(show.guestlistEntries, show.guestlistCapacity);
  const setlistDuration = getSetlistTotalDuration(show.setlistEntries);
  const gearSummary = getGearChecklistSummary(show.gearChecklistItems);
  const projection = getAttendanceProjectionMetrics({
    capacity: show.capacity,
    ticketPrice: show.ticketPrice,
    fixedCosts: nightCosts
  });
  const runningOrderRows = buildRunningOrderRows(show, locale);
  const missingItems = getMissingItems(show, soundEngineerName, ticketingMetrics, locale);
  const compactContacts = show.venueContacts.slice(0, 8);
  const linkedDocuments = showDocuments.slice(0, 10);
  const localActsLabel = show.localSupportActs.length
    ? show.localSupportActs
        .map((act) =>
          act.fee != null
            ? `${act.name} (${formatCurrency(act.fee, currency, "GBP")})`
            : act.name
        )
        .join(" • ")
    : t(locale, "Aucun groupe local assigné", "No local acts assigned");
  const combinedNotes = [cleanText(show.daySheetNotes), cleanText(show.dayOfShowInfo.notes), cleanText(show.notes)]
    .filter(Boolean)
    .join("\n\n");
  const travelLabel = renderParagraphList(
    [
      cleanText(show.travelInfo.departureTime)
        ? `${t(locale, "Départ", "Departure")} ${show.travelInfo.departureTime}`
        : "",
      cleanText(show.travelInfo.arrivalTime)
        ? `${t(locale, "Arrivée", "Arrival")} ${show.travelInfo.arrivalTime}`
        : "",
      cleanText(show.travelInfo.hotelCheckIn)
        ? `${t(locale, "Check-in", "Check-in")} ${show.travelInfo.hotelCheckIn}`
        : "",
      cleanText(show.travelInfo.hotelCheckOut)
        ? `${t(locale, "Check-out", "Check-out")} ${show.travelInfo.hotelCheckOut}`
        : ""
    ].filter(Boolean)
  );

  return (
    <div data-show-print-root="true" className="mx-auto flex max-w-[210mm] flex-col gap-4">
      <PrintPage>
        <div className="border-b border-slate-300 px-8 py-7">
          <div className="flex items-start justify-between gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-slate-300 bg-white">
                <img
                  src={workspaceLogo}
                  alt={`${workspaceName} logo`}
                  className="h-full w-full object-contain p-2"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  <span className="rounded-full border border-slate-300 px-2 py-1">
                    {show.tourName}
                  </span>
                  <span className="rounded-full border border-slate-300 px-2 py-1">
                    {t(locale, "Date", "Show")} #{show.importOrder + 1}
                  </span>
                  <span className="rounded-full border border-slate-300 px-2 py-1">
                    {supportedCurrencyMeta[currency].label} ({supportedCurrencyMeta[currency].symbol})
                  </span>
                </div>

                <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  {workspaceName}
                </p>
                <h1 className="mt-2 text-[34px] font-semibold leading-none tracking-tight text-slate-950">
                  {show.folderName}
                </h1>
                <p className="mt-2 text-lg font-medium text-slate-800">
                  {show.venue} • {[show.city, show.country].filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {show.address || t(locale, "Adresse non renseignée", "Address not entered")}
                </p>
              </div>
            </div>

            <div className="w-[238px] shrink-0 rounded-[18px] border border-slate-300 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-coral-600">
                BandOS Day Sheet
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {formatLongDate(show.date, locale)}
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <span>{t(locale, "Statut", "Status")}</span>
                  <span className="text-right font-medium text-slate-950">
                    {formatStatusLabel(show, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>{t(locale, "Billet", "Ticket")}</span>
                  <span className="font-medium text-slate-950">
                    {formatMaybeCurrency(show.ticketPrice, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>{t(locale, "Cachet", "Guarantee")}</span>
                  <span className="font-medium text-slate-950">
                    {formatMaybeCurrency(show.showFee, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>{t(locale, "Jauge", "Capacity")}</span>
                  <span className="font-medium text-slate-950">
                    {show.capacity != null ? String(show.capacity) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-8 py-6 md:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <SectionBlock
              icon={CalendarDays}
              title={t(locale, "Vue rapide de la date", "Show quick view")}
              subtitle={t(
                locale,
                "Tout ce qu'il faut avoir sous les yeux avant d'arriver sur site.",
                "Everything the crew needs before arriving on site."
              )}
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  label={t(locale, "Coûts fixes", "Fixed costs")}
                  value={formatCurrency(nightCosts, currency, "GBP")}
                />
                <MetricTile
                  label={t(locale, "Net date", "Show net")}
                  value={
                    manualNet != null
                      ? `${manualNet >= 0 ? "+" : "-"}${formatCurrency(
                          Math.abs(manualNet),
                          currency,
                          "GBP"
                        )}`
                      : "—"
                  }
                  note={
                    manualNet != null
                      ? t(locale, "Cachet saisi manuellement", "Based on manual guarantee")
                      : t(locale, "Renseigne un cachet pour calculer le net", "Enter a guarantee to compute net")
                  }
                />
                <MetricTile
                  label={t(locale, "Projection 80%", "80% projection")}
                  value={
                    projection
                      ? `${projection.delta >= 0 ? "+" : "-"}${formatCurrency(
                          Math.abs(projection.delta),
                          currency,
                          "GBP"
                        )}`
                      : "—"
                  }
                  note={
                    projection
                      ? `${projection.projectedAttendance}/${show.capacity} ${t(locale, "billets projetés", "projected tickets")}`
                      : t(locale, "Renseigne jauge + billet", "Enter capacity + ticket price")
                  }
                />
                <MetricTile
                  label={t(locale, "Guestlist", "Guestlist")}
                  value={
                    show.guestlistCapacity != null
                      ? `${guestlistUsage.usedSpots}/${show.guestlistCapacity}`
                      : String(guestlistUsage.usedSpots)
                  }
                  note={
                    guestlistUsage.remainingSpots != null
                      ? t(
                          locale,
                          `${guestlistUsage.remainingSpots} places restantes`,
                          `${guestlistUsage.remainingSpots} spots left`
                        )
                      : t(locale, "Capacité non fixée", "Capacity not set")
                  }
                />
              </div>
            </SectionBlock>

            <SectionBlock
              icon={ClipboardList}
              title={t(locale, "Priorités crew", "Crew priorities")}
              subtitle={t(
                locale,
                "Ce qui manque ou doit être vérifié avant de partir.",
                "What is still missing or must be checked before departure."
              )}
            >
              {missingItems.length ? (
                <ul className="space-y-2 text-sm leading-6 text-slate-900">
                  {missingItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-slate-700">
                  {t(
                    locale,
                    "Les infos critiques de la date sont bien remplies.",
                    "Critical show information is properly filled in."
                  )}
                </p>
              )}
            </SectionBlock>

            <SectionBlock
              icon={CalendarDays}
              title={t(locale, "Chronologie de la soirée", "Show timeline")}
              subtitle={t(
                locale,
                "Version compacte pour suivre la journée sans scroller partout.",
                "Compact operational timeline for the whole day."
              )}
            >
              <div className="overflow-hidden rounded-[14px] border border-slate-300">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-50">
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Début", "Start")}
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Fin", "End")}
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Call", "Call")}
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Qui", "Who")}
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Notes", "Notes")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningOrderRows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-200 last:border-b-0">
                        <td className="px-3 py-2 font-medium text-slate-950">
                          {row.startTime || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.endTime || "—"}</td>
                        <td className="px-3 py-2 text-slate-900">{row.label}</td>
                        <td className="px-3 py-2 text-slate-700">{row.actor || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {[row.duration, row.notes].filter(Boolean).join(" • ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionBlock>

            <SectionBlock
              icon={Phone}
              title={t(locale, "Contacts à appeler", "Key contacts")}
              subtitle={t(
                locale,
                "Les bons numéros à avoir même sans réseau parfait ni batterie.",
                "The right people to reach even when the day gets messy."
              )}
            >
              {compactContacts.length ? (
                <div className="overflow-hidden rounded-[14px] border border-slate-300">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-50">
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {t(locale, "Nom", "Name")}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {t(locale, "Rôle", "Role")}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {t(locale, "Contact", "Contact")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {compactContacts.map((contact) => (
                        <tr key={contact.id} className="border-b border-slate-200 last:border-b-0">
                          <td className="px-3 py-2 font-medium text-slate-950">
                            {contact.name || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{contact.role || "—"}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {buildContactValue(contact.email, contact.phone)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-700">
                  {t(
                    locale,
                    "Aucun contact date saisi pour le moment.",
                    "No show contact entered yet."
                  )}
                </p>
              )}
            </SectionBlock>
          </div>

          <div className="space-y-5">
            <SectionBlock
              icon={Wallet}
              title={t(locale, "Économie de la date", "Show economics")}
              subtitle={t(
                locale,
                "Lecture rapide pour savoir ou la soirée en est financièrement.",
                "Quick financial read for the night."
              )}
            >
              <div className="space-y-1">
                <InfoRow
                  label={t(locale, "Cachet", "Guarantee")}
                  value={formatMaybeCurrency(show.showFee, currency)}
                />
                <InfoRow
                  label={t(locale, "Prix billet", "Ticket price")}
                  value={formatMaybeCurrency(show.ticketPrice, currency)}
                />
                <InfoRow
                  label={t(locale, "Salle", "Room hire")}
                  value={formatMaybeCurrency(show.roomHire, currency)}
                />
                <InfoRow
                  label={t(locale, "Ingé son", "Sound engineer")}
                  value={
                    soundEngineerName
                      ? `${soundEngineerName} • ${formatMaybeCurrency(show.soundEngineerCost, currency)}`
                      : formatMaybeCurrency(show.soundEngineerCost, currency)
                  }
                />
                <InfoRow
                  label={t(locale, "Groupes locaux", "Local acts")}
                  value={`${show.localSupportActs.length} • ${formatCurrency(localActsTotal, currency, "GBP")}`}
                />
                <InfoRow
                  label={t(locale, "Net manuel", "Manual net")}
                  value={
                    manualNet != null
                      ? `${manualNet >= 0 ? "+" : "-"}${formatCurrency(
                          Math.abs(manualNet),
                          currency,
                          "GBP"
                        )}`
                      : "—"
                  }
                />
                <InfoRow
                  label={t(locale, "Seuil équilibre", "Break-even")}
                  value={
                    projection?.breakEvenTickets != null
                      ? `${projection.breakEvenTickets} ${t(locale, "billets", "tickets")}`
                      : "—"
                  }
                />
                <InfoRow
                  label={t(locale, "Projection 80%", "80% projection")}
                  value={
                    projection
                      ? `${projection.projectedAttendance}/${show.capacity} • ${
                          projection.delta >= 0 ? "+" : "-"
                        }${formatCurrency(Math.abs(projection.delta), currency, "GBP")}`
                      : "—"
                  }
                />
              </div>
            </SectionBlock>

            <SectionBlock
              icon={Ticket}
              title={t(locale, "Billetterie & guestlist", "Ticketing & guestlist")}
              subtitle={t(
                locale,
                "Vision claire du remplissage et des flux billetterie.",
                "Clear overview of sell-through and ticketing."
              )}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile
                  label={t(locale, "Vendus", "Sold")}
                  value={ticketingMetrics ? String(ticketingMetrics.ticketsSold) : "—"}
                />
                <MetricTile
                  label={t(locale, "Net ticketing", "Ticketing net")}
                  value={
                    ticketingMetrics
                      ? formatCurrency(
                          ticketingMetrics.netRevenue,
                          currency,
                          ticketingSourceCurrency
                        )
                      : "—"
                  }
                />
                <MetricTile
                  label={t(locale, "Brut ticketing", "Ticketing gross")}
                  value={
                    ticketingMetrics
                      ? formatCurrency(
                          ticketingMetrics.grossRevenue,
                          currency,
                          ticketingSourceCurrency
                        )
                      : "—"
                  }
                />
                <MetricTile
                  label={t(locale, "Frais", "Fees")}
                  value={
                    ticketingMetrics
                      ? formatCurrency(ticketingMetrics.fees, currency, ticketingSourceCurrency)
                      : "—"
                  }
                />
              </div>

              <div className="mt-4 space-y-1">
                <InfoRow
                  label={t(locale, "Taux vendu", "Sold %")}
                  value={
                    ticketingMetrics?.capacitySoldPercentage != null
                      ? `${Math.round(ticketingMetrics.capacitySoldPercentage)}%`
                      : "—"
                  }
                />
                <InfoRow
                  label={t(locale, "Prix moyen", "Average ticket")}
                  value={
                    ticketingMetrics?.averageTicketPrice != null
                      ? formatCurrency(
                          ticketingMetrics.averageTicketPrice,
                          currency,
                          ticketingSourceCurrency
                        )
                      : "—"
                  }
                />
                <InfoRow
                  label="Guestlist"
                  value={
                    show.guestlistCapacity != null
                      ? `${guestlistUsage.usedSpots}/${show.guestlistCapacity}`
                      : String(guestlistUsage.usedSpots)
                  }
                />
                <InfoRow
                  label={t(locale, "Remboursements", "Refunds")}
                  value={ticketingMetrics ? String(ticketingMetrics.refundCount) : "—"}
                />
              </div>
            </SectionBlock>

            <SectionBlock
              icon={Truck}
              title={t(locale, "Venue, travel & merch", "Venue, travel & merch")}
              subtitle={t(
                locale,
                "Logistique à ne pas rater le jour J.",
                "Operational logistics for the day."
              )}
            >
              <div className="space-y-1">
                <InfoRow
                  label={t(locale, "Parking", "Parking")}
                  value={show.dayOfShowInfo.parkingInfo || "—"}
                />
                <InfoRow
                  label="WiFi"
                  value={show.dayOfShowInfo.wifi || "—"}
                />
                <InfoRow
                  label={t(locale, "Hospitality", "Hospitality")}
                  value={show.dayOfShowInfo.hospitalityInfo || "—"}
                />
                <InfoRow
                  label={t(locale, "Loge", "Dressing room")}
                  value={show.dayOfShowInfo.dressingRoomInfo || "—"}
                />
                <InfoRow
                  label={t(locale, "Hôtel", "Hotel")}
                  value={show.travelInfo.hotelName || "—"}
                />
                <InfoRow
                  label={t(locale, "Adresse hôtel", "Hotel address")}
                  value={show.travelInfo.hotelAddress || "—"}
                />
                <InfoRow
                  label={t(locale, "Voyage", "Travel")}
                  value={travelLabel || "—"}
                />
                <InfoRow
                  label={t(locale, "Merch", "Merch")}
                  value={
                    renderParagraphList(
                      [
                        show.merchSetup.sellerName,
                        show.merchSetup.tableLocation,
                        show.merchSetup.cutPercent != null
                          ? `${show.merchSetup.cutPercent}% cut`
                          : "",
                        show.merchSetup.powerRequired
                          ? t(locale, "Alim requise", "Power needed")
                          : ""
                      ].filter(Boolean)
                    ) || "—"
                  }
                />
                <InfoRow
                  label={t(locale, "Supports locaux", "Local acts")}
                  value={localActsLabel}
                />
              </div>
            </SectionBlock>

            {combinedNotes ? (
              <SectionBlock
                icon={ClipboardList}
                title={t(locale, "Notes de prod", "Production notes")}
                subtitle={t(
                  locale,
                  "Ce que tout le monde doit lire avant d'arriver.",
                  "Shared notes for the whole crew."
                )}
              >
                <div className="rounded-[14px] border border-slate-300 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-900">
                    {combinedNotes}
                  </p>
                </div>
              </SectionBlock>
            ) : null}
          </div>
        </div>
      </PrintPage>

      <PrintPage>
        <div className="border-b border-slate-300 px-8 py-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                {workspaceName}
              </p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">
                {t(locale, "Annexe opérationnelle", "Operational appendix")}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {show.folderName} • {formatShortDate(show.date, locale)}
              </p>
            </div>
            <p className="text-sm text-slate-500">
              {show.venue} • {[show.city, show.country].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>

        <div className="grid gap-5 px-8 py-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <SectionBlock
              icon={CalendarDays}
              title={t(locale, "Running order complet", "Full running order")}
              subtitle={t(
                locale,
                "Déroulé détaillé de la journée avec timings et notes.",
                "Detailed timeline with timings and notes."
              )}
            >
              <div className="overflow-hidden rounded-[14px] border border-slate-300">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-50">
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Début", "Start")}
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Fin", "End")}
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Type", "Type")}
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Artiste / call", "Artist / call")}
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Durée", "Duration")}
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {t(locale, "Notes", "Notes")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningOrderRows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-200 last:border-b-0">
                        <td className="px-3 py-2 font-medium text-slate-950">
                          {row.startTime || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.endTime || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{row.label}</td>
                        <td className="px-3 py-2 text-slate-950">{row.actor || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{row.duration || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{row.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionBlock>

            <SectionBlock
              icon={Users}
              title={t(locale, "Guestlist détaillée", "Detailed guestlist")}
              subtitle={t(
                locale,
                "Version imprimable pour la porte ou le TM.",
                "Printable guestlist for door or tour manager."
              )}
            >
              {show.guestlistEntries.length ? (
                <div className="overflow-hidden rounded-[14px] border border-slate-300">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-50">
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {t(locale, "Nom", "Name")}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {t(locale, "Invité par", "Guest of")}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {t(locale, "Places", "Spots")}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {t(locale, "Statut", "Status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {show.guestlistEntries.map((entry) => (
                        <tr key={entry.id} className="border-b border-slate-200 last:border-b-0">
                          <td className="px-3 py-2 font-medium text-slate-950">
                            {entry.name || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{entry.guestOf || "—"}</td>
                          <td className="px-3 py-2 text-slate-700">{entry.spots}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {entry.status}
                            {entry.notes ? ` • ${entry.notes}` : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-700">
                  {t(locale, "Aucune guestlist saisie", "No guestlist entered")}
                </p>
              )}
            </SectionBlock>
          </div>

          <div className="space-y-5">
            <SectionBlock
              icon={Music4}
              title={t(locale, "Setlist & backline", "Setlist & backline")}
              subtitle={t(
                locale,
                "Rappel musique et matériel utile pour l'équipe.",
                "Music and gear reference for the crew."
              )}
            >
              <div className="space-y-1">
                <InfoRow
                  label={t(locale, "Durée setlist", "Setlist duration")}
                  value={setlistDuration ? `${setlistDuration} min` : "—"}
                />
                <InfoRow
                  label={t(locale, "Matos chargé", "Loaded gear")}
                  value={`${gearSummary.loaded}/${gearSummary.total || 0}`}
                />
                <InfoRow
                  label={t(locale, "Manquant", "Missing")}
                  value={String(gearSummary.missing)}
                />
                <InfoRow
                  label={t(locale, "Endommagé", "Damaged")}
                  value={String(gearSummary.damaged)}
                />
              </div>

              {show.setlistEntries.length ? (
                <div className="mt-4 overflow-hidden rounded-[14px] border border-slate-300">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-50">
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          #
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {t(locale, "Titre", "Title")}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-slate-500">
                          {t(locale, "Infos", "Info")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {show.setlistEntries.map((entry, index) => (
                        <tr key={entry.id} className="border-b border-slate-200 last:border-b-0">
                          <td className="px-3 py-2 font-medium text-slate-950">
                            {String(index + 1).padStart(2, "0")}
                          </td>
                          <td className="px-3 py-2 text-slate-950">
                            {entry.songTitle || "—"}
                            {entry.isEncore ? (
                              <span className="ml-2 text-[11px] uppercase tracking-[0.16em] text-coral-600">
                                Encore
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {[
                              entry.tuning,
                              entry.tempo,
                              entry.durationMinutes ? `${entry.durationMinutes} min` : "",
                              entry.clickTrack ? "Click" : ""
                            ]
                              .filter(Boolean)
                              .join(" • ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-700">
                  {t(locale, "Aucune setlist saisie", "No setlist entered")}
                </p>
              )}
            </SectionBlock>

            <SectionBlock
              icon={MapPinned}
              title={t(locale, "Documents & visuels", "Documents & visuals")}
              subtitle={t(
                locale,
                "Flyer, docs liés et éléments utiles à avoir sous la main.",
                "Flyer and linked material to keep close."
              )}
            >
              {show.posterOverride ? (
                <div className="overflow-hidden rounded-[14px] border border-slate-300">
                  <img
                    src={show.posterOverride}
                    alt={t(locale, "Flyer de la date", "Show flyer")}
                    className="max-h-[360px] w-full object-cover"
                  />
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-700">
                  {t(locale, "Aucun flyer de date ajouté", "No show flyer added")}
                </p>
              )}

              <div className="mt-4 space-y-1">
                {linkedDocuments.length ? (
                  linkedDocuments.map((document) => (
                    <InfoRow
                      key={document.id}
                      label={document.category}
                      value={document.name}
                    />
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-700">
                    {t(
                      locale,
                      "Aucun document lié à cette date",
                      "No document linked to this show"
                    )}
                  </p>
                )}
              </div>
            </SectionBlock>

            <SectionBlock
              icon={ClipboardList}
              title={t(locale, "Notes finales", "Final notes")}
              subtitle={t(
                locale,
                "Derniers rappels utiles pour le TM, la régie et la band.",
                "Final reminders for TM, crew, and band."
              )}
            >
              <div className="space-y-3">
                {hasContent(show.travelInfo.borderNotes) ? (
                  <NotesPanel
                    title={t(locale, "Frontière / admin", "Border / admin")}
                    text={show.travelInfo.borderNotes}
                  />
                ) : null}
                {hasContent(show.merchSetup.stockNotes) ? (
                  <NotesPanel
                    title={t(locale, "Merch notes", "Merch notes")}
                    text={show.merchSetup.stockNotes}
                  />
                ) : null}
                <NotesPanel
                  title={t(locale, "Notes générales", "General notes")}
                  text={combinedNotes}
                />
              </div>
            </SectionBlock>
          </div>
        </div>
      </PrintPage>
    </div>
  );
}
