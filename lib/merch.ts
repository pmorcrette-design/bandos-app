import { merchProducts, type MerchProduct } from "@/lib/mock-data";

export function getMerchProductMetrics(product: MerchProduct) {
  const costOfSold = product.sold * product.purchasePrice;
  const remainingCostValue = product.stock * product.purchasePrice;
  const potentialRevenue = product.stock * product.salePrice;
  const realizedMargin = product.revenue - costOfSold;
  const marginPerUnit = product.salePrice - product.purchasePrice;
  const marginRate = product.salePrice
    ? realizedMargin / Math.max(product.revenue, 1)
    : 0;
  const stockHealth =
    product.stock <= product.reorderPoint
      ? "low"
      : product.stock <= product.reorderPoint * 1.5
        ? "watch"
        : "healthy";

  return {
    costOfSold,
    remainingCostValue,
    potentialRevenue,
    realizedMargin,
    marginPerUnit,
    marginRate,
    stockHealth
  };
}

export function getMerchInventorySummary(products: MerchProduct[] = merchProducts) {
  return products.reduce(
    (summary, product) => {
      const metrics = getMerchProductMetrics(product);

      summary.totalSkus += 1;
      summary.totalUnitsLeft += product.stock;
      summary.totalUnitsSold += product.sold;
      summary.totalRevenue += product.revenue;
      summary.totalStockCost += metrics.remainingCostValue;
      summary.totalPotentialRevenue += metrics.potentialRevenue;
      summary.totalMargin += metrics.realizedMargin;

      if (metrics.stockHealth === "low") {
        summary.lowStockCount += 1;
      }

      return summary;
    },
    {
      totalSkus: 0,
      totalUnitsLeft: 0,
      totalUnitsSold: 0,
      totalRevenue: 0,
      totalStockCost: 0,
      totalPotentialRevenue: 0,
      totalMargin: 0,
      lowStockCount: 0
    }
  );
}

export function groupMerchByLocation(products: MerchProduct[] = merchProducts) {
  const locations = new Map<
    string,
    {
      location: string;
      skuCount: number;
      units: number;
      productNames: string[];
    }
  >();

  for (const product of products) {
    const existing = locations.get(product.location) ?? {
      location: product.location,
      skuCount: 0,
      units: 0,
      productNames: []
    };

    existing.skuCount += 1;
    existing.units += product.stock;
    existing.productNames.push(product.name);
    locations.set(product.location, existing);
  }

  return Array.from(locations.values());
}
