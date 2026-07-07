import type { MerchProductType } from "./mock-data";
import { normalizeCurrency, type SupportedCurrency } from "./utils";

export type ForecastMerchProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  productType: MerchProductType;
  designId: string | null;
  color: string;
  supplier: string;
  stock: number;
  sold: number;
  purchasePrice: number;
  salePrice: number;
  reorderPoint: number;
  sizeBreakdown: Array<{
    size: string;
    remaining: number;
  }>;
  sumupCatalogName: string;
};

export type ForecastMerchDesign = {
  id: string;
  name: string;
  collection: "tour" | "album" | "single" | "special drop" | "evergreen";
  status: "draft" | "active" | "archived";
  tags: string[];
  productTypes: MerchProductType[];
};

export type ForecastShow = {
  id: string;
  tourName: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  capacity: number | null;
  validated: boolean;
  isStandalone: boolean;
  status: "pending" | "booked" | "cancelled" | "local support needed";
};

export type ForecastSumUpSale = {
  id: string;
  transactionId: string;
  soldAt: string | null;
  productName: string;
  normalizedProductName?: string;
  detectedSize: string | null;
  quantity: number;
  salePrice: number;
  revenue: number;
  currency: SupportedCurrency;
  vatRate: number | null;
};

export type MerchForecastEventType =
  | "club"
  | "festival"
  | "headline"
  | "support";

export type MerchForecastSeason =
  | "winter"
  | "spring"
  | "summer"
  | "autumn";

export type MerchForecastScenario = {
  label: string;
  eventType: MerchForecastEventType;
  season: MerchForecastSeason;
  occupancyRate: number;
  budgetMax: number | null;
  shows: ForecastShow[];
};

export type HistoricalProductPerformance = {
  productId: string | null;
  productName: string;
  designId: string | null;
  designName: string;
  productType: MerchProductType;
  units: number;
  revenue: number;
  transactions: number;
  averagePrice: number;
  margin: number;
  lastSoldAt: string | null;
  matched: boolean;
  sizeUnits: Record<string, number>;
  uniqueSaleDates: string[];
};

export type HistoricalDesignPerformance = {
  designId: string | null;
  designName: string;
  units: number;
  revenue: number;
  margin: number;
  products: Array<{
    productType: MerchProductType;
    units: number;
    revenue: number;
  }>;
};

export type HistoricalShowPerformance = {
  showId: string | null;
  label: string;
  date: string;
  units: number;
  revenue: number;
  transactions: number;
  estimatedAttendance: number | null;
};

export type MerchSalesAnalytics = {
  totals: {
    units: number;
    revenue: number;
    averageBasket: number;
    estimatedConversionRate: number | null;
    estimatedMargin: number;
    sizeCoverageRate: number;
    transactionCount: number;
  };
  products: HistoricalProductPerformance[];
  designs: HistoricalDesignPerformance[];
  shows: HistoricalShowPerformance[];
  sizes: Array<{
    size: string;
    units: number;
  }>;
  topProducts: HistoricalProductPerformance[];
  notes: string[];
};

export type MerchForecastLine = {
  productId: string;
  productName: string;
  sku: string;
  supplier: string;
  designId: string | null;
  designName: string;
  productType: MerchProductType;
  color: string;
  currentStock: number;
  historicalUnits: number;
  historicalUnitsPerShow: number;
  recommendedStockTarget: number;
  recommendedToProduce: number;
  revenuePotential: number;
  marginPotential: number;
  riskLevel: "healthy" | "watch" | "stockout" | "overstock";
  reasoning: string[];
  sizeRecommendation: Array<{
    size: string;
    recommendedToProduce: number;
    targetStock: number;
  }>;
};

export type MerchForecastResult = {
  scenario: MerchForecastScenario;
  totals: {
    recommendedUnits: number;
    unitsToProduce: number;
    currentStockCovered: number;
    potentialRevenue: number;
    potentialMargin: number;
    estimatedProductionCost: number;
    budgetGap: number | null;
  };
  lines: MerchForecastLine[];
  alerts: string[];
  designInsights: string[];
  assistantFacts: {
    bestMarginProduct: string | null;
    stockoutRiskProducts: string[];
    overstockProducts: string[];
    bestDesignByType: Record<string, string>;
  };
};

export type MerchPurchaseOrderLineDraft = {
  id: string;
  productId: string | null;
  productName: string;
  designId: string | null;
  designName: string;
  productType: MerchProductType;
  size: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
};

export type MerchPurchaseOrderDraft = {
  id: string;
  poNumber: string;
  date: string;
  supplier: string;
  workspaceName: string;
  currency: SupportedCurrency;
  status: "draft" | "sent" | "confirmed" | "delivered";
  notes: string;
  sourceForecastLabel: string | null;
  createdAt: string;
  updatedAt: string;
  lines: MerchPurchaseOrderLineDraft[];
};

export type MerchAssistantAnswer = {
  title: string;
  summary: string;
  bullets: string[];
};

function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLookupAliases(product: ForecastMerchProduct) {
  return [
    product.name,
    product.sumupCatalogName,
    product.sku
  ]
    .map((value) => normalizeLabel(value))
    .filter(Boolean);
}

function roundProductionQuantity(value: number) {
  if (value <= 0) {
    return 0;
  }

  if (value <= 12) {
    return Math.ceil(value);
  }

  return Math.ceil(value / 2) * 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSeasonFromDate(date: string): MerchForecastSeason {
  const month = new Date(date).getMonth() + 1;

  if (month === 12 || month <= 2) {
    return "winter";
  }

  if (month <= 5) {
    return "spring";
  }

  if (month <= 8) {
    return "summer";
  }

  return "autumn";
}

function getSeasonFactor(season: MerchForecastSeason) {
  if (season === "summer") {
    return 1.12;
  }

  if (season === "winter") {
    return 0.96;
  }

  return 1;
}

function getEventTypeFactor(type: MerchForecastEventType) {
  if (type === "festival") {
    return 1.18;
  }

  if (type === "headline") {
    return 1.08;
  }

  if (type === "support") {
    return 0.76;
  }

  return 1;
}

function getAttendanceEstimate(show: ForecastShow, occupancyRate: number) {
  if (typeof show.capacity === "number" && show.capacity > 0) {
    return Math.round(show.capacity * occupancyRate);
  }

  return null;
}

function inferDefaultSizeWeights(product: ForecastMerchProduct) {
  const validSizes = product.sizeBreakdown.filter((entry) => entry.size !== "N/A");

  if (!validSizes.length) {
    return [{ size: "N/A", weight: 1 }];
  }

  const totalRemaining = validSizes.reduce((sum, entry) => sum + entry.remaining, 0);

  if (totalRemaining > 0) {
    return validSizes.map((entry) => ({
      size: entry.size,
      weight: entry.remaining / totalRemaining
    }));
  }

  const fallbackScale: Record<string, number> = {
    XS: 0.08,
    S: 0.16,
    M: 0.26,
    L: 0.26,
    XL: 0.16,
    "2XL": 0.06,
    "3XL": 0.02
  };

  const fallbackTotal = validSizes.reduce(
    (sum, entry) => sum + (fallbackScale[entry.size.toUpperCase()] ?? 0.1),
    0
  );

  return validSizes.map((entry) => ({
    size: entry.size,
    weight: (fallbackScale[entry.size.toUpperCase()] ?? 0.1) / fallbackTotal
  }));
}

function allocateQuantityByWeights(
  quantity: number,
  weights: Array<{ size: string; weight: number }>
) {
  if (!weights.length || quantity <= 0) {
    return weights.map((weight) => ({
      size: weight.size,
      quantity: 0
    }));
  }

  const exact = weights.map((entry) => ({
    size: entry.size,
    raw: entry.weight * quantity
  }));
  const floored = exact.map((entry) => ({
    size: entry.size,
    quantity: Math.floor(entry.raw),
    remainder: entry.raw - Math.floor(entry.raw)
  }));
  let remainderUnits =
    quantity - floored.reduce((sum, entry) => sum + entry.quantity, 0);

  [...floored]
    .sort((left, right) => right.remainder - left.remainder)
    .forEach((entry) => {
      if (remainderUnits <= 0) {
        return;
      }

      const target = floored.find((line) => line.size === entry.size);

      if (target) {
        target.quantity += 1;
        remainderUnits -= 1;
      }
    });

  return floored.map((entry) => ({
    size: entry.size,
    quantity: entry.quantity
  }));
}

function chooseProductRiskLevel(
  currentStock: number,
  recommendedToProduce: number,
  recommendedStockTarget: number
): MerchForecastLine["riskLevel"] {
  if (recommendedToProduce > currentStock && recommendedToProduce > 0) {
    return "stockout";
  }

  if (currentStock > Math.max(recommendedStockTarget * 1.75, 12)) {
    return "overstock";
  }

  if (recommendedToProduce > 0 || currentStock <= Math.max(recommendedStockTarget * 0.6, 8)) {
    return "watch";
  }

  return "healthy";
}

function buildTypeSafetyFactor(
  product: ForecastMerchProduct,
  design: ForecastMerchDesign | undefined,
  eventType: MerchForecastEventType
) {
  const designTags = design?.tags.map((tag) => normalizeLabel(tag)) ?? [];

  if (eventType === "support") {
    if (design?.collection === "evergreen" || designTags.includes("logo")) {
      return 1.08;
    }

    if (
      design?.collection === "special drop" ||
      designTags.includes("limited edition") ||
      designTags.includes("tour design")
    ) {
      return 0.78;
    }
  }

  if (product.productType === "patch" || product.productType === "poster") {
    return 0.88;
  }

  return 1;
}

function buildProductMap(products: ForecastMerchProduct[]) {
  const map = new Map<
    string,
    {
      product: ForecastMerchProduct;
      aliases: string[];
    }
  >();

  products.forEach((product) => {
    map.set(product.id, {
      product,
      aliases: buildLookupAliases(product)
    });
  });

  return map;
}

function matchSaleToProduct(
  sale: ForecastSumUpSale,
  productMap: Map<
    string,
    {
      product: ForecastMerchProduct;
      aliases: string[];
    }
  >
) {
  const normalizedSaleName = normalizeLabel(
    sale.normalizedProductName || sale.productName
  );

  for (const { product, aliases } of productMap.values()) {
    if (
      aliases.some(
        (alias) =>
          alias === normalizedSaleName ||
          (alias.length > 6 && normalizedSaleName.includes(alias)) ||
          (normalizedSaleName.length > 6 && alias.includes(normalizedSaleName))
      )
    ) {
      return product;
    }
  }

  return null;
}

function buildShowIndex(shows: ForecastShow[]) {
  const index = new Map<string, ForecastShow[]>();

  shows.forEach((show) => {
    const key = show.date.slice(0, 10);
    const next = index.get(key) ?? [];
    next.push(show);
    index.set(key, next);
  });

  return index;
}

export function buildMerchSalesAnalytics(args: {
  products: ForecastMerchProduct[];
  designs: ForecastMerchDesign[];
  shows: ForecastShow[];
  sales: ForecastSumUpSale[];
  occupancyRate?: number;
}): MerchSalesAnalytics {
  const occupancyRate = clamp(args.occupancyRate ?? 0.75, 0.2, 1);
  const productMap = buildProductMap(args.products);
  const designMap = new Map(args.designs.map((design) => [design.id, design]));
  const showIndex = buildShowIndex(args.shows);
  const productPerformance = new Map<string, HistoricalProductPerformance>();
  const designPerformance = new Map<string, HistoricalDesignPerformance>();
  const showPerformance = new Map<string, HistoricalShowPerformance>();
  const sizePerformance = new Map<string, number>();
  const transactionIds = new Set<string>();
  let totalUnits = 0;
  let totalRevenue = 0;
  let totalMargin = 0;
  let sizeTaggedUnits = 0;

  args.sales.forEach((sale) => {
    const matchedProduct = matchSaleToProduct(sale, productMap);
    const design =
      matchedProduct?.designId ? designMap.get(matchedProduct.designId) : undefined;
    const soldAtDate = sale.soldAt?.slice(0, 10) ?? "";
    const matchedShow = soldAtDate ? showIndex.get(soldAtDate)?.[0] ?? null : null;
    const productKey = matchedProduct?.id ?? `unmapped:${normalizeLabel(sale.productName)}`;
    const designKey = design?.id ?? "unmapped";
    const showKey = matchedShow?.id ?? `date:${soldAtDate || "unknown"}`;
    const existingProduct = productPerformance.get(productKey) ?? {
      productId: matchedProduct?.id ?? null,
      productName: matchedProduct?.name ?? sale.productName,
      designId: design?.id ?? null,
      designName: design?.name ?? "Unmapped",
      productType: matchedProduct?.productType ?? "other",
      units: 0,
      revenue: 0,
      transactions: 0,
      averagePrice: 0,
      margin: 0,
      lastSoldAt: null,
      matched: Boolean(matchedProduct),
      sizeUnits: {},
      uniqueSaleDates: []
    };

    existingProduct.units += sale.quantity;
    existingProduct.revenue += sale.revenue;
    existingProduct.transactions += 1;
    existingProduct.averagePrice =
      existingProduct.units > 0 ? existingProduct.revenue / existingProduct.units : 0;
    existingProduct.margin += matchedProduct
      ? sale.quantity * (matchedProduct.salePrice - matchedProduct.purchasePrice)
      : 0;
    existingProduct.lastSoldAt =
      !existingProduct.lastSoldAt || (sale.soldAt && sale.soldAt > existingProduct.lastSoldAt)
        ? sale.soldAt
        : existingProduct.lastSoldAt;

    if (soldAtDate && !existingProduct.uniqueSaleDates.includes(soldAtDate)) {
      existingProduct.uniqueSaleDates.push(soldAtDate);
    }

    if (sale.detectedSize) {
      existingProduct.sizeUnits[sale.detectedSize] =
        (existingProduct.sizeUnits[sale.detectedSize] ?? 0) + sale.quantity;
      sizePerformance.set(
        sale.detectedSize,
        (sizePerformance.get(sale.detectedSize) ?? 0) + sale.quantity
      );
      sizeTaggedUnits += sale.quantity;
    }

    productPerformance.set(productKey, existingProduct);

    const existingDesign = designPerformance.get(designKey) ?? {
      designId: design?.id ?? null,
      designName: design?.name ?? "Unmapped",
      units: 0,
      revenue: 0,
      margin: 0,
      products: []
    };
    existingDesign.units += sale.quantity;
    existingDesign.revenue += sale.revenue;
    existingDesign.margin += matchedProduct
      ? sale.quantity * (matchedProduct.salePrice - matchedProduct.purchasePrice)
      : 0;
    const productTypeEntry = existingDesign.products.find(
      (entry) => entry.productType === (matchedProduct?.productType ?? "other")
    );
    if (productTypeEntry) {
      productTypeEntry.units += sale.quantity;
      productTypeEntry.revenue += sale.revenue;
    } else {
      existingDesign.products.push({
        productType: matchedProduct?.productType ?? "other",
        units: sale.quantity,
        revenue: sale.revenue
      });
    }
    designPerformance.set(designKey, existingDesign);

    const existingShow = showPerformance.get(showKey) ?? {
      showId: matchedShow?.id ?? null,
      label: matchedShow
        ? `${matchedShow.venue} • ${matchedShow.city}`
        : soldAtDate || "Unknown sales date",
      date: soldAtDate,
      units: 0,
      revenue: 0,
      transactions: 0,
      estimatedAttendance: matchedShow
        ? getAttendanceEstimate(matchedShow, occupancyRate)
        : null
    };
    existingShow.units += sale.quantity;
    existingShow.revenue += sale.revenue;
    existingShow.transactions += 1;
    showPerformance.set(showKey, existingShow);

    totalUnits += sale.quantity;
    totalRevenue += sale.revenue;
    totalMargin += matchedProduct
      ? sale.quantity * (matchedProduct.salePrice - matchedProduct.purchasePrice)
      : 0;
    transactionIds.add(sale.transactionId);
  });

  const showEntries = Array.from(showPerformance.values()).sort((left, right) =>
    right.date.localeCompare(left.date)
  );
  const estimatedAttendance = showEntries.reduce(
    (sum, entry) => sum + (entry.estimatedAttendance ?? 0),
    0
  );
  const notes: string[] = [];

  if (sizeTaggedUnits === 0) {
    notes.push(
      "Aucune taille n'a été détectée dans les lignes SumUp. La répartition des tailles est estimée depuis le stock BandOS."
    );
  } else if (sizeTaggedUnits < totalUnits) {
    notes.push(
      "Une partie seulement des ventes SumUp porte une taille lisible. Les projections tailles mélangent historique détecté et structure de stock actuelle."
    );
  }

  if (!showEntries.some((entry) => entry.estimatedAttendance)) {
    notes.push(
      "Pas assez de données d'affluence historiques pour une conversion merch fiable."
    );
  }

  return {
    totals: {
      units: totalUnits,
      revenue: totalRevenue,
      averageBasket: transactionIds.size ? totalRevenue / transactionIds.size : 0,
      estimatedConversionRate:
        estimatedAttendance > 0 ? (transactionIds.size / estimatedAttendance) * 100 : null,
      estimatedMargin: totalMargin,
      sizeCoverageRate: totalUnits > 0 ? sizeTaggedUnits / totalUnits : 0,
      transactionCount: transactionIds.size
    },
    products: Array.from(productPerformance.values()).sort(
      (left, right) => right.revenue - left.revenue
    ),
    designs: Array.from(designPerformance.values()).sort(
      (left, right) => right.revenue - left.revenue
    ),
    shows: showEntries,
    sizes: Array.from(sizePerformance.entries())
      .map(([size, units]) => ({ size, units }))
      .sort((left, right) => right.units - left.units),
    topProducts: Array.from(productPerformance.values())
      .sort((left, right) => right.units - left.units)
      .slice(0, 5),
    notes
  };
}

export function buildMerchForecast(args: {
  products: ForecastMerchProduct[];
  designs: ForecastMerchDesign[];
  sales: ForecastSumUpSale[];
  scenario: MerchForecastScenario;
}): MerchForecastResult {
  const designMap = new Map(args.designs.map((design) => [design.id, design]));
  const analytics = buildMerchSalesAnalytics({
    products: args.products,
    designs: args.designs,
    shows: args.scenario.shows,
    sales: args.sales,
    occupancyRate: args.scenario.occupancyRate
  });

  const selectedShows = [...args.scenario.shows].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const averageAttendance =
    selectedShows.reduce(
      (sum, show) => sum + (getAttendanceEstimate(show, args.scenario.occupancyRate) ?? 120),
      0
    ) / Math.max(selectedShows.length, 1);
  const capacityFactor = clamp(averageAttendance / 120, 0.7, 1.8);
  const eventFactor = getEventTypeFactor(args.scenario.eventType);
  const seasonFactor = getSeasonFactor(args.scenario.season);
  const lines = args.products
    .map((product) => {
      const design = product.designId ? designMap.get(product.designId) : undefined;
      const history =
        analytics.products.find((entry) => entry.productId === product.id) ?? null;
      const historicalUnits = history?.units ?? product.sold;
      const historicalShowCount = Math.max(
        history?.uniqueSaleDates.length ?? 0,
        selectedShows.length || 1
      );
      const historicalUnitsPerShow = historicalUnits / historicalShowCount;
      const safetyFactor = buildTypeSafetyFactor(
        product,
        design,
        args.scenario.eventType
      );
      const projectedUnits =
        historicalUnitsPerShow *
        Math.max(selectedShows.length, 1) *
        capacityFactor *
        eventFactor *
        seasonFactor *
        safetyFactor;
      const minimumSafetyUnits =
        product.productType === "patch" || product.productType === "poster"
          ? 6
          : product.productType === "vinyl" || product.productType === "cd"
            ? 4
            : 10;
      const recommendedStockTarget = roundProductionQuantity(
        Math.max(projectedUnits, minimumSafetyUnits)
      );
      const recommendedToProduce = Math.max(
        roundProductionQuantity(recommendedStockTarget - product.stock),
        0
      );
      const weightsFromHistory = Object.entries(history?.sizeUnits ?? {});
      const sizeWeights =
        weightsFromHistory.length > 0
          ? weightsFromHistory.map(([size, units]) => ({
              size,
              weight: units / Math.max(historicalUnits, 1)
            }))
          : inferDefaultSizeWeights(product);
      const sizeRecommendation = allocateQuantityByWeights(
        recommendedToProduce,
        sizeWeights
      ).map((entry) => ({
        size: entry.size,
        recommendedToProduce: entry.quantity,
        targetStock:
          entry.quantity +
          (product.sizeBreakdown.find((line) => line.size === entry.size)?.remaining ?? 0)
      }));
      const reasoning = [
        `${Math.round(historicalUnitsPerShow * 10) / 10} unités / date d'après l'historique connu.`,
        `Facteur date ${args.scenario.eventType} x${eventFactor.toFixed(2)} et saison x${seasonFactor.toFixed(2)}.`,
        design
          ? `Design ${design.name} (${design.collection}) avec facteur de sécurité x${safetyFactor.toFixed(2)}.`
          : `Aucun design lié, projection prudente.`
      ];

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        supplier: product.supplier,
        designId: product.designId,
        designName: design?.name ?? "Sans design",
        productType: product.productType,
        color: product.color,
        currentStock: product.stock,
        historicalUnits,
        historicalUnitsPerShow,
        recommendedStockTarget,
        recommendedToProduce,
        revenuePotential: recommendedStockTarget * product.salePrice,
        marginPotential:
          recommendedStockTarget * (product.salePrice - product.purchasePrice),
        riskLevel: chooseProductRiskLevel(
          product.stock,
          recommendedToProduce,
          recommendedStockTarget
        ),
        reasoning,
        sizeRecommendation
      } satisfies MerchForecastLine;
    })
    .filter((line) => line.designName !== "Sans design" || line.historicalUnits > 0 || line.currentStock > 0)
    .sort((left, right) => {
      if (right.recommendedToProduce !== left.recommendedToProduce) {
        return right.recommendedToProduce - left.recommendedToProduce;
      }

      return right.marginPotential - left.marginPotential;
    });

  const estimatedProductionCost = lines.reduce(
    (sum, line) =>
      sum +
      line.recommendedToProduce *
        (args.products.find((product) => product.id === line.productId)?.purchasePrice ?? 0),
    0
  );
  const budgetGap =
    typeof args.scenario.budgetMax === "number"
      ? estimatedProductionCost - args.scenario.budgetMax
      : null;
  const alerts = [
    ...lines
      .filter((line) => line.riskLevel === "stockout")
      .slice(0, 3)
      .map(
        (line) =>
          `${line.productName}: risque de rupture, ${line.recommendedToProduce} unités à produire.`
      ),
    ...lines
      .filter((line) => line.riskLevel === "overstock")
      .slice(0, 2)
      .map(
        (line) =>
          `${line.productName}: stock déjà élevé vs projection, à surveiller avant relance.`
      )
  ];

  if (budgetGap !== null && budgetGap > 0) {
    alerts.unshift(
      `La projection dépasse le budget de production défini. Réduis d'abord les relances les moins sûres.`
    );
  }

  const bestDesignByType = analytics.designs.reduce<Record<string, string>>(
    (accumulator, design) => {
      design.products.forEach((product) => {
        const current = accumulator[product.productType];
        const currentDesign = analytics.designs.find((entry) => entry.designName === current);
        const currentRevenue =
          currentDesign?.products.find((entry) => entry.productType === product.productType)
            ?.revenue ?? -1;

        if (product.revenue > currentRevenue) {
          accumulator[product.productType] = design.designName;
        }
      });

      return accumulator;
    },
    {}
  );

  const designInsights = analytics.designs
    .filter((design) => design.designId)
    .slice(0, 4)
    .map((design) => {
      const strongestType =
        [...design.products].sort((left, right) => right.units - left.units)[0]?.productType ??
        "other";

      if (strongestType === "t-shirt") {
        return `Le design ${design.designName} vend mieux en t-shirt.`;
      }

      if (strongestType === "hoodie") {
        return `Le design ${design.designName} marche mieux en hoodie.`;
      }

      if (design.designName.toLowerCase().includes("logo")) {
        return `Le design ${design.designName} reste le plus sûr pour une tournée support.`;
      }

      return `Le design ${design.designName} est performant surtout en ${strongestType}.`;
    });

  return {
    scenario: args.scenario,
    totals: {
      recommendedUnits: lines.reduce((sum, line) => sum + line.recommendedStockTarget, 0),
      unitsToProduce: lines.reduce((sum, line) => sum + line.recommendedToProduce, 0),
      currentStockCovered: lines.reduce((sum, line) => sum + line.currentStock, 0),
      potentialRevenue: lines.reduce((sum, line) => sum + line.revenuePotential, 0),
      potentialMargin: lines.reduce((sum, line) => sum + line.marginPotential, 0),
      estimatedProductionCost,
      budgetGap
    },
    lines,
    alerts,
    designInsights,
    assistantFacts: {
      bestMarginProduct:
        [...lines].sort((left, right) => right.marginPotential - left.marginPotential)[0]
          ?.productName ?? null,
      stockoutRiskProducts: lines
        .filter((line) => line.riskLevel === "stockout")
        .map((line) => line.productName),
      overstockProducts: lines
        .filter((line) => line.riskLevel === "overstock")
        .map((line) => line.productName),
      bestDesignByType
    }
  };
}

export function generateMerchPurchaseOrder(args: {
  forecast: MerchForecastResult;
  workspaceName: string;
  supplier: string;
  currency: SupportedCurrency;
  notes?: string;
  existingId?: string;
}): MerchPurchaseOrderDraft {
  const now = new Date().toISOString();
  const relevantLines = args.forecast.lines.filter(
    (line) =>
      line.recommendedToProduce > 0 &&
      (args.supplier === "All suppliers" || line.supplier === args.supplier)
  );

  return {
    id: args.existingId ?? `po-${Date.now()}`,
    poNumber: `PO-${now.slice(0, 10).replace(/-/g, "")}-${Math.floor(
      Math.random() * 900 + 100
    )}`,
    date: now.slice(0, 10),
    supplier: args.supplier,
    workspaceName: args.workspaceName,
    currency: args.currency,
    status: "draft",
    notes:
      args.notes?.trim() ||
      `Projection ${args.forecast.scenario.label} • ${args.forecast.scenario.eventType}`,
    sourceForecastLabel: args.forecast.scenario.label,
    createdAt: now,
    updatedAt: now,
    lines: relevantLines.flatMap((line) => {
      const sizeLines = line.sizeRecommendation.some((entry) => entry.recommendedToProduce > 0)
        ? line.sizeRecommendation.filter((entry) => entry.recommendedToProduce > 0)
        : [{ size: "N/A", recommendedToProduce: line.recommendedToProduce, targetStock: 0 }];

      return sizeLines.map((sizeLine) => {
        const baseUnitCost =
          line.recommendedStockTarget > 0
            ? Math.max(
                0,
                line.revenuePotential / line.recommendedStockTarget - line.marginPotential / line.recommendedStockTarget
              )
            : 0;

        return {
          id: `${line.productId}-${sizeLine.size}`,
          productId: line.productId,
          productName: line.productName,
          designId: line.designId,
          designName: line.designName,
          productType: line.productType,
          size: sizeLine.size,
          quantity: sizeLine.recommendedToProduce,
          unitCost: Math.round(baseUnitCost * 100) / 100,
          lineTotal: Math.round(baseUnitCost * sizeLine.recommendedToProduce * 100) / 100
        } satisfies MerchPurchaseOrderLineDraft;
      });
    })
  };
}

function findBudgetInQuestion(question: string) {
  const match = question.match(/(\d[\d\s.,]*)\s?(€|eur|\$|usd|£|gbp)?/i);

  if (!match?.[1]) {
    return null;
  }

  const numeric = Number(match[1].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

export function answerMerchAssistantQuestion(args: {
  question: string;
  forecast: MerchForecastResult;
  analytics: MerchSalesAnalytics;
}): MerchAssistantAnswer {
  const question = normalizeLabel(args.question);
  const budget = findBudgetInQuestion(args.question);
  const tshirtLines = args.forecast.lines.filter((line) => line.productType === "t-shirt");
  const xlRisk = args.forecast.lines
    .flatMap((line) =>
      line.sizeRecommendation
        .filter((entry) => entry.size.toUpperCase() === "XL" && entry.recommendedToProduce > 0)
        .map((entry) => `${line.productName}: ${entry.recommendedToProduce} XL à produire`)
    )
    .slice(0, 3);

  if (question.includes("budget") && budget) {
    const sorted = [...args.forecast.lines].sort((left, right) => {
      const leftScore =
        left.marginPotential / Math.max(left.recommendedToProduce || 1, 1);
      const rightScore =
        right.marginPotential / Math.max(right.recommendedToProduce || 1, 1);
      return rightScore - leftScore;
    });
    const chosen: string[] = [];
    let runningCost = 0;

    sorted.forEach((line) => {
      const unitCost =
        line.recommendedStockTarget > 0
          ? (line.revenuePotential - line.marginPotential) / line.recommendedStockTarget
          : 0;
      const lineCost = unitCost * line.recommendedToProduce;

      if (runningCost + lineCost <= budget && line.recommendedToProduce > 0) {
        chosen.push(`${line.productName}: ${line.recommendedToProduce} unités`);
        runningCost += lineCost;
      }
    });

    return {
      title: "Commande raisonnable sous budget",
      summary:
        chosen.length > 0
          ? `Avec un budget de ${budget}, je prioriserais les références les plus rentables et les moins risquées.`
          : `Avec un budget de ${budget}, aucune relance complète n'entre dans le plafond avec les quantités recommandées. Réduis les réassorts les plus lourds.`,
      bullets: chosen.length > 0 ? chosen : args.forecast.alerts.slice(0, 3)
    };
  }

  if (
    question.includes("rupture") ||
    question.includes("xl") ||
    question.includes("stock out")
  ) {
    return {
      title: "Risque de rupture",
      summary:
        xlRisk.length > 0
          ? "Oui, le XL mérite une attention immédiate sur les références ci-dessous."
          : "Je ne vois pas de rupture XL claire dans la projection actuelle.",
      bullets: xlRisk.length > 0 ? xlRisk : args.forecast.alerts.slice(0, 3)
    };
  }

  if (question.includes("marge")) {
    return {
      title: "Meilleure marge",
      summary:
        args.forecast.assistantFacts.bestMarginProduct
          ? `${args.forecast.assistantFacts.bestMarginProduct} ressort comme la meilleure marge potentielle dans cette projection.`
          : "Je n'ai pas assez de coûts produits pour classer la marge proprement.",
      bullets: args.forecast.lines
        .slice(0, 3)
        .map(
          (line) =>
            `${line.productName}: marge potentielle ${Math.round(line.marginPotential)}`
        )
    };
  }

  if (
    question.includes("eviter") ||
    question.includes("avoid") ||
    question.includes("surstock")
  ) {
    return {
      title: "Ce que j'éviterais",
      summary:
        args.forecast.assistantFacts.overstockProducts.length > 0
          ? "Je ralentirais d'abord les références déjà trop chargées en stock."
          : "Aucune référence n'est franchement en surstock, mais les réassorts faibles peuvent attendre.",
      bullets:
        args.forecast.assistantFacts.overstockProducts.length > 0
          ? args.forecast.assistantFacts.overstockProducts
          : args.forecast.lines
              .filter((line) => line.recommendedToProduce <= 2)
              .slice(0, 3)
              .map((line) => `${line.productName}: petite relance, non prioritaire.`)
    };
  }

  if (question.includes("t shirt") || question.includes("tee")) {
    return {
      title: "Volume t-shirts recommandé",
      summary: `Je recommande ${tshirtLines.reduce(
        (sum, line) => sum + line.recommendedToProduce,
        0
      )} t-shirts à produire sur ce scope.`,
      bullets: tshirtLines
        .slice(0, 4)
        .map((line) => `${line.productName}: ${line.recommendedToProduce} unités`)
    };
  }

  return {
    title: "Pourquoi ces quantités",
    summary:
      "La projection combine les ventes SumUp observées, le stock actuel, la capacité estimée des dates, le contexte de tournée et la sécurité par design.",
    bullets: [
      ...args.forecast.lines.slice(0, 3).map((line) => line.reasoning[0] ?? line.productName),
      ...(args.analytics.notes.length > 0 ? [args.analytics.notes[0] ?? ""] : [])
    ].filter(Boolean)
  };
}
