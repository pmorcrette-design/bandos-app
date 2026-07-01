"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Package2,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp
} from "lucide-react";

import { SumUpConnectionCard } from "@/components/integrations/sumup-connection-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { t, translateMerchCategory, type Locale } from "@/lib/i18n";
import type { SumUpConnectionStatus } from "@/lib/integrations/sumup";
import {
  getMerchInventorySummary,
  getMerchProductMetrics,
  groupMerchByLocation
} from "@/lib/merch";
import { formatCurrency, type SupportedCurrency } from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";

function parseNumericInput(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function MerchManagerView({
  currency,
  locale,
  sumupStatus
}: {
  currency: SupportedCurrency;
  locale: Locale;
  sumupStatus: SumUpConnectionStatus;
}) {
  const merchCatalog = useBandosUIStore((state) => state.merchCatalog);
  const addMerchProduct = useBandosUIStore((state) => state.addMerchProduct);
  const importMerchProductsFromSumUp = useBandosUIStore(
    (state) => state.importMerchProductsFromSumUp
  );
  const updateMerchProduct = useBandosUIStore((state) => state.updateMerchProduct);
  const deleteMerchProduct = useBandosUIStore((state) => state.deleteMerchProduct);
  const [isImportingCatalog, setIsImportingCatalog] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "Accessory",
    supplier: "Manual entry",
    location: "Merch case",
    initialStock: "25",
    stock: "25",
    purchasePrice: "5",
    salePrice: "15",
    reorderPoint: "8"
  });

  const inventory = useMemo(
    () => getMerchInventorySummary(merchCatalog),
    [merchCatalog]
  );
  const locations = useMemo(
    () => groupMerchByLocation(merchCatalog),
    [merchCatalog]
  );
  const topSellers = useMemo(
    () => [...merchCatalog].sort((left, right) => right.sold - left.sold).slice(0, 3),
    [merchCatalog]
  );
  const lowStockProducts = useMemo(
    () =>
      merchCatalog.filter(
        (product) => getMerchProductMetrics(product).stockHealth !== "healthy"
      ),
    [merchCatalog]
  );

  function createProduct() {
    if (!newProduct.name.trim() || !newProduct.sku.trim()) {
      return;
    }

    addMerchProduct({
      name: newProduct.name.trim(),
      sku: newProduct.sku.trim(),
      category: newProduct.category,
      supplier: newProduct.supplier.trim() || "Manual entry",
      location: newProduct.location.trim() || "Merch case",
      initialStock: Math.max(parseNumericInput(newProduct.initialStock), 0),
      stock: Math.max(parseNumericInput(newProduct.stock), 0),
      purchasePrice: Math.max(parseNumericInput(newProduct.purchasePrice), 0),
      salePrice: Math.max(parseNumericInput(newProduct.salePrice), 0),
      reorderPoint: Math.max(parseNumericInput(newProduct.reorderPoint), 0)
    });

    setNewProduct({
      name: "",
      sku: "",
      category: "Accessory",
      supplier: "Manual entry",
      location: "Merch case",
      initialStock: "25",
      stock: "25",
      purchasePrice: "5",
      salePrice: "15",
      reorderPoint: "8"
    });
  }

  async function importCatalogFromSumUp() {
    setIsImportingCatalog(true);
    setImportMessage("");
    setImportError("");

    try {
      const response = await fetch("/api/integrations/sumup/catalog", {
        method: "GET",
        cache: "no-store"
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            count?: number;
            items?: Array<{
              name: string;
              quantitySold: number;
              salePrice: number;
              revenue: number;
            }>;
          }
        | null;

      if (!response.ok || !payload?.ok || !payload.items) {
        setImportError(
          payload?.error ||
            t(
              locale,
              "Impossible d'importer le catalogue SumUp.",
              "Unable to import the SumUp catalog."
            )
        );
        return;
      }

      const result = importMerchProductsFromSumUp(payload.items);

      setImportMessage(
        t(
          locale,
          `${result.created} article(s) créé(s), ${result.updated} article(s) mis à jour depuis SumUp.`,
          `${result.created} item(s) created, ${result.updated} item(s) updated from SumUp.`
        )
      );
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : t(
              locale,
              "Erreur d'import SumUp.",
              "SumUp import error."
            )
      );
    } finally {
      setIsImportingCatalog(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [t(locale, "Références actives", "Active SKUs"), String(inventory.totalSkus)],
          [t(locale, "Unités restantes", "Units left"), String(inventory.totalUnitsLeft)],
          [
            t(locale, "CA merch", "Merch revenue"),
            formatCurrency(inventory.totalRevenue, currency, "GBP")
          ],
          [
            t(locale, "Valeur de stock", "Stock value"),
            formatCurrency(inventory.totalStockCost, currency, "GBP")
          ]
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-mist-50">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Package2 className="h-5 w-5 text-coral-300" />
                </div>
                <div>
                  <p className="text-lg font-medium text-mist-50">
                    {t(locale, "Vue opératoire merch", "Merch operations view")}
                  </p>
                  <p className="text-sm text-mist-300">
                    {t(
                      locale,
                      "Mode manuel actif tant que la synchronisation SumUp n'est pas finalisée.",
                      "Manual mode is active until SumUp sync is fully connected."
                    )}
                  </p>
                </div>
              </div>
            </div>
            <Badge tone={sumupStatus.connected ? "success" : "warning"}>
              {sumupStatus.connected
                ? t(locale, "Sync SumUp active", "SumUp sync active")
                : t(locale, "Mode manuel", "Manual mode")}
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Marge réalisée", "Realized margin")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-mist-50">
                {formatCurrency(inventory.totalMargin, currency, "GBP")}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Valeur vente restante", "Remaining sell value")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-mist-50">
                {formatCurrency(inventory.totalPotentialRevenue, currency, "GBP")}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Unités vendues", "Units sold")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-mist-50">
                {inventory.totalUnitsSold}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-coral-300" />
                <p className="text-sm font-medium text-mist-50">
                  {t(locale, "Top sellers", "Top sellers")}
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {topSellers.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-mist-50">{product.name}</p>
                      <Badge>{product.sold} {t(locale, "vendus", "sold")}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-mist-300">
                      {formatCurrency(product.revenue, currency, "GBP")} •{" "}
                      {translateMerchCategory(locale, product.category)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="text-sm font-medium text-mist-50">
                {t(locale, "Emplacements de stock", "Inventory locations")}
              </p>
              <div className="mt-4 space-y-3">
                {locations.map((location) => (
                  <div
                    key={location.location}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-mist-50">{location.location}</p>
                      <Badge>{location.units} u.</Badge>
                    </div>
                    <p className="mt-2 text-sm text-mist-300">
                      {location.skuCount} {t(locale, "réf.", "SKU")} •{" "}
                      {location.productNames.join(" • ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <SumUpConnectionCard locale={locale} status={sumupStatus} compact />
          <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-lg font-medium text-mist-50">
                  {t(locale, "Import catalogue SumUp", "Import SumUp catalog")}
                </p>
                <p className="mt-2 text-sm text-mist-300">
                  {t(
                    locale,
                    "Crée ou complète les articles merch à partir des produits vus dans les transactions SumUp. Le stock reste manuel dans BandOS.",
                    "Create or enrich merch items from products seen in SumUp transactions. Stock remains manual in BandOS."
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant={sumupStatus.connected ? "primary" : "secondary"}
                onClick={importCatalogFromSumUp}
                disabled={!sumupStatus.connected || isImportingCatalog}
                className="min-w-[188px] shrink-0 self-start whitespace-nowrap lg:self-auto"
              >
                <RefreshCw className={`h-4 w-4 ${isImportingCatalog ? "animate-spin" : ""}`} />
                {isImportingCatalog
                  ? t(locale, "Import en cours", "Importing")
                  : t(locale, "Importer le catalogue", "Import catalog")}
              </Button>
            </div>

            {importMessage ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {importMessage}
              </div>
            ) : null}

            {importError ? (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {importError}
              </div>
            ) : null}
          </Card>
          <Card>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Ajouter un article", "Add an item")}
            </p>
            <div className="mt-4 grid gap-3">
              <Input
                value={newProduct.name}
                onChange={(event) =>
                  setNewProduct((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={t(locale, "Nom article", "Item name")}
              />
              <Input
                value={newProduct.sku}
                onChange={(event) =>
                  setNewProduct((current) => ({ ...current, sku: event.target.value }))
                }
                placeholder="SKU"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={newProduct.location}
                  onChange={(event) =>
                    setNewProduct((current) => ({
                      ...current,
                      location: event.target.value
                    }))
                  }
                  placeholder={t(locale, "Emplacement", "Location")}
                />
                <Input
                  value={newProduct.category}
                  onChange={(event) =>
                    setNewProduct((current) => ({
                      ...current,
                      category: event.target.value
                    }))
                  }
                  placeholder={t(locale, "Catégorie", "Category")}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={newProduct.initialStock}
                  onChange={(event) =>
                    setNewProduct((current) => ({
                      ...current,
                      initialStock: event.target.value
                    }))
                  }
                  inputMode="numeric"
                  placeholder={t(locale, "Stock initial", "Initial stock")}
                />
                <Input
                  value={newProduct.stock}
                  onChange={(event) =>
                    setNewProduct((current) => ({ ...current, stock: event.target.value }))
                  }
                  inputMode="numeric"
                  placeholder={t(locale, "Stock actuel", "Current stock")}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={newProduct.purchasePrice}
                  onChange={(event) =>
                    setNewProduct((current) => ({
                      ...current,
                      purchasePrice: event.target.value
                    }))
                  }
                  inputMode="decimal"
                  placeholder={t(locale, "Prix achat", "Purchase price")}
                />
                <Input
                  value={newProduct.salePrice}
                  onChange={(event) =>
                    setNewProduct((current) => ({
                      ...current,
                      salePrice: event.target.value
                    }))
                  }
                  inputMode="decimal"
                  placeholder={t(locale, "Prix vente", "Sale price")}
                />
                <Input
                  value={newProduct.reorderPoint}
                  onChange={(event) =>
                    setNewProduct((current) => ({
                      ...current,
                      reorderPoint: event.target.value
                    }))
                  }
                  inputMode="numeric"
                  placeholder={t(locale, "Seuil", "Reorder point")}
                />
              </div>
              <Button type="button" onClick={createProduct}>
                <Plus className="h-4 w-4" />
                {t(locale, "Ajouter l'article", "Add item")}
              </Button>
            </div>
          </Card>

          <Card>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Alertes de réassort", "Restock watch")}
            </p>
            <div className="mt-4 space-y-3">
              {lowStockProducts.length ? (
                lowStockProducts.map((product) => {
                  const metrics = getMerchProductMetrics(product);

                  return (
                    <div
                      key={product.id}
                      className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-mist-50">{product.name}</p>
                          <p className="mt-1 text-sm text-mist-300">
                            {product.stock} / {product.initialStock} • {product.location}
                          </p>
                        </div>
                        <Badge tone={metrics.stockHealth === "low" ? "warning" : "accent"}>
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {metrics.stockHealth === "low"
                            ? t(locale, "Priorité", "Priority")
                            : t(locale, "À suivre", "Watch")}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 p-4 text-sm text-mist-300">
                  {t(locale, "Aucun article à risque pour le moment.", "No at-risk items right now.")}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {merchCatalog.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {merchCatalog.map((product) => {
            const metrics = getMerchProductMetrics(product);

            return (
              <Card key={product.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-2xl font-semibold text-mist-50">{product.name}</p>
                      <Badge>{product.sku}</Badge>
                      <Badge tone={metrics.stockHealth === "healthy" ? "success" : "warning"}>
                        {metrics.stockHealth === "healthy"
                          ? t(locale, "Stable", "Stable")
                          : metrics.stockHealth === "low"
                            ? t(locale, "Réassort", "Restock")
                            : t(locale, "Surveillance", "Watch")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-mist-300">
                      {translateMerchCategory(locale, product.category)} • {product.supplier}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{product.location}</Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => deleteMerchProduct(product.id)}
                      className="border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t(locale, "Supprimer", "Delete")}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-mist-200">{t(locale, "Nom", "Name")}</span>
                    <Input
                      defaultValue={product.name}
                      onBlur={(event) =>
                        updateMerchProduct(product.id, { name: event.target.value })
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-mist-200">SKU</span>
                    <Input
                      defaultValue={product.sku}
                      onBlur={(event) =>
                        updateMerchProduct(product.id, { sku: event.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm text-mist-200">{t(locale, "Stock initial", "Initial stock")}</span>
                    <Input
                      defaultValue={String(product.initialStock)}
                      inputMode="numeric"
                      onBlur={(event) =>
                        updateMerchProduct(product.id, {
                          initialStock: Math.max(parseNumericInput(event.target.value), 0)
                        })
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-mist-200">{t(locale, "Stock actuel", "Current stock")}</span>
                    <Input
                      defaultValue={String(product.stock)}
                      inputMode="numeric"
                      onBlur={(event) =>
                        updateMerchProduct(product.id, {
                          stock: Math.max(parseNumericInput(event.target.value), 0)
                        })
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-mist-200">{t(locale, "Seuil réassort", "Reorder point")}</span>
                    <Input
                      defaultValue={String(product.reorderPoint)}
                      inputMode="numeric"
                      onBlur={(event) =>
                        updateMerchProduct(product.id, {
                          reorderPoint: Math.max(parseNumericInput(event.target.value), 0)
                        })
                      }
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-sm text-mist-200">{t(locale, "Prix achat", "Purchase price")}</span>
                    <Input
                      defaultValue={String(product.purchasePrice)}
                      inputMode="decimal"
                      onBlur={(event) =>
                        updateMerchProduct(product.id, {
                          purchasePrice: Math.max(parseNumericInput(event.target.value), 0)
                        })
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-mist-200">{t(locale, "Prix vente", "Sale price")}</span>
                    <Input
                      defaultValue={String(product.salePrice)}
                      inputMode="decimal"
                      onBlur={(event) =>
                        updateMerchProduct(product.id, {
                          salePrice: Math.max(parseNumericInput(event.target.value), 0)
                        })
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-mist-200">{t(locale, "Emplacement", "Location")}</span>
                    <Input
                      defaultValue={product.location}
                      onBlur={(event) =>
                        updateMerchProduct(product.id, { location: event.target.value })
                      }
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-mist-200">{t(locale, "Fournisseur", "Supplier")}</span>
                    <Input
                      defaultValue={product.supplier}
                      onBlur={(event) =>
                        updateMerchProduct(product.id, { supplier: event.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-4">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                      {t(locale, "Vendu", "Sold")}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-mist-50">{product.sold}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                      {t(locale, "CA", "Revenue")}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-mist-50">
                      {formatCurrency(product.revenue, currency, "GBP")}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                      {t(locale, "Marge réalisée", "Realized margin")}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-mist-50">
                      {formatCurrency(metrics.realizedMargin, currency, "GBP")}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                      {t(locale, "Vente potentielle", "Potential sales")}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-mist-50">
                      {formatCurrency(metrics.potentialRevenue, currency, "GBP")}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={t(locale, "Aucun article merch", "No merch items")}
          body={t(
            locale,
            "Ajoute ton premier article pour commencer le suivi manuel du stock.",
            "Add your first item to start manual stock tracking."
          )}
        />
      )}
    </div>
  );
}
