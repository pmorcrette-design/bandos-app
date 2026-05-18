"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FolderClosed,
  Trash2
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { t, translateShowStatus, type Locale } from "@/lib/i18n";
import { getAttendanceProjectionMetrics } from "@/lib/shows";
import {
  convertCurrency,
  formatCurrency,
  supportedCurrencyMeta,
  type SupportedCurrency
} from "@/lib/utils";
import {
  useBandosUIStore,
  type ImportedLocalAct,
  type ImportedShowFolder
} from "@/store/ui-store";

function parseNumberInput(value: string) {
  const normalized = value.replace(",", ".").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseIntegerInput(value: string) {
  const parsed = parseNumberInput(value);

  if (parsed === null || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function parseOptionalIntegerInput(value: string) {
  const parsed = parseNumberInput(value);

  if (parsed === null || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

function formatEditableAmount(
  amount: number | null | undefined,
  currency: SupportedCurrency
) {
  if (typeof amount !== "number") {
    return "";
  }

  return String(Number(convertCurrency(amount, "GBP", currency).toFixed(2)));
}

type EditableLocalAct = {
  id: string;
  name: string;
  role: ImportedLocalAct["role"];
  fee: string;
};

function getLocalActsTotalCost(localSupportActs: Array<{ fee: number | null }>) {
  return localSupportActs.reduce((sum, act) => sum + (act.fee ?? 0), 0);
}

function getNightCostsTotal(folder: {
  roomHire: number | null;
  soundEngineerCost: number | null;
  localSupportActs: Array<{ fee: number | null }>;
}) {
  return (
    (folder.roomHire ?? 0) +
    (folder.soundEngineerCost ?? 0) +
    getLocalActsTotalCost(folder.localSupportActs)
  );
}

function getBreakEvenTickets(folder: {
  ticketPrice: number | null;
  roomHire: number | null;
  soundEngineerCost: number | null;
  localSupportActs: Array<{ fee: number | null }>;
}) {
  if (!folder.ticketPrice || folder.ticketPrice <= 0) {
    return null;
  }

  const totalCosts = getNightCostsTotal(folder);
  return totalCosts > 0 ? Math.ceil(totalCosts / folder.ticketPrice) : null;
}

function getCapacityStatus(
  capacity: number | null,
  breakEvenTickets: number | null,
  locale: Locale
) {
  if (!capacity) {
    return t(locale, "Jauge non renseignée", "Capacity not set");
  }

  if (!breakEvenTickets) {
    return t(locale, `Jauge ${capacity}`, `Capacity ${capacity}`);
  }

  if (breakEvenTickets <= capacity) {
    return t(
      locale,
      `Jauge ${capacity} • équilibre atteignable`,
      `Capacity ${capacity} • break-even reachable`
    );
  }

  return t(
    locale,
    `Jauge ${capacity} • hors équilibre`,
    `Capacity ${capacity} • not break-even safe`
  );
}

function getLocalActRoleLabel(
  locale: Locale,
  role: ImportedLocalAct["role"]
) {
  if (role === "opener") {
    return t(locale, "Opener", "Opener");
  }

  if (role === "support") {
    return t(locale, "Support", "Support");
  }

  return t(locale, "Autre", "Other");
}

function getNewLocalActRole(index: number): ImportedLocalAct["role"] {
  if (index === 0) {
    return "opener";
  }

  if (index === 1) {
    return "support";
  }

  return "other";
}

function isSoundEngineerRole(role: string) {
  const normalizedRole = role.trim().toLowerCase();

  return (
    normalizedRole.includes("sound engineer") ||
    normalizedRole.includes("ingé son") ||
    normalizedRole.includes("inge son") ||
    normalizedRole.includes("foh")
  );
}

type TourGroup = {
  tourName: string;
  folders: ImportedShowFolder[];
  validatedCount: number;
  totalNightCosts: number;
  projectedNetAtEighty: number;
  projectedShowsCount: number;
};

export function ImportedShowFolders({
  currency,
  locale
}: {
  currency: SupportedCurrency;
  locale: Locale;
}) {
  const folders = useBandosUIStore((state) => state.importedShowFolders);
  const teamRoster = useBandosUIStore((state) => state.teamRoster);
  const updateImportedShowFolder = useBandosUIStore(
    (state) => state.updateImportedShowFolder
  );
  const updateImportedTourCurrency = useBandosUIStore(
    (state) => state.updateImportedTourCurrency
  );
  const updateImportedTourName = useBandosUIStore(
    (state) => state.updateImportedTourName
  );
  const deleteImportedShowFolder = useBandosUIStore(
    (state) => state.deleteImportedShowFolder
  );
  const [selectedTourName, setSelectedTourName] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [editableTourName, setEditableTourName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [roomHire, setRoomHire] = useState("");
  const [soundEngineerId, setSoundEngineerId] = useState("");
  const [soundEngineerCost, setSoundEngineerCost] = useState("");
  const [localSupportActs, setLocalSupportActs] = useState<EditableLocalAct[]>([]);
  const [validated, setValidated] = useState(false);
  const [status, setStatus] = useState<ImportedShowFolder["status"]>("pending");
  const [notes, setNotes] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [tourSaveMessage, setTourSaveMessage] = useState("");

  const sortedFolders = useMemo(
    () =>
      [...folders].sort((left, right) => {
        if (left.tourName === right.tourName) {
          return left.importOrder - right.importOrder;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      }),
    [folders]
  );

  const tourGroups = useMemo<TourGroup[]>(
    () =>
      Array.from(
        sortedFolders.reduce((groups, folder) => {
          const currentGroup = groups.get(folder.tourName) ?? {
            tourName: folder.tourName,
            folders: [],
            validatedCount: 0,
            totalNightCosts: 0,
            projectedNetAtEighty: 0,
            projectedShowsCount: 0
          };

          currentGroup.folders.push(folder);
          currentGroup.validatedCount += folder.validated ? 1 : 0;
          currentGroup.totalNightCosts += getNightCostsTotal(folder);
          const projectionAtEighty = getAttendanceProjectionMetrics({
            capacity: folder.capacity,
            ticketPrice: folder.ticketPrice,
            fixedCosts: getNightCostsTotal(folder)
          });

          if (projectionAtEighty) {
            currentGroup.projectedNetAtEighty += projectionAtEighty.delta;
            currentGroup.projectedShowsCount += 1;
          }

          groups.set(folder.tourName, currentGroup);
          return groups;
        }, new Map<string, TourGroup>())
      )
        .map(([, group]) => group)
        .sort((left, right) =>
          right.folders[0].updatedAt.localeCompare(left.folders[0].updatedAt)
        ),
    [sortedFolders]
  );

  const selectedTour = useMemo(
    () =>
      selectedTourName
        ? tourGroups.find((group) => group.tourName === selectedTourName) ?? null
        : null,
    [selectedTourName, tourGroups]
  );

  const selectedFolder = sortedFolders.find((folder) => folder.id === selectedFolderId) ?? null;
  const effectiveCurrency = selectedFolder?.tourCurrency ?? currency;
  const soundEngineers = useMemo(
    () => teamRoster.filter((member) => isSoundEngineerRole(member.role)),
    [teamRoster]
  );
  const selectedSoundEngineerName =
    (soundEngineerId
      ? teamRoster.find((member) => member.id === soundEngineerId)?.name
      : null) ?? null;

  useEffect(() => {
    if (selectedTourName && !selectedTour) {
      setSelectedTourName(null);
      setSelectedFolderId(null);
    }
  }, [selectedTour, selectedTourName]);

  useEffect(() => {
    if (!selectedTour) {
      setEditableTourName("");
      setTourSaveMessage("");
      return;
    }

    setEditableTourName(selectedTour.tourName);
    setTourSaveMessage("");
  }, [selectedTour]);

  useEffect(() => {
    if (!selectedFolder) {
      setCapacity("");
      setTicketPrice("");
      setRoomHire("");
      setSoundEngineerId("");
      setSoundEngineerCost("");
      setLocalSupportActs([]);
      setValidated(false);
      setStatus("pending");
      setNotes("");
      setSaveMessage("");
      return;
    }

    setCapacity(
      typeof selectedFolder.capacity === "number"
        ? String(selectedFolder.capacity)
        : ""
    );
    setTicketPrice(formatEditableAmount(selectedFolder.ticketPrice, effectiveCurrency));
    setRoomHire(formatEditableAmount(selectedFolder.roomHire, effectiveCurrency));
    setSoundEngineerId(selectedFolder.soundEngineerId ?? "");
    setSoundEngineerCost(
      formatEditableAmount(selectedFolder.soundEngineerCost, effectiveCurrency)
    );
    setLocalSupportActs(
      (selectedFolder.localSupportActs ?? []).map((act) => ({
        id: act.id,
        name: act.name,
        role: act.role,
        fee: formatEditableAmount(act.fee, effectiveCurrency)
      }))
    );
    setValidated(selectedFolder.validated);
    setStatus(selectedFolder.status);
    setNotes(selectedFolder.notes);
    setSaveMessage("");
  }, [effectiveCurrency, selectedFolder]);

  const breakEvenTickets = useMemo(() => {
    const parsedTicket = parseNumberInput(ticketPrice);

    if (!parsedTicket || parsedTicket <= 0) {
      return null;
    }

    const totalCosts =
      (parseNumberInput(roomHire) ?? 0) +
      (parseNumberInput(soundEngineerCost) ?? 0) +
      localSupportActs.reduce(
        (sum, act) => sum + (parseNumberInput(act.fee) ?? 0),
        0
      );

    return totalCosts > 0 ? Math.ceil(totalCosts / parsedTicket) : null;
  }, [localSupportActs, roomHire, soundEngineerCost, ticketPrice]);

  const localBandsTotal = useMemo(
    () => localSupportActs.reduce((sum, act) => sum + (parseNumberInput(act.fee) ?? 0), 0),
    [localSupportActs]
  );
  const projectedAtEighty = useMemo(
    () =>
      getAttendanceProjectionMetrics({
        capacity: parseOptionalIntegerInput(capacity),
        ticketPrice: parseNumberInput(ticketPrice),
        fixedCosts:
          (parseNumberInput(roomHire) ?? 0) +
          (parseNumberInput(soundEngineerCost) ?? 0) +
          localBandsTotal
      }),
    [capacity, localBandsTotal, roomHire, soundEngineerCost, ticketPrice]
  );

  function addLocalSupportAct() {
    setLocalSupportActs((current) => [
      ...current,
      {
        id: `local-act-${Date.now()}-${current.length}`,
        name: "",
        role: getNewLocalActRole(current.length),
        fee: ""
      }
    ]);
  }

  function updateLocalSupportAct(
    id: string,
    patch: Partial<EditableLocalAct>
  ) {
    setLocalSupportActs((current) =>
      current.map((act) => (act.id === id ? { ...act, ...patch } : act))
    );
  }

  function removeLocalSupportAct(id: string) {
    setLocalSupportActs((current) => current.filter((act) => act.id !== id));
  }

  function saveFolder() {
    if (!selectedFolder) {
      return;
    }

    const normalizedLocalSupportActs = localSupportActs
      .map((act) => ({
        id: act.id,
        name: act.name.trim() || t(locale, "Groupe local", "Local band"),
        role: act.role,
        fee:
          parseNumberInput(act.fee) !== null
            ? convertCurrency(parseNumberInput(act.fee) ?? 0, effectiveCurrency, "GBP")
            : null
      }))
      .filter((act) => act.name || act.fee !== null);
    const localBandCount = normalizedLocalSupportActs.length;
    const localBandFeePerBand = localBandCount
      ? normalizedLocalSupportActs.reduce((sum, act) => sum + (act.fee ?? 0), 0) /
        localBandCount
      : null;

    updateImportedShowFolder(selectedFolder.id, {
      capacity: parseOptionalIntegerInput(capacity),
      ticketPrice:
        parseNumberInput(ticketPrice) !== null
          ? convertCurrency(
              parseNumberInput(ticketPrice) ?? 0,
              effectiveCurrency,
              "GBP"
            )
          : null,
      roomHire:
        parseNumberInput(roomHire) !== null
          ? convertCurrency(
              parseNumberInput(roomHire) ?? 0,
              effectiveCurrency,
              "GBP"
            )
          : null,
      soundEngineerId: soundEngineerId || null,
      soundEngineerCost:
        parseNumberInput(soundEngineerCost) !== null
          ? convertCurrency(
              parseNumberInput(soundEngineerCost) ?? 0,
              effectiveCurrency,
              "GBP"
            )
          : null,
      localSupportActs: normalizedLocalSupportActs,
      localBandCount,
      localBandFeePerBand,
      validated,
      status,
      notes
    });
    setSaveMessage(
      t(locale, "Fiche concert mise à jour.", "Show folder updated.")
    );
  }

  function removeFolder(id: string) {
    deleteImportedShowFolder(id);

    if (selectedFolderId === id) {
      setSelectedFolderId(null);
      setSaveMessage("");
    }
  }

  function changeTourCurrency(tourName: string, nextCurrency: SupportedCurrency) {
    updateImportedTourCurrency(tourName, nextCurrency);

    if (selectedFolder?.tourName === tourName) {
      setSaveMessage(
        t(locale, "Devise de la tournée mise à jour.", "Tour currency updated.")
      );
    }
  }

  function renameTour() {
    if (!selectedTour) {
      return;
    }

    const resolvedTourName = updateImportedTourName(
      selectedTour.tourName,
      editableTourName
    );

    setSelectedTourName(resolvedTourName);
    setTourSaveMessage(
      resolvedTourName === editableTourName.trim()
        ? t(locale, "Nom de tournée mis à jour.", "Tour name updated.")
        : t(
            locale,
            `Nom mis à jour en "${resolvedTourName}" car ce nom existait déjà.`,
            `Name updated to "${resolvedTourName}" because that name already existed.`
          )
    );
  }

  if (!sortedFolders.length) {
    return (
      <EmptyState
        title={t(
          locale,
          "Aucune tournée importée dans Concerts",
          "No imported tours in Shows"
        )}
        body={t(
          locale,
          "Valide un import depuis la page Tournée pour créer ici des tournées puis des fiches date éditables.",
          "Validate an import from the Tour page to create tour lists and editable show sheets here."
        )}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-medium text-mist-50">
              {selectedTour
                ? t(locale, "Dates de la tournée", "Tour dates")
                : t(locale, "Tournées importées", "Imported tours")}
            </p>
            <p className="mt-2 text-sm text-mist-300">
              {selectedTour
                ? t(
                    locale,
                    "Clique sur une date pour ouvrir sa fiche et compléter les coûts de soirée.",
                    "Click a date to open its sheet and fill in nightly costs."
                  )
                : t(
                    locale,
                    "Chaque import validé crée une tournée, puis une liste de dates cliquables dans Concerts.",
                    "Each validated import creates a tour first, then a clickable list of dates in Shows."
                  )}
            </p>
          </div>
          {selectedTour ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSelectedTourName(null);
                setSelectedFolderId(null);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              {t(locale, "Retour aux tournées", "Back to tours")}
            </Button>
          ) : (
            <Badge tone="accent">{tourGroups.length}</Badge>
          )}
        </div>

        {selectedTour ? (
          <div className="flex flex-col gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <label className="flex-1 space-y-2">
                  <span className="text-sm text-mist-200">
                    {t(locale, "Nom de la tournée", "Tour name")}
                  </span>
                  <Input
                    value={editableTourName}
                    onChange={(event) => setEditableTourName(event.target.value)}
                    placeholder={t(
                      locale,
                      "Nom de la tournée",
                      "Tour name"
                    )}
                  />
                </label>
                <Button type="button" variant="secondary" onClick={renameTour}>
                  {t(locale, "Renommer", "Rename")}
                </Button>
              </div>
              <p className="text-sm text-mist-300">{selectedTour.tourName}</p>
              <p className="text-sm text-mist-200">
                {t(
                  locale,
                  "Choisis la devise de cette tournée. Toutes les dates et leurs coûts s'affichent ensuite dans cette devise.",
                  "Choose the currency for this tour. All dates and their costs will then display in that currency."
                )}
              </p>
              {tourSaveMessage ? (
                <p className="text-sm text-emerald-300">{tourSaveMessage}</p>
              ) : null}
            </div>
            <label className="space-y-2">
              <span className="sr-only">
                {t(locale, "Devise de la tournée", "Tour currency")}
              </span>
              <select
                value={selectedTour.folders[0]?.tourCurrency ?? currency}
                onChange={(event) =>
                  changeTourCurrency(
                    selectedTour.tourName,
                    event.target.value as SupportedCurrency
                  )
                }
                className="h-11 min-w-[180px] rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                {(Object.keys(supportedCurrencyMeta) as SupportedCurrency[]).map((code) => (
                  <option key={code} value={code} className="bg-graphite-900">
                    {supportedCurrencyMeta[code].label} ({supportedCurrencyMeta[code].symbol})
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {!selectedTour ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {tourGroups.map((group) => {
              const firstDate = group.folders[0]?.date;
              const lastDate = group.folders[group.folders.length - 1]?.date;
              const groupCurrency = group.folders[0]?.tourCurrency ?? currency;

              return (
                <button
                  key={group.tourName}
                  type="button"
                  onClick={() => setSelectedTourName(group.tourName)}
                  className="w-full text-left"
                >
                  <Card className="transition hover:border-coral-500/20 hover:bg-coral-500/[0.04]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                          <FolderClosed className="h-5 w-5 text-coral-300" />
                        </div>
                        <div>
                          <p className="text-xl font-semibold text-mist-50">
                            {group.tourName}
                          </p>
                          <p className="mt-1 text-sm text-mist-300">
                            {group.folders.length}{" "}
                            {t(locale, "dates", "dates")} • {firstDate}
                            {lastDate && lastDate !== firstDate ? ` → ${lastDate}` : ""}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-5 w-5 text-mist-300" />
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                          {t(locale, "Dates validées", "Validated dates")}
                        </p>
                        <p className="mt-2 font-medium text-mist-50">
                          {group.validatedCount}/{group.folders.length}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                          {t(locale, "Coûts saisis", "Logged costs")}
                        </p>
                        <p className="mt-2 font-medium text-mist-50">
                          {formatCurrency(group.totalNightCosts, groupCurrency, "GBP")}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                          {t(locale, "Devise", "Currency")}
                        </p>
                        <p className="mt-2 font-medium text-mist-50">
                          {supportedCurrencyMeta[groupCurrency].label} (
                          {supportedCurrencyMeta[groupCurrency].symbol})
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                          {t(locale, "Projection 80%", "80% projection")}
                        </p>
                        <p className="mt-2 font-medium text-mist-50">
                          {group.projectedShowsCount
                            ? `${group.projectedNetAtEighty >= 0 ? "+" : "-"}${formatCurrency(
                                Math.abs(group.projectedNetAtEighty),
                                groupCurrency,
                                "GBP"
                              )}`
                            : "—"}
                        </p>
                        <p className="mt-1 text-sm text-mist-300">
                          {group.projectedShowsCount
                            ? t(
                                locale,
                                `${group.projectedShowsCount} date(s) prises en compte`,
                                `${group.projectedShowsCount} show(s) included`
                              )
                            : t(
                                locale,
                                "Renseigne jauge + billet pour simuler la tournée.",
                                "Add capacity + ticket price to simulate the tour."
                              )}
                        </p>
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedTour.folders.map((folder) => {
              const folderCurrency = folder.tourCurrency ?? currency;
              const localBandTotal = getLocalActsTotalCost(folder.localSupportActs ?? []);
              const breakEvenTickets = getBreakEvenTickets(folder);
              const projectionAtEighty = getAttendanceProjectionMetrics({
                capacity: folder.capacity,
                ticketPrice: folder.ticketPrice,
                fixedCosts: getNightCostsTotal(folder)
              });

              return (
                <Card key={folder.id} className="transition hover:border-coral-500/20">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xl font-semibold text-mist-50">
                          {folder.folderName}
                        </p>
                        <Badge>{folder.date}</Badge>
                        <Badge tone={folder.validated ? "success" : "warning"}>
                          {folder.validated
                            ? t(locale, "Date validée", "Validated show")
                            : t(locale, "À compléter", "Needs setup")}
                        </Badge>
                        <Badge
                          tone={folder.status === "booked" ? "success" : "accent"}
                        >
                          {translateShowStatus(locale, folder.status)}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-mist-300">
                        {[folder.city, folder.country].filter(Boolean).join(", ")}
                      </p>
                      <p className="mt-2 text-sm text-mist-200">{folder.address}</p>
                      <p className="mt-2 text-sm text-mist-300">
                        {typeof folder.capacity === "number"
                          ? t(
                              locale,
                              `Jauge ${folder.capacity}`,
                              `Capacity ${folder.capacity}`
                            )
                          : t(locale, "Jauge non renseignée", "Capacity not set")}
                      </p>
                      <p className="mt-2 text-sm text-mist-300">
                        {folder.soundEngineerId
                          ? t(
                              locale,
                              `Ingé son: ${teamRoster.find((member) => member.id === folder.soundEngineerId)?.name ?? "—"}`,
                              `Sound engineer: ${teamRoster.find((member) => member.id === folder.soundEngineerId)?.name ?? "—"}`
                            )
                          : t(
                              locale,
                              "Ingé son non assigné",
                              "No sound engineer assigned"
                            )}
                      </p>

                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                            {t(locale, "Billet", "Ticket")}
                          </p>
                          <p className="mt-2 font-medium text-mist-50">
                            {typeof folder.ticketPrice === "number"
                              ? formatCurrency(folder.ticketPrice, folderCurrency, "GBP")
                              : "—"}
                          </p>
                        </div>
                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                            {t(locale, "Salle + ingé", "Room + engineer")}
                          </p>
                          <p className="mt-2 font-medium text-mist-50">
                            {formatCurrency(
                              (folder.roomHire ?? 0) + (folder.soundEngineerCost ?? 0),
                              folderCurrency,
                              "GBP"
                            )}
                          </p>
                        </div>
                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                            {t(locale, "Groupes locaux", "Local bands")}
                          </p>
                          <p className="mt-2 font-medium text-mist-50">
                            {(folder.localSupportActs?.length ?? folder.localBandCount ?? 0)} •{" "}
                            {formatCurrency(localBandTotal, folderCurrency, "GBP")}
                          </p>
                          <p className="mt-1 text-sm text-mist-300">
                            {(folder.localSupportActs ?? [])
                              .map((act) => getLocalActRoleLabel(locale, act.role))
                              .join(" • ") || t(locale, "Aucun groupe", "No local band")}
                          </p>
                        </div>
                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                            {t(locale, "Seuil billets", "Break-even tickets")}
                          </p>
                          <p className="mt-2 font-medium text-mist-50">
                            {breakEvenTickets ?? "—"}
                          </p>
                          <p className="mt-1 text-sm text-mist-300">
                            {getCapacityStatus(folder.capacity ?? null, breakEvenTickets, locale)}
                          </p>
                        </div>
                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                            {t(locale, "Projection 80%", "80% projection")}
                          </p>
                          <p className="mt-2 font-medium text-mist-50">
                            {projectionAtEighty
                              ? `${projectionAtEighty.delta >= 0 ? "+" : "-"}${formatCurrency(
                                  Math.abs(projectionAtEighty.delta),
                                  folderCurrency,
                                  "GBP"
                                )}`
                              : "—"}
                          </p>
                          <p className="mt-1 text-sm text-mist-300">
                            {projectionAtEighty
                              ? `${projectionAtEighty.projectedAttendance}/${folder.capacity} ${t(locale, "billets", "tickets")}`
                              : t(
                                  locale,
                                  "Renseigne jauge + billet",
                                  "Add capacity + ticket"
                                )}
                          </p>
                        </div>
                      </div>
                    </button>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setSelectedFolderId(folder.id)}
                      >
                        {t(locale, "Ouvrir", "Open")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => removeFolder(folder.id)}
                        className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t(locale, "Supprimer", "Delete")}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(selectedFolder)}
        onClose={() => setSelectedFolderId(null)}
        title={selectedFolder?.folderName ?? ""}
        description={
          selectedFolder
            ? `${selectedFolder.tourName} • ${selectedFolder.date} • ${selectedFolder.city}, ${selectedFolder.country}`
            : undefined
        }
      >
        {selectedFolder ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Adresse", "Address")}
                </p>
                <p className="mt-2 text-sm leading-7 text-mist-50">
                  {selectedFolder.address}
                </p>
              </div>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Devise de la tournée", "Tour currency")}
                </span>
                <select
                  value={selectedFolder.tourCurrency}
                  onChange={(event) =>
                    changeTourCurrency(
                      selectedFolder.tourName,
                      event.target.value as SupportedCurrency
                    )
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                >
                  {(Object.keys(supportedCurrencyMeta) as SupportedCurrency[]).map((code) => (
                    <option key={code} value={code} className="bg-graphite-900">
                      {supportedCurrencyMeta[code].label} ({supportedCurrencyMeta[code].symbol})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Prix du billet", "Ticket price")}
                </span>
                <Input
                  value={ticketPrice}
                  onChange={(event) => setTicketPrice(event.target.value)}
                  placeholder="15"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Prix de la salle", "Room hire")}
                </span>
                <Input
                  value={roomHire}
                  onChange={(event) => setRoomHire(event.target.value)}
                  placeholder="350"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Jauge de la salle", "Venue capacity")}
                </span>
                <Input
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                  inputMode="numeric"
                  placeholder="180"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Ingé son assigné", "Assigned sound engineer")}
                </span>
                <select
                  value={soundEngineerId}
                  onChange={(event) => setSoundEngineerId(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                >
                  <option value="" className="bg-graphite-900">
                    {t(locale, "Aucun ingé assigné", "No engineer assigned")}
                  </option>
                  {soundEngineers.map((member) => (
                    <option key={member.id} value={member.id} className="bg-graphite-900">
                      {member.name} • {member.location || member.role}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-mist-300">
                  {soundEngineers.length
                    ? t(
                        locale,
                        "Cette liste vient de l'onglet Équipe.",
                        "This list comes from the Team tab."
                      )
                    : t(
                        locale,
                        "Ajoute un membre avec le rôle Sound Engineer dans Équipe.",
                        "Add a member with the Sound Engineer role in Team."
                      )}
                </p>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Coût ingé son", "Sound engineer cost")}
                </span>
                <Input
                  value={soundEngineerCost}
                  onChange={(event) => setSoundEngineerCost(event.target.value)}
                  placeholder="120"
                />
              </label>
            </div>

            <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-mist-50">
                    {t(locale, "Groupes locaux", "Local bands")}
                  </p>
                  <p className="mt-1 text-sm text-mist-300">
                    {t(
                      locale,
                      "Ajoute un opener, un support ou d'autres groupes avec leur cachet propre.",
                      "Add an opener, a support slot, or other local bands with their own fee."
                    )}
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={addLocalSupportAct}>
                  {t(locale, "Ajouter un groupe", "Add local band")}
                </Button>
              </div>

              {localSupportActs.length ? (
                <div className="space-y-3">
                  {localSupportActs.map((act, index) => (
                    <div
                      key={act.id}
                      className="grid gap-3 rounded-[20px] border border-white/8 bg-black/10 p-3 md:grid-cols-[1.1fr_180px_160px_auto]"
                    >
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                          {t(locale, "Nom du groupe", "Band name")}
                        </span>
                        <Input
                          value={act.name}
                          onChange={(event) =>
                            updateLocalSupportAct(act.id, {
                              name: event.target.value
                            })
                          }
                          placeholder={
                            index === 0
                              ? t(locale, "Opener local", "Local opener")
                              : index === 1
                                ? t(locale, "Support local", "Local support")
                                : t(locale, "Groupe local", "Local band")
                          }
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                          {t(locale, "Rôle", "Role")}
                        </span>
                        <select
                          value={act.role}
                          onChange={(event) =>
                            updateLocalSupportAct(act.id, {
                              role: event.target.value as ImportedLocalAct["role"]
                            })
                          }
                          className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                        >
                          <option value="opener" className="bg-graphite-900">
                            {getLocalActRoleLabel(locale, "opener")}
                          </option>
                          <option value="support" className="bg-graphite-900">
                            {getLocalActRoleLabel(locale, "support")}
                          </option>
                          <option value="other" className="bg-graphite-900">
                            {getLocalActRoleLabel(locale, "other")}
                          </option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                          {t(locale, "Cachet", "Fee")}
                        </span>
                        <Input
                          value={act.fee}
                          onChange={(event) =>
                            updateLocalSupportAct(act.id, {
                              fee: event.target.value
                            })
                          }
                          placeholder="80"
                        />
                      </label>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => removeLocalSupportAct(act.id)}
                          className="w-full border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20 md:w-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t(locale, "Retirer", "Remove")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 p-4 text-sm text-mist-300">
                  {t(
                    locale,
                    "Aucun groupe local ajouté pour cette date.",
                    "No local band added for this show yet."
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-mist-200">
                  {t(locale, "Statut date", "Show status")}
                </span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ImportedShowFolder["status"])
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
                  {t(locale, "Validation", "Validation")}
                </span>
                <button
                  type="button"
                  onClick={() => setValidated((current) => !current)}
                  className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 transition hover:bg-white/10"
                >
                  <span>
                    {validated
                      ? t(locale, "Date validée", "Validated show")
                      : t(locale, "Date non validée", "Show not validated")}
                  </span>
                  {validated ? <Check className="h-4 w-4 text-emerald-300" /> : null}
                </button>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Notes", "Notes")}
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition placeholder:text-mist-300/70 focus:border-coral-500/50 focus:bg-white/[0.07]"
                placeholder={t(
                  locale,
                  "Infos salle, deal, contacts, consignes…",
                  "Venue info, deal notes, contacts, instructions..."
                )}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Billet", "Ticket")}
                </p>
                <p className="mt-2 font-medium text-mist-50">
                  {parseNumberInput(ticketPrice) !== null
                    ? formatCurrency(
                        parseNumberInput(ticketPrice) ?? 0,
                        effectiveCurrency,
                        effectiveCurrency
                      )
                    : "—"}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Ingé + salle", "Engineer + room")}
                </p>
                <p className="mt-2 font-medium text-mist-50">
                  {formatCurrency(
                    (parseNumberInput(roomHire) ?? 0) +
                      (parseNumberInput(soundEngineerCost) ?? 0),
                    effectiveCurrency,
                    effectiveCurrency
                  )}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {selectedSoundEngineerName
                    ? t(
                        locale,
                        `Assigné à ${selectedSoundEngineerName}`,
                        `Assigned to ${selectedSoundEngineerName}`
                      )
                    : t(
                        locale,
                        "Aucun ingé assigné",
                        "No engineer assigned"
                      )}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Groupes locaux", "Local bands")}
                </p>
                <p className="mt-2 font-medium text-mist-50">
                  {localSupportActs.length} •{" "}
                  {formatCurrency(
                    localBandsTotal,
                    effectiveCurrency,
                    effectiveCurrency
                  )}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {localSupportActs
                    .map((act) => getLocalActRoleLabel(locale, act.role))
                    .join(" • ") || t(locale, "Aucun groupe", "No local band")}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Seuil billets", "Break-even tickets")}
                </p>
                <p className="mt-2 font-medium text-mist-50">
                  {breakEvenTickets ?? "—"}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {getCapacityStatus(
                    parseOptionalIntegerInput(capacity),
                    breakEvenTickets,
                    locale
                  )}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Projection 80%", "80% projection")}
                </p>
                <p className="mt-2 font-medium text-mist-50">
                  {projectedAtEighty
                    ? `${projectedAtEighty.delta >= 0 ? "+" : "-"}${formatCurrency(
                        Math.abs(projectedAtEighty.delta),
                        effectiveCurrency,
                        effectiveCurrency
                      )}`
                    : "—"}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {projectedAtEighty
                    ? t(
                        locale,
                        `${projectedAtEighty.projectedAttendance} billets vendus à 80% de remplissage.`,
                        `${projectedAtEighty.projectedAttendance} tickets sold at 80% occupancy.`
                      )
                    : t(
                        locale,
                        "Renseigne la jauge et le billet pour simuler le net à 80%.",
                        "Add capacity and ticket price to simulate 80% net."
                      )}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  removeFolder(selectedFolder.id);
                  setSelectedFolderId(null);
                }}
                className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                {t(locale, "Supprimer cette date", "Delete this date")}
              </Button>
              <div className="flex items-center gap-4">
                <p className="text-sm text-emerald-300">{saveMessage}</p>
                <Button type="button" onClick={saveFolder}>
                  {t(locale, "Enregistrer la fiche", "Save folder")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
