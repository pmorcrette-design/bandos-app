"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Boxes,
  BrainCircuit,
  ClipboardList,
  MessageSquareMore,
  PackageSearch,
  RefreshCw,
  RotateCcw,
  SendHorizontal,
  ShoppingCart,
  Sparkles
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  answerMerchAssistantQuestion,
  buildMerchForecast,
  buildMerchSalesAnalytics,
  generateMerchPurchaseOrder,
  type ForecastSumUpSale
} from "@/lib/merch-forecast";
import { t, type Locale } from "@/lib/i18n";
import { convertCurrency, formatCurrency, type SupportedCurrency } from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";

const textareaClassName =
  "min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition placeholder:text-mist-300/70 focus:border-coral-500/50 focus:bg-white/[0.07]";

function parseNumericInput(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value * 10) / 10}%`;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

type AssistantChatMessage = {
  id: string;
  role: "assistant" | "user";
  title?: string;
  text: string;
  bullets?: string[];
};

function buildAssistantIntroMessage(
  locale: Locale,
  unitsToProduce: number,
  bestMarginProduct: string | null
): AssistantChatMessage {
  return {
    id: `assistant-intro-${Date.now()}`,
    role: "assistant",
    title: "BandOS Merch Bot",
    text: t(
      locale,
      "Je peux t'aider à lire la projection merch, repérer les risques de rupture, comparer les designs et te préparer une commande fournisseur réaliste.",
      "I can help you read the merch forecast, spot stockout risks, compare designs, and prepare a realistic supplier order."
    ),
    bullets: [
      t(
        locale,
        `Projection active: ${unitsToProduce} unités à produire sur le scope courant.`,
        `Active forecast: ${unitsToProduce} units to produce in the current scope.`
      ),
      bestMarginProduct
        ? t(
            locale,
            `Meilleure marge potentielle en ce moment: ${bestMarginProduct}.`,
            `Best potential margin right now: ${bestMarginProduct}.`
          )
        : t(
            locale,
            "Les coûts produits manquent encore sur certaines références.",
            "Some product costs are still missing."
          )
    ]
  };
}

export function MerchForecastView({
  locale,
  currency,
  workspaceName,
  initialSales,
  initialError,
  sumupConnected
}: {
  locale: Locale;
  currency: SupportedCurrency;
  workspaceName: string;
  initialSales: ForecastSumUpSale[];
  initialError: string | null;
  sumupConnected: boolean;
}) {
  const merchCatalog = useBandosUIStore((state) => state.merchCatalog);
  const merchDesigns = useBandosUIStore((state) => state.merchDesigns);
  const merchPurchaseOrders = useBandosUIStore((state) => state.merchPurchaseOrders);
  const importedShowFolders = useBandosUIStore((state) => state.importedShowFolders);
  const saveMerchPurchaseOrder = useBandosUIStore((state) => state.saveMerchPurchaseOrder);
  const updateMerchPurchaseOrder = useBandosUIStore((state) => state.updateMerchPurchaseOrder);
  const deleteMerchPurchaseOrder = useBandosUIStore((state) => state.deleteMerchPurchaseOrder);
  const [sales, setSales] = useState(initialSales);
  const [syncError, setSyncError] = useState(initialError);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>(() =>
    initialError
      ? [`${new Date().toLocaleTimeString()} • ${initialError}`]
      : [`${new Date().toLocaleTimeString()} • SumUp merch sync ready`]
  );
  const [scope, setScope] = useState("all-upcoming");
  const [eventType, setEventType] = useState<"club" | "festival" | "headline" | "support">(
    "headline"
  );
  const [season, setSeason] = useState<"winter" | "spring" | "summer" | "autumn">("summer");
  const [occupancyRate, setOccupancyRate] = useState("0.8");
  const [budgetMax, setBudgetMax] = useState("");
  const [designFilter, setDesignFilter] = useState("all");
  const [productTypeFilter, setProductTypeFilter] = useState("all");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AssistantChatMessage[]>([]);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const assistantReplyNonceRef = useRef(0);
  const [orderSupplier, setOrderSupplier] = useState("All suppliers");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const upcomingShows = useMemo(
    () =>
      importedShowFolders
        .filter((show) => show.date >= getToday())
        .sort((left, right) => left.date.localeCompare(right.date)),
    [importedShowFolders]
  );

  const scopeOptions = useMemo(() => {
    const tourNames = Array.from(
      new Set(
        upcomingShows
          .filter((show) => !show.isStandalone)
          .map((show) => show.tourName)
      )
    );

    return [
      { value: "all-upcoming", label: t(locale, "Toutes les dates à venir", "All upcoming dates") },
      ...tourNames.map((tourName) => ({
        value: `tour:${tourName}`,
        label: tourName
      })),
      ...(upcomingShows.some((show) => show.isStandalone)
        ? [
            {
              value: "standalone",
              label: t(locale, "Dates uniques", "Standalone dates")
            }
          ]
        : [])
    ];
  }, [locale, upcomingShows]);

  const selectedShows = useMemo(() => {
    if (scope === "all-upcoming") {
      return upcomingShows;
    }

    if (scope === "standalone") {
      return upcomingShows.filter((show) => show.isStandalone);
    }

    if (scope.startsWith("tour:")) {
      const tourName = scope.slice(5);
      return upcomingShows.filter((show) => show.tourName === tourName);
    }

    return upcomingShows;
  }, [scope, upcomingShows]);

  const analytics = useMemo(
    () =>
      buildMerchSalesAnalytics({
        products: merchCatalog,
        designs: merchDesigns,
        shows: importedShowFolders,
        sales,
        occupancyRate: Math.max(parseNumericInput(occupancyRate), 0.25)
      }),
    [importedShowFolders, merchCatalog, merchDesigns, occupancyRate, sales]
  );

  const forecast = useMemo(
    () =>
      buildMerchForecast({
        products: merchCatalog,
        designs: merchDesigns,
        sales,
        scenario: {
          label:
            scope === "all-upcoming"
              ? t(locale, "Toutes les dates à venir", "All upcoming dates")
              : scope.startsWith("tour:")
                ? scope.slice(5)
                : t(locale, "Dates uniques", "Standalone dates"),
          eventType,
          season,
          occupancyRate: Math.max(parseNumericInput(occupancyRate), 0.25),
          budgetMax: budgetMax.trim()
            ? convertCurrency(
                Math.max(parseNumericInput(budgetMax), 0),
                currency,
                "GBP"
              )
            : null,
          shows: selectedShows.map((show) => ({
            id: show.id,
            tourName: show.tourName,
            date: show.date,
            venue: show.venue,
            city: show.city,
            country: show.country,
            capacity: show.capacity,
            validated: show.validated,
            isStandalone: show.isStandalone,
            status: show.status
          }))
        }
      }),
    [
      budgetMax,
      currency,
      eventType,
      locale,
      merchCatalog,
      merchDesigns,
      occupancyRate,
      sales,
      scope,
      season,
      selectedShows
    ]
  );

  const filteredAnalyticsProducts = useMemo(
    () =>
      analytics.products.filter((product) => {
        if (designFilter !== "all" && (product.designId ?? "none") !== designFilter) {
          return false;
        }

        if (productTypeFilter !== "all" && product.productType !== productTypeFilter) {
          return false;
        }

        return true;
      }),
    [analytics.products, designFilter, productTypeFilter]
  );

  const filteredForecastLines = useMemo(
    () =>
      forecast.lines.filter((line) => {
        if (designFilter !== "all" && (line.designId ?? "none") !== designFilter) {
          return false;
        }

        if (productTypeFilter !== "all" && line.productType !== productTypeFilter) {
          return false;
        }

        return true;
      }),
    [designFilter, forecast.lines, productTypeFilter]
  );

  const supplierOptions = useMemo(() => {
    const suppliers = Array.from(
      new Set(
        filteredForecastLines
          .filter((line) => line.recommendedToProduce > 0)
          .map((line) => line.supplier)
      )
    );

    return ["All suppliers", ...suppliers];
  }, [filteredForecastLines]);

  const currentOrder = useMemo(
    () => merchPurchaseOrders.find((order) => order.id === selectedOrderId) ?? null,
    [merchPurchaseOrders, selectedOrderId]
  );

  useEffect(() => {
    if (assistantMessages.length > 0) {
      return;
    }

    setAssistantMessages([
      buildAssistantIntroMessage(
        locale,
        forecast.totals.unitsToProduce,
        forecast.assistantFacts.bestMarginProduct
      )
    ]);
  }, [
    assistantMessages.length,
    forecast.assistantFacts.bestMarginProduct,
    forecast.totals.unitsToProduce,
    locale
  ]);

  async function refreshSales() {
    setIsRefreshing(true);
    setSyncError(null);

    try {
      const response = await fetch("/api/integrations/sumup/forecast", {
        method: "GET",
        cache: "no-store"
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            sales?: ForecastSumUpSale[];
          }
        | null;

      if (!response.ok || !payload?.ok || !payload.sales) {
        throw new Error(
          payload?.error ||
            t(
              locale,
              "Impossible de rafraîchir les ventes SumUp.",
              "Unable to refresh SumUp sales."
            )
        );
      }

      const nextSales = payload.sales;
      setSales(nextSales);
      setSyncLog((current) => [
        `${new Date().toLocaleTimeString()} • ${nextSales.length} lignes SumUp chargées`,
        ...current
      ].slice(0, 6));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t(locale, "Erreur Sync SumUp", "SumUp sync error");
      setSyncError(message);
      setSyncLog((current) => [
        `${new Date().toLocaleTimeString()} • ${message}`,
        ...current
      ].slice(0, 6));
    } finally {
      setIsRefreshing(false);
    }
  }

  function askAssistant(question: string) {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    setAssistantMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: trimmedQuestion
      }
    ]);
    setAssistantQuestion("");
    setIsAssistantThinking(true);
    assistantReplyNonceRef.current += 1;
    const replyNonce = assistantReplyNonceRef.current;

    const answer = answerMerchAssistantQuestion({
      question: trimmedQuestion,
      forecast,
      analytics
    });

    window.setTimeout(() => {
      if (assistantReplyNonceRef.current !== replyNonce) {
        return;
      }

      setAssistantMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          title: answer.title,
          text: answer.summary,
          bullets: answer.bullets
        }
      ]);
      setIsAssistantThinking(false);
    }, 220);
  }

  function resetAssistantConversation() {
    setAssistantQuestion("");
    assistantReplyNonceRef.current += 1;
    setIsAssistantThinking(false);
    setAssistantMessages([
      buildAssistantIntroMessage(
        locale,
        forecast.totals.unitsToProduce,
        forecast.assistantFacts.bestMarginProduct
      )
    ]);
  }

  function createPurchaseOrder() {
    const nextOrder = generateMerchPurchaseOrder({
      forecast: {
        ...forecast,
        lines: filteredForecastLines
      },
      workspaceName,
      supplier: orderSupplier,
      currency,
      notes: `${forecast.scenario.label} • ${forecast.scenario.eventType}`
    });

    saveMerchPurchaseOrder(nextOrder);
    setSelectedOrderId(nextOrder.id);
  }

  function updateOrderLine(
    lineId: string,
    patch: Partial<{ quantity: number; unitCost: number }>
  ) {
    if (!currentOrder) {
      return;
    }

    updateMerchPurchaseOrder(currentOrder.id, {
      lines: currentOrder.lines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              quantity: patch.quantity ?? line.quantity,
              unitCost: patch.unitCost ?? line.unitCost
            }
          : line
      )
    });
  }

  if (!sumupConnected && sales.length === 0) {
    return (
      <EmptyState
        title={t(locale, "Forecast merch indisponible", "Merch forecast unavailable")}
        body={t(
          locale,
          "La connexion SumUp n'est pas encore disponible pour calculer l'historique de ventes. Tu peux garder le stock manuel dans Merch puis revenir ici dès que la synchro est active.",
          "SumUp is not connected yet, so historical merch sales cannot be analyzed. Keep manual stock tracking in Merch, then come back once sync is active."
        )}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          [
            t(locale, "CA merch", "Merch revenue"),
            formatCurrency(analytics.totals.revenue, currency, "GBP")
          ],
          [t(locale, "Unités vendues", "Units sold"), String(analytics.totals.units)],
          [
            t(locale, "Panier moyen", "Average basket"),
            formatCurrency(analytics.totals.averageBasket, currency, "GBP")
          ],
          [
            t(locale, "Conversion estimée", "Estimated conversion"),
            formatPercent(analytics.totals.estimatedConversionRate)
          ],
          [
            t(locale, "Marge estimée", "Estimated margin"),
            formatCurrency(analytics.totals.estimatedMargin, currency, "GBP")
          ],
          [
            t(locale, "Top produit", "Top product"),
            analytics.topProducts[0]?.productName ?? "—"
          ]
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-mist-50">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <PackageSearch className="h-5 w-5 text-coral-300" />
              </div>
              <div>
                <p className="text-lg font-medium text-mist-50">
                  {t(locale, "Paramètres de projection", "Projection settings")}
                </p>
                <p className="text-sm text-mist-300">
                  {t(
                    locale,
                    "Sélectionne les dates à couvrir, le contexte du run et un budget optionnel.",
                    "Select the dates to cover, the run context, and an optional budget."
                  )}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={refreshSales}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {t(locale, "Rafraîchir SumUp", "Refresh SumUp")}
            </Button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Select value={scope} onChange={(event) => setScope(event.target.value)}>
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={eventType}
              onChange={(event) =>
                setEventType(
                  event.target.value as "club" | "festival" | "headline" | "support"
                )
              }
            >
              <option value="club">club</option>
              <option value="headline">headline</option>
              <option value="support">support</option>
              <option value="festival">festival</option>
            </Select>
            <Select
              value={season}
              onChange={(event) =>
                setSeason(
                  event.target.value as "winter" | "spring" | "summer" | "autumn"
                )
              }
            >
              <option value="winter">winter</option>
              <option value="spring">spring</option>
              <option value="summer">summer</option>
              <option value="autumn">autumn</option>
            </Select>
            <Input
              value={occupancyRate}
              onChange={(event) => setOccupancyRate(event.target.value)}
              inputMode="decimal"
              placeholder={t(locale, "Taux de remplissage (0.8)", "Fill rate (0.8)")}
            />
            <Input
              value={budgetMax}
              onChange={(event) => setBudgetMax(event.target.value)}
              inputMode="decimal"
              placeholder={t(locale, "Budget prod max", "Max production budget")}
            />
            <Select
              value={designFilter}
              onChange={(event) => setDesignFilter(event.target.value)}
            >
              <option value="all">{t(locale, "Tous les designs", "All designs")}</option>
              <option value="none">{t(locale, "Sans design", "No design")}</option>
              {merchDesigns.map((design) => (
                <option key={design.id} value={design.id}>
                  {design.name}
                </option>
              ))}
            </Select>
            <Select
              value={productTypeFilter}
              onChange={(event) => setProductTypeFilter(event.target.value)}
            >
              <option value="all">{t(locale, "Tous les types", "All types")}</option>
              <option value="t-shirt">t-shirt</option>
              <option value="hoodie">hoodie</option>
              <option value="longsleeve">longsleeve</option>
              <option value="patch">patch</option>
              <option value="poster">poster</option>
              <option value="vinyl">vinyl</option>
              <option value="cd">cd</option>
              <option value="other">other</option>
            </Select>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Sync log", "Sync log")}
            </p>
            <div className="mt-3 space-y-2 text-sm text-mist-200">
              {syncLog.map((entry) => (
                <p key={entry}>{entry}</p>
              ))}
            </div>
            {syncError ? (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {syncError}
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Boxes className="h-5 w-5 text-coral-300" />
            </div>
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Projection merch", "Merch forecast")}
              </p>
              <p className="text-sm text-mist-300">
                {t(
                  locale,
                  "Projection lisible à partir des ventes SumUp, du stock restant et du contexte des prochaines dates.",
                  "Readable forecast built from SumUp sales, current stock, and the context of the next dates."
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              [
                t(locale, "Cible totale", "Target stock"),
                String(forecast.totals.recommendedUnits)
              ],
              [
                t(locale, "À produire", "To produce"),
                String(forecast.totals.unitsToProduce)
              ],
              [
                t(locale, "CA potentiel", "Potential revenue"),
                formatCurrency(forecast.totals.potentialRevenue, currency, "GBP")
              ],
              [
                t(locale, "Marge potentielle", "Potential margin"),
                formatCurrency(forecast.totals.potentialMargin, currency, "GBP")
              ]
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-mist-300">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-mist-50">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-sm font-medium text-mist-50">
                {t(locale, "Alertes", "Alerts")}
              </p>
              <div className="mt-4 space-y-3">
                {forecast.alerts.length ? (
                  forecast.alerts.map((alert) => (
                    <div
                      key={alert}
                      className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                    >
                      <div className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{alert}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-mist-300">
                    {t(locale, "Pas d'alerte critique.", "No critical alert.")}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-sm font-medium text-mist-50">
                {t(locale, "Insights design", "Design insights")}
              </p>
              <div className="mt-4 space-y-3">
                {forecast.designInsights.length ? (
                  forecast.designInsights.map((insight) => (
                    <div
                      key={insight}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-mist-100"
                    >
                      {insight}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-mist-300">
                    {t(
                      locale,
                      "Relie davantage de produits à des designs pour comparer leurs performances.",
                      "Link more products to designs to compare their performance."
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-coral-300" />
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Historique ventes merch", "Past merch sales")}
            </p>
          </div>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-white/8">
            <div className="overflow-x-auto">
            <div className="grid min-w-[680px] grid-cols-[1.8fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-3 border-b border-white/8 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.22em] text-mist-300">
              <p>{t(locale, "Produit", "Product")}</p>
              <p>{t(locale, "Design", "Design")}</p>
              <p>{t(locale, "Unités", "Units")}</p>
              <p>{t(locale, "CA", "Revenue")}</p>
              <p>{t(locale, "Prix moyen", "Avg price")}</p>
            </div>
            <div className="divide-y divide-white/8">
              {filteredAnalyticsProducts.slice(0, 8).map((product) => (
                <div
                  key={`${product.productId ?? product.productName}`}
                  className="grid min-w-[680px] grid-cols-[1.8fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-3 px-4 py-4 text-sm"
                >
                  <div>
                    <p className="font-medium text-mist-50">{product.productName}</p>
                    <p className="mt-1 text-xs text-mist-300">{product.productType}</p>
                  </div>
                  <p className="text-mist-200">{product.designName}</p>
                  <p className="text-mist-50">{product.units}</p>
                  <p className="text-mist-50">
                    {formatCurrency(product.revenue, currency, "GBP")}
                  </p>
                  <p className="text-mist-200">
                    {formatCurrency(product.averagePrice, currency, "GBP")}
                  </p>
                </div>
              ))}
            </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-coral-300" />
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Tailles et ventes par date", "Sizes and sales by date")}
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-sm font-medium text-mist-50">
                {t(locale, "Ventes par taille", "Sales by size")}
              </p>
              <div className="mt-4 space-y-3">
                {analytics.sizes.length ? (
                  analytics.sizes.slice(0, 6).map((size) => (
                    <div key={size.size} className="flex items-center justify-between text-sm">
                      <span className="text-mist-200">{size.size}</span>
                      <span className="font-medium text-mist-50">{size.units}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-mist-300">
                    {t(
                      locale,
                      "Pas de taille lisible dans SumUp pour le moment.",
                      "No readable size data from SumUp yet."
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-sm font-medium text-mist-50">
                {t(locale, "Ventes par date", "Sales by show/date")}
              </p>
              <div className="mt-4 space-y-3">
                {analytics.shows.slice(0, 6).map((show) => (
                  <div
                    key={`${show.showId ?? show.date}-${show.label}`}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-mist-50">{show.label}</p>
                      <Badge>{show.units}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-mist-300">
                      {show.date || "—"} • {formatCurrency(show.revenue, currency, "GBP")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {analytics.notes.length ? (
            <div className="mt-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-mist-200">
              {analytics.notes[0]}
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-coral-300" />
          <div>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Projection détaillée", "Detailed forecast")}
            </p>
            <p className="text-sm text-mist-300">
              {t(
                locale,
                "Par produit, par design et par taille. Les recommandations restent éditables avant bon de commande.",
                "By product, design, and size. Recommendations remain editable before creating a purchase order."
              )}
            </p>
          </div>
        </div>

        {filteredForecastLines.length ? (
          <div className="mt-5 space-y-4">
            {filteredForecastLines.map((line) => (
              <div
                key={line.productId}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-mist-50">{line.productName}</p>
                      <Badge>{line.designName}</Badge>
                      <Badge tone={line.riskLevel === "stockout" ? "warning" : "neutral"}>
                        {line.riskLevel}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-mist-300">
                      {line.productType} • {line.supplier} • {line.color}
                    </p>
                  </div>
                  <div className="text-right text-sm text-mist-200">
                    <p>{t(locale, "Historique / date", "History / show")} : {Math.round(line.historicalUnitsPerShow * 10) / 10}</p>
                    <p>{t(locale, "Stock actuel", "Current stock")} : {line.currentStock}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                      {t(locale, "Cible", "Target")}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-mist-50">
                      {line.recommendedStockTarget}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                      {t(locale, "À produire", "To produce")}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-mist-50">
                      {line.recommendedToProduce}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                      {t(locale, "CA potentiel", "Potential revenue")}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-mist-50">
                      {formatCurrency(line.revenuePotential, currency, "GBP")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                      {t(locale, "Marge", "Margin")}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-mist-50">
                      {formatCurrency(line.marginPotential, currency, "GBP")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                      {t(locale, "Tailles", "Sizes")}
                    </p>
                    <p className="mt-2 text-sm text-mist-50">
                      {line.sizeRecommendation
                        .map((entry) => `${entry.size} ${entry.recommendedToProduce}`)
                        .join(" • ")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-mist-300">
                    {t(locale, "Pourquoi", "Why")}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-mist-200">
                    {line.reasoning.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title={t(locale, "Aucune ligne projetée", "No projected line")}
              body={t(
                locale,
                "Ajoute des produits merch, relie-les à des designs, puis choisis des dates à venir pour calculer une projection exploitable.",
                "Add merch products, link them to designs, then select upcoming dates to calculate a usable forecast."
              )}
            />
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <BrainCircuit className="h-5 w-5 text-coral-300" />
              </div>
              <div>
                <p className="text-lg font-medium text-mist-50">BandOS Merch Bot</p>
                <p className="text-sm text-mist-300">
                  {t(
                    locale,
                    "Chat merch piloté par les chiffres BandOS. Il répond sur les quantités, les designs, les marges et les risques sans inventer les données manquantes.",
                    "Merch chat powered by BandOS numbers. It answers about quantities, designs, margins, and risks without inventing missing data."
                  )}
                </p>
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={resetAssistantConversation}>
              <RotateCcw className="h-4 w-4" />
              {t(locale, "Reset chat", "Reset chat")}
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "Combien de t-shirts doit-on produire pour cette tournée ?",
              "Et les hoodies ?",
              "Est-ce qu’on risque d’être en rupture de XL ?",
              "Quel produit a la meilleure marge ?",
              "Fais-moi une commande merch raisonnable avec un budget de 800€."
            ].map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => askAssistant(question)}
                disabled={isAssistantThinking}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-mist-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                {question}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-[28px] border border-white/8 bg-black/20">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-mist-200">
                <MessageSquareMore className="h-4 w-4 text-coral-300" />
                {t(locale, "Conversation merch", "Merch conversation")}
              </div>
              <Badge tone="accent">
                {assistantMessages.length} {t(locale, "message(s)", "message(s)")}
              </Badge>
            </div>

            <div className="max-h-[460px] space-y-4 overflow-y-auto px-4 py-4">
              {assistantMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-[24px] px-4 py-3 ${
                      message.role === "user"
                        ? "border border-coral-500/20 bg-coral-500/10 text-coral-50"
                        : "border border-white/8 bg-white/[0.04] text-mist-100"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-mist-300">
                        <Bot className="h-3.5 w-3.5 text-coral-300" />
                        {message.title ?? "BandOS"}
                      </div>
                    ) : null}
                    <p className="text-sm leading-7">{message.text}</p>
                    {message.bullets?.length ? (
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-mist-200">
                        {message.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ))}

              {isAssistantThinking ? (
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-3 text-mist-100">
                    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-mist-300">
                      <Sparkles className="h-3.5 w-3.5 text-coral-300" />
                      BandOS
                    </div>
                    <p className="text-sm leading-7">
                      {t(
                        locale,
                        "Je relis les ventes SumUp, le stock et la projection en cours…",
                        "Reviewing SumUp sales, stock, and the current forecast…"
                      )}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <form
              className="border-t border-white/8 px-4 py-4"
              onSubmit={(event) => {
                event.preventDefault();
                askAssistant(assistantQuestion);
              }}
            >
              <div className="space-y-3">
                <textarea
                  value={assistantQuestion}
                  onChange={(event) => setAssistantQuestion(event.target.value)}
                  className={textareaClassName}
                  placeholder={t(
                    locale,
                    "Parle-lui comme à un merch manager: combien produire, quel design pousser, que couper si le budget est trop serré…",
                    "Talk to it like a merch manager: how much to produce, which design to push, what to cut if the budget is too tight…"
                  )}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-mist-300">
                    {t(
                      locale,
                      "Le bot répond à partir des données merch visibles dans BandOS.",
                      "The bot answers from the merch data visible in BandOS."
                    )}
                  </p>
                  <Button
                    type="submit"
                    disabled={!assistantQuestion.trim() || isAssistantThinking}
                  >
                    <SendHorizontal className="h-4 w-4" />
                    {t(locale, "Envoyer", "Send")}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <ShoppingCart className="h-5 w-5 text-coral-300" />
              </div>
              <div>
                <p className="text-lg font-medium text-mist-50">
                  {t(locale, "Bon de commande merch", "Merch purchase order")}
                </p>
                <p className="text-sm text-mist-300">
                  {t(
                    locale,
                    "Génère un PO depuis la projection, ajuste les quantités puis imprime/exporte depuis le navigateur.",
                    "Generate a PO from the forecast, adjust quantities, then print/export from the browser."
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select
                value={orderSupplier}
                onChange={(event) => setOrderSupplier(event.target.value)}
                className="min-w-[220px]"
              >
                {supplierOptions.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </Select>
              <Button type="button" onClick={createPurchaseOrder}>
                <ShoppingCart className="h-4 w-4" />
                {t(locale, "Generate Purchase Order", "Generate Purchase Order")}
              </Button>
            </div>
          </div>

          {merchPurchaseOrders.length ? (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {merchPurchaseOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      selectedOrderId === order.id
                        ? "border-coral-500/30 bg-coral-500/10 text-coral-200"
                        : "border-white/10 bg-white/5 text-mist-200 hover:bg-white/10"
                    }`}
                  >
                    {order.poNumber}
                  </button>
                ))}
              </div>

              {currentOrder ? (
                <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-mist-50">{currentOrder.poNumber}</p>
                      <p className="text-sm text-mist-300">
                        {currentOrder.supplier} • {currentOrder.sourceForecastLabel ?? "Forecast"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Select
                        value={currentOrder.status}
                        onChange={(event) =>
                          updateMerchPurchaseOrder(currentOrder.id, {
                            status: event.target.value as typeof currentOrder.status
                          })
                        }
                        className="min-w-[170px]"
                      >
                        <option value="draft">draft</option>
                        <option value="sent">sent</option>
                        <option value="confirmed">confirmed</option>
                        <option value="delivered">delivered</option>
                      </Select>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => window.print()}
                      >
                        {t(locale, "Print / PDF", "Print / PDF")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          deleteMerchPurchaseOrder(currentOrder.id);
                          setSelectedOrderId(null);
                        }}
                      >
                        {t(locale, "Supprimer", "Delete")}
                      </Button>
                    </div>
                  </div>

                  <textarea
                    defaultValue={currentOrder.notes}
                    onBlur={(event) =>
                      updateMerchPurchaseOrder(currentOrder.id, {
                        notes: event.target.value
                      })
                    }
                    className={`${textareaClassName} mt-4 min-h-[90px]`}
                  />

                  <div className="mt-4 overflow-hidden rounded-[24px] border border-white/8">
                    <div className="overflow-x-auto">
                    <div className="grid min-w-[640px] grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-white/8 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.22em] text-mist-300">
                      <p>{t(locale, "Produit", "Product")}</p>
                      <p>{t(locale, "Design", "Design")}</p>
                      <p>{t(locale, "Taille", "Size")}</p>
                      <p>{t(locale, "Qté", "Qty")}</p>
                      <p>{t(locale, "PU", "Unit cost")}</p>
                    </div>
                    <div className="divide-y divide-white/8">
                      {currentOrder.lines.map((line) => (
                        <div
                          key={line.id}
                          className="grid min-w-[640px] grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_0.7fr] gap-3 px-4 py-4 text-sm"
                        >
                          <div>
                            <p className="font-medium text-mist-50">{line.productName}</p>
                            <p className="mt-1 text-xs text-mist-300">{line.productType}</p>
                          </div>
                          <p className="text-mist-200">{line.designName}</p>
                          <p className="text-mist-200">{line.size}</p>
                          <Input
                            defaultValue={String(line.quantity)}
                            inputMode="numeric"
                            onBlur={(event) =>
                              updateOrderLine(line.id, {
                                quantity: Math.max(parseNumericInput(event.target.value), 0)
                              })
                            }
                          />
                          <Input
                            defaultValue={String(line.unitCost)}
                            inputMode="decimal"
                            onBlur={(event) =>
                              updateOrderLine(line.id, {
                                unitCost: Math.max(parseNumericInput(event.target.value), 0)
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <p className="text-sm text-mist-200">
                      {currentOrder.lines.length} {t(locale, "ligne(s)", "line(s)")}
                    </p>
                    <p className="text-lg font-semibold text-mist-50">
                      {formatCurrency(
                        currentOrder.lines.reduce((sum, line) => sum + line.lineTotal, 0),
                        currency,
                        currentOrder.currency
                      )}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title={t(locale, "Aucun bon de commande", "No purchase order yet")}
                body={t(
                  locale,
                  "Génère un bon de commande depuis la projection pour préparer la prod fournisseur.",
                  "Generate a purchase order from the forecast to prepare supplier production."
                )}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
