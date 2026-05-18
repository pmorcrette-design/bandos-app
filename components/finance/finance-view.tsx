"use client";

import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  t,
  translateFinanceCategory,
  translateFinanceType,
  type Locale
} from "@/lib/i18n";
import { financeEntries } from "@/lib/mock-data";
import { convertCurrency, formatCurrency, type SupportedCurrency } from "@/lib/utils";

function buildCsv() {
  const rows = [
    ["type", "category", "label", "amount", "currency", "date"],
    ...financeEntries.map((entry) => [
      entry.type,
      entry.category,
      entry.label,
      String(entry.amount),
      entry.currency,
      entry.date
    ])
  ];

  return rows.map((row) => row.join(",")).join("\n");
}

export function FinanceView({
  currency,
  locale
}: {
  currency: SupportedCurrency;
  locale: Locale;
}) {
  const income = financeEntries
    .filter((entry) => entry.type === "income")
    .reduce(
      (total, entry) => total + convertCurrency(entry.amount, entry.currency, currency),
      0
    );
  const expenses = financeEntries
    .filter((entry) => entry.type === "expense")
    .reduce(
      (total, entry) => total + convertCurrency(entry.amount, entry.currency, currency),
      0
    );
  const profit = income - expenses;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Revenus totaux", "Total income")}
          </p>
          <p className="mt-3 text-3xl font-semibold text-mist-50">
            {formatCurrency(income, currency, currency)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Dépenses totales", "Total expenses")}
          </p>
          <p className="mt-3 text-3xl font-semibold text-mist-50">
            {formatCurrency(expenses, currency, currency)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Profit / perte", "Profit / loss")}
          </p>
          <p className="mt-3 text-3xl font-semibold text-mist-50">
            {formatCurrency(profit, currency, currency)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Part par membre", "Member split")}
          </p>
          <p className="mt-3 text-3xl font-semibold text-mist-50">
            {formatCurrency(Math.round(profit / 4), currency, currency)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Flux de trésorerie", "Cash flow")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(locale, "Répartition par catégorie sur la tournée active", "Category split across the active run")}
              </p>
            </div>
            <a
              download="bandos-finance-export.csv"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(buildCsv())}`}
            >
              <Button variant="secondary">
                <Download className="h-4 w-4" />
                {t(locale, "Exporter CSV", "Export CSV")}
              </Button>
            </a>
          </div>
          <div className="mt-8 space-y-4">
            {["Show Fee", "Merch Sales", "Fuel", "Hotels", "Ferries", "Food"].map(
              (category) => {
                const total = financeEntries
                  .filter((entry) => entry.category === category)
                  .reduce(
                    (sum, entry) =>
                      sum + convertCurrency(entry.amount, entry.currency, currency),
                    0
                  );
                const width = Math.min(100, Math.max(12, total / 15));

                return (
                  <div key={category}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-mist-200">
                        {translateFinanceCategory(locale, category)}
                      </span>
                      <span className="text-mist-50">
                        {formatCurrency(total, currency, currency)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/8">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-coral-500 to-coral-300"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </Card>

        <Card>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Transactions récentes", "Recent transactions")}
          </p>
          <div className="mt-5 space-y-3">
            {financeEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-mist-50">{entry.label}</p>
                    <p className="mt-1 text-sm text-mist-300">
                      {translateFinanceCategory(locale, entry.category)}
                    </p>
                  </div>
                  <Badge tone={entry.type === "income" ? "success" : "warning"}>
                    {translateFinanceType(locale, entry.type)}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-mist-200">
                  <span>{entry.date}</span>
                  <span>{formatCurrency(entry.amount, currency, entry.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
