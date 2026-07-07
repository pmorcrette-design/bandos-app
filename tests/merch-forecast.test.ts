import { test } from "node:test";
import * as assert from "node:assert/strict";

import {
  answerMerchAssistantQuestion,
  buildMerchForecast,
  buildMerchSalesAnalytics,
  generateMerchPurchaseOrder,
  type ForecastMerchDesign,
  type ForecastMerchProduct,
  type ForecastShow,
  type ForecastSumUpSale
} from "../lib/merch-forecast";

const designs: ForecastMerchDesign[] = [
  {
    id: "design-a",
    name: "Concrete Sigil",
    collection: "tour",
    status: "active",
    tags: ["logo", "tour design"],
    productTypes: ["t-shirt", "hoodie"]
  },
  {
    id: "design-b",
    name: "Logo Evergreen",
    collection: "evergreen",
    status: "active",
    tags: ["logo", "safe seller"],
    productTypes: ["patch"]
  }
];

const products: ForecastMerchProduct[] = [
  {
    id: "tee-1",
    name: "Concrete Sigil Tee",
    sku: "TEE-1",
    category: "Apparel",
    productType: "t-shirt",
    designId: "design-a",
    color: "Black",
    supplier: "Night Shift",
    stock: 6,
    sold: 32,
    purchasePrice: 6,
    salePrice: 20,
    reorderPoint: 8,
    sizeBreakdown: [
      { size: "M", remaining: 2 },
      { size: "L", remaining: 3 },
      { size: "XL", remaining: 1 }
    ],
    sumupCatalogName: "Concrete Sigil Tee"
  },
  {
    id: "patch-1",
    name: "Logo Patch",
    sku: "PATCH-1",
    category: "Accessory",
    productType: "patch",
    designId: "design-b",
    color: "Red / Bone",
    supplier: "Dead Thread",
    stock: 20,
    sold: 48,
    purchasePrice: 1,
    salePrice: 5,
    reorderPoint: 10,
    sizeBreakdown: [{ size: "N/A", remaining: 20 }],
    sumupCatalogName: "Logo Patch"
  }
];

const shows: ForecastShow[] = [
  {
    id: "show-1",
    tourName: "UK Tour",
    date: "2027-04-19",
    venue: "The Peer Hat",
    city: "Manchester",
    country: "UK",
    capacity: 130,
    validated: true,
    isStandalone: false,
    status: "booked"
  },
  {
    id: "show-2",
    tourName: "UK Tour",
    date: "2027-04-20",
    venue: "Lughole",
    city: "Sheffield",
    country: "UK",
    capacity: 100,
    validated: true,
    isStandalone: false,
    status: "booked"
  }
];

const sales: ForecastSumUpSale[] = [
  {
    id: "sale-1",
    transactionId: "txn-1",
    soldAt: "2027-03-01T19:00:00.000Z",
    productName: "Concrete Sigil Tee XL",
    normalizedProductName: "concrete sigil tee xl",
    detectedSize: "XL",
    quantity: 4,
    salePrice: 20,
    revenue: 80,
    currency: "GBP",
    vatRate: null
  },
  {
    id: "sale-2",
    transactionId: "txn-2",
    soldAt: "2027-03-02T19:00:00.000Z",
    productName: "Concrete Sigil Tee L",
    normalizedProductName: "concrete sigil tee l",
    detectedSize: "L",
    quantity: 6,
    salePrice: 20,
    revenue: 120,
    currency: "GBP",
    vatRate: null
  },
  {
    id: "sale-3",
    transactionId: "txn-3",
    soldAt: "2027-03-03T19:00:00.000Z",
    productName: "Logo Patch",
    normalizedProductName: "logo patch",
    detectedSize: null,
    quantity: 10,
    salePrice: 5,
    revenue: 50,
    currency: "GBP",
    vatRate: null
  }
];

test("analytics map SumUp sales to merch products and designs", () => {
  const analytics = buildMerchSalesAnalytics({
    products,
    designs,
    shows,
    sales,
    occupancyRate: 0.8
  });

  assert.equal(analytics.totals.units, 20);
  assert.equal(analytics.topProducts[0]?.productName, "Concrete Sigil Tee");
  assert.equal(analytics.designs[0]?.designName, "Concrete Sigil");
  assert.ok(analytics.sizes.some((entry) => entry.size === "XL" && entry.units === 4));
});

test("forecast recommends production and keeps size allocation coherent", () => {
  const forecast = buildMerchForecast({
    products,
    designs,
    sales,
    scenario: {
      label: "UK Tour",
      eventType: "headline",
      season: "spring",
      occupancyRate: 0.8,
      budgetMax: null,
      shows
    }
  });

  const teeLine = forecast.lines.find((line) => line.productId === "tee-1");

  assert.ok(teeLine);
  assert.ok((teeLine?.recommendedToProduce ?? 0) > 0);
  assert.equal(
    teeLine?.sizeRecommendation.reduce((sum, entry) => sum + entry.recommendedToProduce, 0),
    teeLine?.recommendedToProduce
  );
});

test("purchase order includes design names and keeps supplier filtering", () => {
  const forecast = buildMerchForecast({
    products,
    designs,
    sales,
    scenario: {
      label: "UK Tour",
      eventType: "headline",
      season: "spring",
      occupancyRate: 0.8,
      budgetMax: null,
      shows
    }
  });

  const order = generateMerchPurchaseOrder({
    forecast,
    workspaceName: "WIDESPREAD DISEASE",
    supplier: "Night Shift",
    currency: "EUR"
  });

  assert.ok(order.lines.length > 0);
  assert.ok(order.lines.every((line) => line.designName.length > 0));
  assert.ok(order.lines.every((line) => line.productName.includes("Concrete Sigil")));
});

test("assistant can answer conversational product-type follow-ups", () => {
  const analytics = buildMerchSalesAnalytics({
    products,
    designs,
    shows,
    sales,
    occupancyRate: 0.8
  });
  const forecast = buildMerchForecast({
    products,
    designs,
    sales,
    scenario: {
      label: "UK Tour",
      eventType: "headline",
      season: "spring",
      occupancyRate: 0.8,
      budgetMax: null,
      shows
    }
  });

  const answer = answerMerchAssistantQuestion({
    question: "Et les t-shirts ?",
    forecast,
    analytics
  });

  assert.match(answer.title, /Volume/i);
  assert.ok(answer.summary.length > 0);
});
