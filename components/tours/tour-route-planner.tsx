"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  FileSpreadsheet,
  LoaderCircle,
  MapPinned,
  Route as RouteIcon,
  Trash2,
  Upload
} from "lucide-react";

import { RoutePolylinePreview } from "@/components/tours/route-polyline-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { t, type Locale } from "@/lib/i18n";
import { getRoutePointsForTour, tours } from "@/lib/mock-data";
import type { RouteComputationResult, RoutePlannerRequest } from "@/lib/routing/types";
import type {
  ImportedTourStop,
  TourImportResponse
} from "@/lib/tours/import-types";
import {
  formatCurrency,
  supportedCurrencyMeta,
  type SupportedCurrency
} from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";

function formatDistance(distanceMeters: number) {
  return `${Math.round(distanceMeters / 1000).toLocaleString("en-GB")} km`;
}

function formatDuration(durationSeconds: number) {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.round((durationSeconds % 3600) / 60);
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function estimateFuel(distanceMeters: number) {
  const liters = (distanceMeters / 1000 / 100) * 12.5;
  return {
    liters,
    costEur: liters * 1.78
  };
}

const routingOptions = {
  avoidFerries: false,
  avoidHighways: false,
  avoidTolls: false,
  departureTime: null
} as const;

const templateCsv = [
  "date,venue,city,country,address",
  "2026-05-23,The Black Heart,London,UK,3 Greenland Place London",
  "2026-05-25,The Peer Hat,Manchester,UK,14-16 Faraday Street Manchester",
  "2026-05-27,Audio,Glasgow,UK,14 Midland Street Glasgow"
].join("\n");

function buildSampleStops(locale: Locale): ImportedTourStop[] {
  const activeTour = tours[0];
  const routePoints = getRoutePointsForTour(activeTour.id);

  return routePoints.map((point, index) => ({
    id: `sample-stop-${index + 1}`,
    date: activeTour.stops[index]?.date ?? `Stop ${index + 1}`,
    venue: point.venue,
    city: point.city,
    country: point.country,
    address: point.address,
    label: `${point.city} • ${point.venue}`,
    location: point.address
      ? [point.address, point.city, point.country].filter(Boolean).join(", ")
      : `${point.venue}, ${point.city}, ${point.country}`
  }));
}

type RouteTimelineEntry = {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  location: string;
  date?: string;
  kind: "start" | "show" | "return";
  stopIndex: number | null;
};

export function TourRoutePlanner({
  currency,
  locale,
  showDemoData
}: {
  currency: SupportedCurrency;
  locale: Locale;
  showDemoData: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tourName, setTourName] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const [tourCurrency, setTourCurrency] = useState<SupportedCurrency>(currency);
  const [stops, setStops] = useState<ImportedTourStop[]>([]);
  const [startAddressDraft, setStartAddressDraft] = useState("");
  const [returnAddressDraft, setReturnAddressDraft] = useState("");
  const [startAddressApplied, setStartAddressApplied] = useState("");
  const [returnAddressApplied, setReturnAddressApplied] = useState("");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [result, setResult] = useState<RouteComputationResult | null>(null);
  const upsertImportedTourShows = useBandosUIStore(
    (state) => state.upsertImportedTourShows
  );

  const routeEntries = useMemo<RouteTimelineEntry[]>(() => {
    const entries: RouteTimelineEntry[] = [];

    if (startAddressApplied.trim()) {
      entries.push({
        id: "route-start",
        title: t(locale, "Départ", "Departure"),
        subtitle: t(locale, "Studio / home base", "Studio / home base"),
        address: startAddressApplied.trim(),
        location: startAddressApplied.trim(),
        kind: "start",
        stopIndex: null
      });
    }

    stops.forEach((stop, stopIndex) => {
      entries.push({
        id: stop.id,
        title: stop.venue,
        subtitle: [stop.city, stop.country].filter(Boolean).join(", "),
        address: stop.address || stop.location,
        location: stop.location,
        date: stop.date,
        kind: "show",
        stopIndex
      });
    });

    if (returnAddressApplied.trim()) {
      entries.push({
        id: "route-return",
        title: t(locale, "Retour", "Return"),
        subtitle: t(locale, "Back to base", "Back to base"),
        address: returnAddressApplied.trim(),
        location: returnAddressApplied.trim(),
        kind: "return",
        stopIndex: null
      });
    }

    return entries;
  }, [locale, returnAddressApplied, startAddressApplied, stops]);

  const routePoints = useMemo(
    () =>
      routeEntries.map((entry) => ({
        id: entry.id,
        label: entry.title,
        location: entry.location,
        kind: entry.kind
      })),
    [routeEntries]
  );

  const legByConnectionKey = useMemo(() => {
    return new Map(
      (result?.legs ?? []).map((leg) => [
        `${leg.fromPointId ?? "unknown"}::${leg.toPointId ?? "unknown"}`,
        leg
      ])
    );
  }, [result?.legs]);

  useEffect(() => {
    if (routePoints.length < 2) {
      setResult(null);
      setRouteError(null);
      return;
    }

    const controller = new AbortController();

    async function computeRoute() {
      setIsRouting(true);
      setRouteError(null);

      try {
        const payload: RoutePlannerRequest = {
          tourId: tourName || "imported-tour",
          points: routePoints,
          options: routingOptions
        };
        const response = await fetch("/api/routing/compute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        if (!response.ok) {
          const failure = (await response.json()) as { error?: string };
          throw new Error(
            failure.error ??
              t(locale, "Le calcul d'itinéraire a échoué.", "Route computation failed.")
          );
        }

        const data = (await response.json()) as RouteComputationResult;
        setResult(data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setRouteError(
          error instanceof Error
            ? error.message
            : t(locale, "Le calcul d'itinéraire a échoué.", "Route computation failed.")
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsRouting(false);
        }
      }
    }

    void computeRoute();

    return () => controller.abort();
  }, [locale, routePoints, tourName]);

  async function handleImport(file: File) {
    setIsImporting(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/tours/import", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as
        | TourImportResponse
        | { error?: string };

      if (!response.ok || !("stops" in payload)) {
        const failure =
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : null;
        throw new Error(
          failure ??
            t(locale, "Impossible d'importer ce fichier.", "Unable to import this file.")
        );
      }

      setTourName(payload.tourName);
      setSourceFileName(payload.fileName);
      setStops(payload.stops);
      setImportWarnings(payload.warnings);
      setValidationMessage(null);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : t(locale, "Impossible d'importer ce fichier.", "Unable to import this file.")
      );
    } finally {
      setIsImporting(false);
    }
  }

  function moveStop(index: number, direction: "up" | "down") {
    setStops((current) => {
      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const updated = [...current];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  }

  function removeStop(index: number) {
    setStops((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setValidationMessage(null);
  }

  function loadSampleTour() {
    setTourName("Northbound Ruin 2026");
    setSourceFileName(t(locale, "Exemple BandOS", "BandOS sample"));
    setTourCurrency(currency);
    setStops(buildSampleStops(locale));
    setImportWarnings([]);
    setImportError(null);
    setValidationMessage(null);
  }

  function applyBoundaryAddresses() {
    setStartAddressApplied(startAddressDraft.trim());
    setReturnAddressApplied(returnAddressDraft.trim());
  }

  function validateImportToShows() {
    if (!stops.length) {
      return;
    }

    const createdCount = upsertImportedTourShows({
      tourName: tourName || sourceFileName || "Imported tour",
      currency: tourCurrency,
      stops
    });

    setValidationMessage(
      createdCount > 0
        ? t(
            locale,
            `${createdCount} dossier(s) créé(s) dans Concerts.`,
            `${createdCount} folder(s) created in Shows.`
          )
        : t(
            locale,
            "Import mis à jour dans Concerts.",
            "Import updated in Shows."
          )
    );
  }

  const totalFuel = estimateFuel(result?.distanceMeters ?? 0);
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv)}`;

  return (
    <div className="space-y-6">
      <Card className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Badge tone="accent">
              {t(locale, "Import tournée", "Tour import")}
            </Badge>
            <h2 className="mt-3 text-3xl font-semibold text-mist-50">
              {t(
                locale,
                "Importe les dates, réordonne-les et visualise toute la tournée",
                "Import dates, reorder them, and visualize the full tour"
              )}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-mist-300">
              {t(
                locale,
                "Charge un CSV ou un fichier Excel `.xlsx`, affiche la liste des dates, intervertis les points dans l'ordre de passage et laisse BandOS recalculer les kilomètres et le coût de route date par date.",
                "Upload a CSV or `.xlsx` file, render the full date list, swap stops in running order, and let BandOS recalculate mileage and road cost for every date."
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImport(file);
                }
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {t(locale, "Importer un fichier", "Import file")}
            </Button>
            <a
              href={templateHref}
              download="bandos-tour-template.csv"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-mist-50 transition hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              {t(locale, "Modèle CSV", "CSV template")}
            </a>
            {showDemoData ? (
              <Button type="button" onClick={loadSampleTour}>
                <FileSpreadsheet className="h-4 w-4" />
                {t(locale, "Charger un exemple", "Load sample")}
              </Button>
            ) : null}
            {stops.length ? (
              <Button type="button" onClick={validateImportToShows}>
                {t(locale, "Valider l'import", "Validate import")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-mist-300">
          {t(
            locale,
            "Colonnes attendues: date, venue, city, country, address. Les en-têtes FR et EN sont acceptés. Pour des distances fiables, renseigne de vraies adresses postales.",
            "Expected columns: date, venue, city, country, address. Both FR and EN headers are accepted. For reliable mileage, use real street addresses."
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Adresse de départ", "Departure address")}
            </span>
            <Input
              value={startAddressDraft}
              onChange={(event) => setStartAddressDraft(event.target.value)}
              placeholder={t(
                locale,
                "Studio, local, maison, dépôt...",
                "Studio, lockup, house, depot..."
              )}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Adresse de retour", "Return address")}
            </span>
            <Input
              value={returnAddressDraft}
              onChange={(event) => setReturnAddressDraft(event.target.value)}
              placeholder={t(
                locale,
                "Retour base / studio / maison",
                "Return base / studio / home"
              )}
            />
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={applyBoundaryAddresses}
              className="w-full xl:w-auto"
            >
              {t(locale, "Appliquer au routing", "Apply to routing")}
            </Button>
          </div>
        </div>

        {stops.length ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Devise de la tournée", "Tour currency")}
              </span>
              <select
                value={tourCurrency}
                onChange={(event) =>
                  setTourCurrency(event.target.value as SupportedCurrency)
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
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-mist-300">
              <p className="text-sm text-mist-200">
                {t(
                  locale,
                  "Cette devise sera appliquée à toute la tournée lors de la validation, puis à chaque date dans Concerts.",
                  "This currency will be applied to the full tour on validation, then to every date in Shows."
                )}
              </p>
            </div>
          </div>
        ) : null}

        {importError ? (
          <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            {importError}
          </div>
        ) : null}

        {importWarnings.length ? (
          <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            {importWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {validationMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
            {validationMessage}
          </div>
        ) : null}

        {result?.warnings.length ? (
          <div
            className={`rounded-[24px] p-4 text-sm ${
              result.source === "demo"
                ? "border border-amber-400/20 bg-amber-400/10 text-amber-100"
                : "border border-white/8 bg-white/[0.03] text-mist-200"
            }`}
          >
            <p className="font-medium text-mist-50">
              {result.source === "demo"
                ? t(
                    locale,
                    "Routage live indisponible",
                    "Live routing unavailable"
                  )
                : t(locale, "Infos de routage", "Routing info")}
            </p>
            <div className="mt-2 space-y-1">
              {result.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
            {result.source === "demo" ? (
              <p className="mt-3">
                {t(
                  locale,
                  "Les kilomètres et durées de secours ne sont pas fiables. Vérifie les adresses des dates importées pour relancer un calcul réel.",
                  "Fallback mileage and durations are not reliable. Check imported stop addresses to trigger a real route calculation."
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        {stops.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Dates importées", "Imported dates")}
                </p>
                <p className="mt-3 text-3xl font-semibold text-mist-50">{stops.length}</p>
                <p className="mt-2 text-sm text-mist-300">{tourName || sourceFileName}</p>
              </Card>
              <Card className="p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Distance totale", "Total distance")}
                </p>
                <p className="mt-3 text-3xl font-semibold text-mist-50">
                  {result && result.source !== "demo"
                    ? formatDistance(result.distanceMeters)
                    : "—"}
                </p>
                <p className="mt-2 text-sm text-mist-300">
                  {isRouting
                    ? t(locale, "Recalcul en cours", "Recomputing route")
                    : result?.source === "demo"
                      ? t(locale, "En attente d'un calcul live", "Waiting for a live route")
                      : sourceFileName}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                  {t(locale, "Coût route estimé", "Estimated road cost")}
                </p>
                <p className="mt-3 text-3xl font-semibold text-mist-50">
                  {result && result.source !== "demo"
                    ? formatCurrency(totalFuel.costEur, tourCurrency, "EUR")
                    : "—"}
                </p>
                <p className="mt-2 text-sm text-mist-300">
                  {result && result.source !== "demo"
                    ? `${totalFuel.liters.toFixed(1)} L • ${t(
                        locale,
                        "base carburant",
                        "fuel basis"
                      )}`
                    : t(locale, "Calcul live requis", "Live routing required")}
                </p>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-medium text-mist-50">
                      {t(locale, "Ordre de tournée", "Tour order")}
                    </p>
                    <p className="mt-2 text-sm text-mist-300">
                      {t(
                        locale,
                        "Interchange les points avec les flèches. Le routing, les kilomètres et le coût se recalculent automatiquement.",
                        "Swap stops with the arrows. Routing, mileage, and route cost update automatically."
                      )}
                    </p>
                  </div>
                  {isRouting ? (
                    <Badge tone="accent">
                      <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />
                      {t(locale, "Recalcul", "Recomputing")}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-5 space-y-3">
                  {routeEntries.map((entry, index) => {
                    const previousEntry = index > 0 ? routeEntries[index - 1] : null;
                    const leg = previousEntry
                      ? legByConnectionKey.get(`${previousEntry.id}::${entry.id}`)
                      : undefined;
                    const legFuel = leg ? estimateFuel(leg.distanceMeters) : null;
                    const isMovable = entry.kind === "show" && entry.stopIndex !== null;
                    const canShowLiveLegMetrics = Boolean(
                      leg && result?.source !== "demo"
                    );

                    return (
                      <div
                        key={entry.id}
                        className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-lg font-medium text-mist-50">
                                {entry.title}
                              </p>
                              {entry.date ? <Badge>{entry.date}</Badge> : null}
                              <Badge
                                tone={
                                  entry.kind === "start"
                                    ? "success"
                                    : entry.kind === "return"
                                      ? "accent"
                                      : "neutral"
                                }
                              >
                                {index + 1}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-mist-300">
                              {entry.subtitle}
                            </p>
                            <p className="mt-2 text-sm text-mist-200">
                              {entry.address}
                            </p>
                            {leg ? (
                              <div className="mt-3 space-y-1">
                                <p className="text-sm text-mist-300">
                                  {t(locale, "Depuis", "From")} {previousEntry?.title}
                                </p>
                                {canShowLiveLegMetrics ? (
                                  <p className="text-sm text-coral-300">
                                    {formatDistance(leg.distanceMeters)} •{" "}
                                    {formatDuration(leg.durationSeconds)} •{" "}
                                    {formatCurrency(
                                      legFuel?.costEur ?? 0,
                                      tourCurrency,
                                      "EUR"
                                    )}
                                  </p>
                                ) : (
                                  <p className="text-sm text-amber-200">
                                    {previousEntry?.kind === "start" ||
                                    entry.kind === "return"
                                      ? t(
                                          locale,
                                          "Segment indisponible: vérifie l'adresse de départ ou de retour pour l'inclure au routing live.",
                                          "Segment unavailable: verify the departure or return address to include it in live routing."
                                        )
                                      : t(
                                          locale,
                                          "Distance indisponible tant que le routage live n'a pas abouti.",
                                          "Distance unavailable until live routing succeeds."
                                        )}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-mist-300">
                                {t(locale, "Point de départ", "Starting point")}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                isMovable && entry.stopIndex !== null
                                  ? moveStop(entry.stopIndex, "up")
                                  : undefined
                              }
                              disabled={!isMovable || entry.stopIndex === 0}
                              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-mist-200 transition hover:bg-white/10 hover:text-mist-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                isMovable && entry.stopIndex !== null
                                  ? moveStop(entry.stopIndex, "down")
                                  : undefined
                              }
                              disabled={
                                !isMovable ||
                                entry.stopIndex === null ||
                                entry.stopIndex === stops.length - 1
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-mist-200 transition hover:bg-white/10 hover:text-mist-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            {isMovable ? (
                              <button
                                type="button"
                                onClick={() => removeStop(entry.stopIndex ?? index)}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-mist-200 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
                                aria-label={t(locale, "Supprimer la date", "Delete date")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div className="space-y-4">
                <Card>
                  <p className="text-lg font-medium text-mist-50">
                    {t(locale, "Plan de route", "Route plan")}
                  </p>
                  <div className="mt-5">
                    <RoutePolylinePreview polyline={result?.polyline ?? null} locale={locale} />
                  </div>
                  {routeError ? (
                    <div className="mt-4 rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                      {routeError}
                    </div>
                  ) : null}
                </Card>

                {result ? (
                  <Card>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={result.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-coral-500 px-4 text-sm font-medium text-white transition hover:bg-coral-400"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t(locale, "Google Maps", "Google Maps")}
                      </a>
                      {result.openStreetMapUrl ? (
                        <a
                          href={result.openStreetMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-mist-50 transition hover:bg-white/10"
                        >
                          <MapPinned className="h-4 w-4" />
                          OpenStreetMap
                        </a>
                      ) : null}
                      <a
                        href={result.mappyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-mist-50 transition hover:bg-white/10"
                      >
                        <RouteIcon className="h-4 w-4" />
                        Mappy
                      </a>
                    </div>
                  </Card>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title={t(
              locale,
              "Importe ta tournée pour commencer",
              "Import your tour to get started"
            )}
            body={t(
              locale,
              "Charge un CSV ou un `.xlsx` pour afficher les dates, calculer le routing et obtenir une vision simple de toute la tournée.",
              "Upload a CSV or `.xlsx` file to render your dates, calculate routing, and get a simple view of the whole run."
            )}
          />
        )}
      </Card>
    </div>
  );
}
