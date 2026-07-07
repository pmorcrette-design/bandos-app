"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FolderClosed,
  Plus,
  Trash2
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  t,
  translateCrmStatus,
  translateShowStatus,
  type Locale
} from "@/lib/i18n";
import { getAttendanceProjectionMetrics, getTourCalendarDayCount } from "@/lib/shows";
import {
  convertCurrency,
  formatCurrency,
  supportedCurrencyMeta,
  type SupportedCurrency
} from "@/lib/utils";
import {
  useBandosUIStore,
  type ImportedLocalAct,
  type ImportedShowFolder,
  type TourVehicleAssignment,
  type VehicleCatalogItem
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

function parseDateSortValue(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const timestamp = Date.parse(normalizedValue);

  if (!Number.isNaN(timestamp)) {
    return timestamp;
  }

  const dayFirstMatch = normalizedValue.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);

  if (!dayFirstMatch) {
    return null;
  }

  return Date.UTC(
    Number(dayFirstMatch[3]),
    Number(dayFirstMatch[2]) - 1,
    Number(dayFirstMatch[1])
  );
}

function compareIsoDates(left: string, right: string) {
  const normalizedLeft = left.trim();
  const normalizedRight = right.trim();
  const leftTimestamp = parseDateSortValue(normalizedLeft);
  const rightTimestamp = parseDateSortValue(normalizedRight);

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

  if (normalizedLeft && normalizedRight) {
    return normalizedLeft.localeCompare(normalizedRight);
  }

  if (normalizedLeft) {
    return -1;
  }

  if (normalizedRight) {
    return 1;
  }

  return 0;
}

function compareShowFoldersByDate(left: ImportedShowFolder, right: ImportedShowFolder) {
  const dateComparison = compareIsoDates(left.date, right.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  if (left.importOrder !== right.importOrder) {
    return left.importOrder - right.importOrder;
  }

  return left.folderName.localeCompare(right.folderName);
}

type EditableLocalAct = {
  id: string;
  name: string;
  role: ImportedLocalAct["role"];
  fee: string;
  crmContactId: string | null;
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
  dateNightCosts: number;
  totalNightCosts: number;
  projectedNetAtEighty: number;
  projectedShowsCount: number;
  vehicleAssignment: TourVehicleAssignment | null;
  assignedVehicle: VehicleCatalogItem | null;
  tourCalendarDays: number;
  tourVehicleCost: number;
};

function getTourFirstDateValue(group: TourGroup) {
  const timestamps = group.folders
    .map((folder) => parseDateSortValue(folder.date))
    .filter((value): value is number => value !== null);

  return timestamps.length ? Math.min(...timestamps) : Number.POSITIVE_INFINITY;
}

export function ImportedShowFolders({
  currency,
  locale
}: {
  currency: SupportedCurrency;
  locale: Locale;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folders = useBandosUIStore((state) => state.importedShowFolders);
  const crmCatalog = useBandosUIStore((state) => state.crmCatalog);
  const teamRoster = useBandosUIStore((state) => state.teamRoster);
  const vehicleCatalog = useBandosUIStore((state) => state.vehicleCatalog);
  const tourVehicleAssignments = useBandosUIStore((state) => state.tourVehicleAssignments);
  const updateImportedShowFolder = useBandosUIStore(
    (state) => state.updateImportedShowFolder
  );
  const updateImportedTourCurrency = useBandosUIStore(
    (state) => state.updateImportedTourCurrency
  );
  const updateImportedTourName = useBandosUIStore(
    (state) => state.updateImportedTourName
  );
  const addStandaloneShowFolder = useBandosUIStore(
    (state) => state.addStandaloneShowFolder
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
  const [crmBandContactId, setCrmBandContactId] = useState("");
  const [crmBandRole, setCrmBandRole] = useState<ImportedLocalAct["role"]>("support");
  const [validated, setValidated] = useState(false);
  const [status, setStatus] = useState<ImportedShowFolder["status"]>("pending");
  const [notes, setNotes] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [tourSaveMessage, setTourSaveMessage] = useState("");
  const [createStandaloneOpen, setCreateStandaloneOpen] = useState(false);
  const [createStandaloneVenue, setCreateStandaloneVenue] = useState("");
  const [createStandaloneDate, setCreateStandaloneDate] = useState("");
  const [createStandaloneCity, setCreateStandaloneCity] = useState("");
  const [createStandaloneCountry, setCreateStandaloneCountry] = useState("");
  const [createStandaloneAddress, setCreateStandaloneAddress] = useState("");
  const [createStandaloneCurrency, setCreateStandaloneCurrency] =
    useState<SupportedCurrency>(currency);
  const [createStandaloneError, setCreateStandaloneError] = useState("");
  const requestedTourName = searchParams.get("tour");
  const vehicleById = useMemo(
    () => new Map(vehicleCatalog.map((vehicle) => [vehicle.id, vehicle])),
    [vehicleCatalog]
  );
  const vehicleAssignmentByTour = useMemo(
    () =>
      new Map(
        tourVehicleAssignments.map((assignment) => [assignment.tourName, assignment] as const)
      ),
    [tourVehicleAssignments]
  );

  const sortedFolders = useMemo(
    () =>
      [...folders].sort((left, right) => {
        if (left.isStandalone !== right.isStandalone) {
          return left.isStandalone ? 1 : -1;
        }

        const dateComparison = compareShowFoldersByDate(left, right);

        if (dateComparison !== 0) {
          return dateComparison;
        }

        if (left.tourName !== right.tourName) {
          return left.tourName.localeCompare(right.tourName);
        }

        return left.folderName.localeCompare(right.folderName);
      }),
    [folders]
  );

  const standaloneFolders = useMemo(
    () =>
      sortedFolders
        .filter((folder) => folder.isStandalone)
        .sort(compareShowFoldersByDate),
    [sortedFolders]
  );

  const tourSourceFolders = useMemo(
    () =>
      sortedFolders
        .filter((folder) => !folder.isStandalone)
        .sort(compareShowFoldersByDate),
    [sortedFolders]
  );

  const tourGroups = useMemo<TourGroup[]>(
    () =>
      Array.from(
        tourSourceFolders.reduce((groups, folder) => {
          const currentGroup = groups.get(folder.tourName) ?? {
            tourName: folder.tourName,
            folders: [],
            validatedCount: 0,
            dateNightCosts: 0,
            totalNightCosts: 0,
            projectedNetAtEighty: 0,
            projectedShowsCount: 0,
            vehicleAssignment: null,
            assignedVehicle: null,
            tourCalendarDays: 0,
            tourVehicleCost: 0
          };

          currentGroup.folders.push(folder);
          currentGroup.validatedCount += folder.validated ? 1 : 0;
          currentGroup.dateNightCosts += getNightCostsTotal(folder);
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
        .map(([, group]) => {
          const folders = [...group.folders].sort(compareShowFoldersByDate);
          const vehicleAssignment = vehicleAssignmentByTour.get(group.tourName) ?? null;
          const assignedVehicle =
            (vehicleAssignment ? vehicleById.get(vehicleAssignment.vehicleId) : null) ?? null;
          const tourCalendarDays = getTourCalendarDayCount(folders);
          const tourVehicleCost = assignedVehicle
            ? assignedVehicle.estimatedDailyPrice * tourCalendarDays
            : 0;

          return {
            ...group,
            folders,
            totalNightCosts: group.dateNightCosts + tourVehicleCost,
            projectedNetAtEighty: group.projectedNetAtEighty - tourVehicleCost,
            vehicleAssignment,
            assignedVehicle,
            tourCalendarDays,
            tourVehicleCost
          };
        })
        .sort((left, right) => {
          const dateComparison = getTourFirstDateValue(left) - getTourFirstDateValue(right);

          if (dateComparison !== 0) {
            return dateComparison;
          }

          return left.tourName.localeCompare(right.tourName);
        }),
    [tourSourceFolders, vehicleAssignmentByTour, vehicleById]
  );

  const selectedTour = useMemo(
    () =>
      selectedTourName
        ? tourGroups.find((group) => group.tourName === selectedTourName) ?? null
        : null,
    [selectedTourName, tourGroups]
  );
  const selectedTourFolders = useMemo(
    () => (selectedTour ? [...selectedTour.folders].sort(compareShowFoldersByDate) : []),
    [selectedTour]
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
  const bandContacts = useMemo(
    () =>
      crmCatalog
        .filter((contact) => contact.kind === "band")
        .sort((left, right) => {
          if (left.status === right.status) {
            return left.company.localeCompare(right.company);
          }

          if (left.status === "confirmed") {
            return -1;
          }

          if (right.status === "confirmed") {
            return 1;
          }

          return left.company.localeCompare(right.company);
        }),
    [crmCatalog]
  );

  function resetStandaloneForm() {
    setCreateStandaloneVenue("");
    setCreateStandaloneDate("");
    setCreateStandaloneCity("");
    setCreateStandaloneCountry("");
    setCreateStandaloneAddress("");
    setCreateStandaloneCurrency(currency);
    setCreateStandaloneError("");
  }

  useEffect(() => {
    if (selectedTourName && !selectedTour) {
      setSelectedTourName(null);
      setSelectedFolderId(null);
    }
  }, [selectedTour, selectedTourName]);

  useEffect(() => {
    const matchingTour = requestedTourName
      ? tourGroups.find((group) => group.tourName === requestedTourName)?.tourName ?? null
      : null;

    if (matchingTour === selectedTourName) {
      return;
    }

    setSelectedTourName(matchingTour);

    if (!matchingTour) {
      setSelectedFolderId(null);
    }
  }, [requestedTourName, selectedTourName, tourGroups]);

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
      setCrmBandContactId("");
      setCrmBandRole("support");
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
        fee: formatEditableAmount(act.fee, effectiveCurrency),
        crmContactId: act.crmContactId ?? null
      }))
    );
    setCrmBandContactId("");
    setCrmBandRole("support");
    setValidated(selectedFolder.validated);
    setStatus(selectedFolder.status);
    setNotes(selectedFolder.notes);
    setSaveMessage("");
  }, [effectiveCurrency, selectedFolder]);

  useEffect(() => {
    if (!createStandaloneOpen) {
      setCreateStandaloneCurrency(currency);
    }
  }, [createStandaloneOpen, currency]);

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
        fee: "",
        crmContactId: null
      }
    ]);
  }

  function addCrmBandToDate() {
    const selectedBand = bandContacts.find((contact) => contact.id === crmBandContactId);

    if (!selectedBand) {
      return;
    }

    let alreadyAssigned = false;

    setLocalSupportActs((current) => {
      alreadyAssigned = current.some(
        (act) => act.crmContactId === selectedBand.id
      );

      if (alreadyAssigned) {
        return current;
      }

      return [
        ...current,
        {
          id: `crm-band-${selectedBand.id}-${Date.now()}`,
          name: selectedBand.company,
          role: crmBandRole,
          fee: formatEditableAmount(selectedBand.defaultFee, effectiveCurrency),
          crmContactId: selectedBand.id
        }
      ];
    });

    if (alreadyAssigned) {
      setSaveMessage(
        t(
          locale,
          `${selectedBand.company} est déjà assigné sur cette date.`,
          `${selectedBand.company} is already assigned to this show.`
        )
      );
      return;
    }

    setCrmBandContactId("");
    setSaveMessage(
      t(
        locale,
        `${selectedBand.company} assigné sur cette date.`,
        `${selectedBand.company} assigned to this show.`
      )
    );
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
            : null,
        crmContactId: act.crmContactId
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

  function updateFolderDate(id: string, nextDate: string) {
    if (!nextDate.trim()) {
      return;
    }

    updateImportedShowFolder(id, {
      date: nextDate.trim()
    });

    if (selectedFolderId === id) {
      setSaveMessage(
        t(locale, "Date du concert mise à jour.", "Show date updated.")
      );
    }
  }

  function createStandaloneFolder() {
    const normalizedVenue = createStandaloneVenue.trim();
    const normalizedDate = createStandaloneDate.trim();

    if (!normalizedVenue || !normalizedDate) {
      setCreateStandaloneError(
        t(
          locale,
          "Renseigne au minimum le nom de la salle et la date.",
          "Please enter at least the venue name and the date."
        )
      );
      return;
    }

    const folderId = addStandaloneShowFolder({
      venue: normalizedVenue,
      date: normalizedDate,
      city: createStandaloneCity.trim(),
      country: createStandaloneCountry.trim(),
      address: createStandaloneAddress.trim(),
      currency: createStandaloneCurrency
    });

    resetStandaloneForm();
    setCreateStandaloneOpen(false);
    router.push(`/app/shows/date/${encodeURIComponent(folderId)}`);
  }

  function openShowWorkspace(folderId: string, tourName?: string | null) {
    router.push(
      tourName
        ? `/app/shows/date/${encodeURIComponent(folderId)}?tour=${encodeURIComponent(tourName)}`
        : `/app/shows/date/${encodeURIComponent(folderId)}`
    );
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
    router.replace(`/app/shows?tour=${encodeURIComponent(resolvedTourName)}`);
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
  const hasManagedShows = tourGroups.length > 0 || standaloneFolders.length > 0;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-medium text-mist-50">
              {selectedTour
                ? t(locale, "Dates de la tournée", "Tour dates")
                : t(locale, "Tournées et dates uniques", "Tours and single dates")}
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
                    "Les imports créent des dossiers tournée et tu peux aussi créer ici des dates uniques à la main.",
                    "Imports create tour folders and you can also create manual single dates here."
                  )}
            </p>
          </div>
          {selectedTour ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSelectedFolderId(null);
                router.replace("/app/shows");
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              {t(locale, "Retour aux tournées", "Back to tours")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                resetStandaloneForm();
                setCreateStandaloneOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t(locale, "Ajouter une date unique", "Add single date")}
            </Button>
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
              {selectedTour.assignedVehicle ? (
                <p className="text-sm text-mist-300">
                  {t(locale, "Transport", "Transport")} • {selectedTour.assignedVehicle.name} •{" "}
                  {selectedTour.tourCalendarDays} {t(locale, "jour(s)", "day(s)")} •{" "}
                  {formatCurrency(
                    selectedTour.tourVehicleCost,
                    selectedTourFolders[0]?.tourCurrency ?? currency,
                    "GBP"
                  )}
                </p>
              ) : null}
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
                value={selectedTourFolders[0]?.tourCurrency ?? currency}
                onChange={(event) =>
                  changeTourCurrency(
                    selectedTour.tourName,
                    event.target.value as SupportedCurrency
                  )
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none sm:min-w-[180px] sm:w-auto"
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
          <div className="space-y-4">
            {!hasManagedShows ? (
              <EmptyState
                title={t(
                  locale,
                  "Aucune tournée ni date unique pour le moment",
                  "No tours or single dates yet"
                )}
                body={t(
                  locale,
                  "Valide un import depuis Tournée ou crée une date unique manuellement pour commencer à remplir Concerts.",
                  "Validate an import from Tour or create a manual single date to start filling Shows."
                )}
              />
            ) : null}

            {tourGroups.length ? (
              <Card className="overflow-hidden p-0">
                <div className="hidden xl:grid xl:grid-cols-[minmax(0,2.8fr)_128px_152px_190px_24px] xl:gap-4 xl:border-b xl:border-white/8 xl:px-6 xl:py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                    {t(locale, "Tournée", "Tour")}
                  </p>
                  <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                    {t(locale, "Dates validées", "Validated dates")}
                  </p>
                  <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                    {t(locale, "Coûts saisis", "Logged costs")}
                  </p>
                  <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                    {t(locale, "Projection 80%", "80% projection")}
                  </p>
                  <span />
                </div>

                <div className="divide-y divide-white/8">
                  {tourGroups.map((group) => {
                    const orderedDates = group.folders
                      .map((folder) => folder.date)
                      .filter(Boolean)
                      .sort(compareIsoDates);
                    const firstDate = orderedDates[0];
                    const lastDate = orderedDates[orderedDates.length - 1];
                    const groupCurrency = group.folders[0]?.tourCurrency ?? currency;

                    return (
                      <button
                        key={group.tourName}
                        type="button"
                        onClick={() => {
                          router.replace(`/app/shows?tour=${encodeURIComponent(group.tourName)}`);
                        }}
                        className="group w-full text-left transition hover:bg-coral-500/[0.04]"
                      >
                        <div className="flex flex-col gap-4 px-5 py-5 xl:grid xl:grid-cols-[minmax(0,2.8fr)_128px_152px_190px_24px] xl:items-center xl:gap-4 xl:px-6">
                          <div className="flex items-start gap-3 overflow-visible">
                            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                              <FolderClosed className="h-5 w-5 text-coral-300" />
                            </div>
                            <div className="relative min-w-0 overflow-visible xl:min-w-max">
                              <p className="relative whitespace-nowrap text-[0.9rem] font-semibold leading-snug text-mist-50 sm:text-[0.98rem] xl:text-[1.02rem]">
                                {group.tourName}
                              </p>
                              <p className="mt-1 text-sm text-mist-300">
                                {group.folders.length} {t(locale, "dates", "dates")} • {firstDate}
                                {lastDate && lastDate !== firstDate ? ` → ${lastDate}` : ""}
                              </p>
                              {group.assignedVehicle ? (
                                <p className="mt-1 text-xs text-mist-300">
                                  {group.assignedVehicle.name} • {group.tourCalendarDays}{" "}
                                  {t(locale, "jour(s)", "day(s)")} •{" "}
                                  {formatCurrency(group.tourVehicleCost, groupCurrency, "GBP")}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 xl:contents">
                            <div className="xl:relative xl:z-30 xl:bg-[linear-gradient(90deg,rgba(15,16,18,0),rgba(15,16,18,0.92)_18%,rgba(15,16,18,1)_100%)] xl:pl-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-mist-300 xl:hidden">
                                {t(locale, "Dates validées", "Validated dates")}
                              </p>
                              <p className="mt-1 text-sm font-medium text-mist-50 xl:mt-0">
                                {group.validatedCount}/{group.folders.length}
                              </p>
                            </div>
                            <div className="xl:relative xl:z-30 xl:bg-[linear-gradient(90deg,rgba(15,16,18,0),rgba(15,16,18,0.94)_18%,rgba(15,16,18,1)_100%)] xl:pl-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-mist-300 xl:hidden">
                                {t(locale, "Coûts saisis", "Logged costs")}
                              </p>
                              <p className="mt-1 text-sm font-medium text-mist-50 xl:mt-0">
                                {formatCurrency(group.totalNightCosts, groupCurrency, "GBP")}
                              </p>
                              {group.assignedVehicle ? (
                                <p className="mt-1 text-xs text-mist-300">
                                  {t(locale, "dates + van", "shows + vehicle")}
                                </p>
                              ) : null}
                            </div>
                            <div className="xl:relative xl:z-30 xl:bg-[linear-gradient(90deg,rgba(15,16,18,0),rgba(15,16,18,0.94)_12%,rgba(15,16,18,1)_100%)] xl:pl-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-mist-300 xl:hidden">
                                {t(locale, "Projection 80%", "80% projection")}
                              </p>
                              <p className="mt-1 text-sm font-medium text-mist-50 xl:mt-0">
                                {group.projectedShowsCount
                                  ? `${group.projectedNetAtEighty >= 0 ? "+" : "-"}${formatCurrency(
                                      Math.abs(group.projectedNetAtEighty),
                                      groupCurrency,
                                      "GBP"
                                    )}`
                                  : "—"}
                              </p>
                              <p className="mt-1 text-xs text-mist-300">
                                {group.projectedShowsCount
                                  ? t(
                                      locale,
                                      `${group.projectedShowsCount} date(s) prises en compte`,
                                      `${group.projectedShowsCount} show(s) included`
                                    )
                                  : t(
                                      locale,
                                      "Renseigne jauge + billet",
                                      "Add capacity + ticket price"
                                    )}
                              </p>
                            </div>
                          </div>

                          <div className="hidden justify-self-end xl:relative xl:z-30 xl:block">
                            <ChevronRight className="h-5 w-5 text-mist-300 transition group-hover:text-coral-200" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4 xl:px-6">
                <div>
                  <p className="text-sm font-medium text-mist-50">
                    {t(locale, "Dates uniques", "Single dates")}
                  </p>
                  <p className="mt-1 text-sm text-mist-300">
                    {t(
                      locale,
                      "Concerts créés à la main hors import tournée.",
                      "Shows created manually outside a tour import."
                    )}
                  </p>
                </div>
                <Badge>{standaloneFolders.length}</Badge>
              </div>

              {standaloneFolders.length ? (
                <div className="divide-y divide-white/8">
                  {standaloneFolders.map((folder) => {
                    const folderCurrency = folder.tourCurrency ?? currency;
                    const totalCosts = getNightCostsTotal(folder);

                    return (
                      <div
                        key={folder.id}
                        className="flex flex-col gap-4 px-5 py-5 xl:flex-row xl:items-center xl:justify-between xl:px-6"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => openShowWorkspace(folder.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openShowWorkspace(folder.id);
                            }
                          }}
                          className="flex-1 cursor-pointer text-left"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                        <p className="whitespace-nowrap text-lg font-semibold text-mist-50">
                          {folder.folderName}
                        </p>
                            <label
                              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-mist-100 transition focus-within:border-coral-400/40 focus-within:bg-white/[0.07]"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <input
                                type="date"
                                value={folder.date}
                                onChange={(event) =>
                                  updateFolderDate(folder.id, event.target.value)
                                }
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                                className="w-[126px] bg-transparent text-xs font-medium text-mist-100 outline-none [color-scheme:dark]"
                                aria-label={t(
                                  locale,
                                  "Modifier la date du concert",
                                  "Edit show date"
                                )}
                              />
                            </label>
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
                          <p className="mt-2 text-sm text-mist-300">
                            {[folder.city, folder.country].filter(Boolean).join(", ") ||
                              t(locale, "Ville à renseigner", "City to add")}
                          </p>
                          <p className="mt-2 text-sm text-mist-200">
                            {folder.address || t(locale, "Adresse à renseigner", "Address to add")}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-mist-300">
                            <span>
                              {t(locale, "Coûts saisis", "Logged costs")}{" "}
                              {formatCurrency(totalCosts, folderCurrency, "GBP")}
                            </span>
                            <span>
                              {t(locale, "Devise", "Currency")}{" "}
                              {supportedCurrencyMeta[folderCurrency].label}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => openShowWorkspace(folder.id)}
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
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-8 xl:px-6">
                  <EmptyState
                    title={t(
                      locale,
                      "Aucune date unique pour l'instant",
                      "No single date yet"
                    )}
                    body={t(
                      locale,
                      "Crée un concert hors tournée pour l'éditer ensuite comme une fiche date complète.",
                      "Create an off-tour show to edit it next as a full show sheet."
                    )}
                  />
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedTourFolders.map((folder) => {
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
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openShowWorkspace(folder.id, folder.tourName)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openShowWorkspace(folder.id, folder.tourName);
                        }
                      }}
                      className="flex-1 cursor-pointer text-left"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="whitespace-nowrap text-xl font-semibold text-mist-50">
                          {folder.folderName}
                        </p>
                        <label
                          className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-mist-100 transition focus-within:border-coral-400/40 focus-within:bg-white/[0.07]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="date"
                            value={folder.date}
                            onChange={(event) =>
                              updateFolderDate(folder.id, event.target.value)
                            }
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                            className="w-[126px] bg-transparent text-xs font-medium text-mist-100 outline-none [color-scheme:dark]"
                            aria-label={t(
                              locale,
                              "Modifier la date du concert",
                              "Edit show date"
                            )}
                          />
                        </label>
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
                    </div>

                    <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openShowWorkspace(folder.id, folder.tourName)}
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
        open={createStandaloneOpen}
        onClose={() => {
          setCreateStandaloneOpen(false);
          resetStandaloneForm();
        }}
        title={t(locale, "Ajouter une date unique", "Add single date")}
        description={t(
          locale,
          "Crée un concert hors tournée directement dans Concerts. Tu pourras ensuite compléter toute la fiche date.",
          "Create an off-tour show directly in Shows. You can then complete the full show sheet."
        )}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Nom de la salle", "Venue name")}
              </span>
              <Input
                value={createStandaloneVenue}
                onChange={(event) => {
                  setCreateStandaloneVenue(event.target.value);
                  setCreateStandaloneError("");
                }}
                placeholder={t(locale, "Le Ferrailleur", "The Black Heart")}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Date", "Date")}
              </span>
              <Input
                type="date"
                value={createStandaloneDate}
                onChange={(event) => {
                  setCreateStandaloneDate(event.target.value);
                  setCreateStandaloneError("");
                }}
                className="[color-scheme:dark]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Ville", "City")}
              </span>
              <Input
                value={createStandaloneCity}
                onChange={(event) => setCreateStandaloneCity(event.target.value)}
                placeholder={t(locale, "Paris", "Paris")}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Pays", "Country")}
              </span>
              <Input
                value={createStandaloneCountry}
                onChange={(event) => setCreateStandaloneCountry(event.target.value)}
                placeholder={t(locale, "France", "France")}
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Adresse", "Address")}
            </span>
            <Input
              value={createStandaloneAddress}
              onChange={(event) => setCreateStandaloneAddress(event.target.value)}
              placeholder={t(
                locale,
                "Adresse complète de la salle",
                "Full venue address"
              )}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Devise", "Currency")}
            </span>
            <select
              value={createStandaloneCurrency}
              onChange={(event) =>
                setCreateStandaloneCurrency(event.target.value as SupportedCurrency)
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

          {createStandaloneError ? (
            <p className="text-sm text-amber-300">{createStandaloneError}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateStandaloneOpen(false);
                resetStandaloneForm();
              }}
            >
              {t(locale, "Annuler", "Cancel")}
            </Button>
            <Button type="button" onClick={createStandaloneFolder}>
              {t(locale, "Créer la date", "Create show")}
            </Button>
          </div>
        </div>
      </Modal>

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

              <div className="grid gap-3 rounded-[20px] border border-white/8 bg-black/10 p-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                    {t(locale, "Assigner depuis le CRM", "Assign from CRM")}
                  </span>
                  <select
                    value={crmBandContactId}
                    onChange={(event) => setCrmBandContactId(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                  >
                    <option value="" className="bg-graphite-900">
                      {bandContacts.length
                        ? t(locale, "Choisir un groupe", "Choose a band")
                        : t(locale, "Aucun groupe CRM", "No CRM band yet")}
                    </option>
                    {bandContacts.map((contact) => (
                      <option
                        key={contact.id}
                        value={contact.id}
                        className="bg-graphite-900"
                      >
                        {contact.company}
                        {typeof contact.defaultFee === "number"
                          ? ` • ${formatCurrency(contact.defaultFee, effectiveCurrency, "GBP")}`
                          : ""}
                        {` • ${translateCrmStatus(locale, contact.status)}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                    {t(locale, "Rôle de la date", "Show role")}
                  </span>
                  <select
                    value={crmBandRole}
                    onChange={(event) =>
                      setCrmBandRole(event.target.value as ImportedLocalAct["role"])
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
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addCrmBandToDate}
                    disabled={!crmBandContactId}
                    className="w-full md:w-auto"
                  >
                    {t(locale, "Assigner à la date", "Assign to show")}
                  </Button>
                </div>
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
                        {act.crmContactId ? (
                          <p className="text-xs text-coral-300">
                            {t(locale, "Assigné depuis le CRM", "Assigned from CRM")}
                          </p>
                        ) : null}
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
