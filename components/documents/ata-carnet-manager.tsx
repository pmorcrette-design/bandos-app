"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  Plus,
  Save,
  Trash2,
  Upload
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { t, type Locale } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";

type AtaCarnetItem = {
  id: string;
  pieces: number;
  packaging: string;
  designation: string;
  weight: number;
  weightUnit: string;
  valueExVat: number;
  origin: string;
  serialNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

function buildDraftItem(): AtaCarnetItem {
  const now = new Date().toISOString();

  return {
    id: `ata-manual-${Date.now()}`,
    pieces: 1,
    packaging: "",
    designation: "",
    weight: 0,
    weightUnit: "kg",
    valueExVat: 0,
    origin: "",
    serialNumber: "",
    notes: "",
    createdAt: now,
    updatedAt: now
  };
}

function parseNumericValue(value: string) {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AtaCarnetManager({
  locale,
  initialItems
}: {
  locale: Locale;
  initialItems: AtaCarnetItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const totals = useMemo(() => {
    return items.reduce(
      (accumulator, item) => {
        accumulator.pieces += item.pieces;
        accumulator.weight += item.weight;
        accumulator.value += item.valueExVat;
        return accumulator;
      },
      { pieces: 0, weight: 0, value: 0 }
    );
  }, [items]);

  function updateItem(
    id: string,
    patch: Partial<Omit<AtaCarnetItem, "id" | "createdAt">>
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              updatedAt: new Date().toISOString()
            }
          : item
      )
    );
  }

  function addManualItem() {
    setItems((currentItems) => [...currentItems, buildDraftItem()]);
  }

  function removeItem(id: string) {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  }

  function persistItems(nextItems: AtaCarnetItem[]) {
    setFeedback("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/ata-carnet", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: nextItems
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | { items?: AtaCarnetItem[]; error?: string }
        | null;

      if (!response.ok || !payload?.items) {
        setError(
          payload?.error ||
            t(locale, "Impossible d'enregistrer le carnet ATA.", "Unable to save ATA carnet.")
        );
        return;
      }

      setItems(payload.items);
      setFeedback(
        t(locale, "Carnet ATA enregistré.", "ATA carnet saved.")
      );
    });
  }

  function saveItems() {
    persistItems(items);
  }

  function importCsv(file: File) {
    setFeedback("");
    setError("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/ata-carnet/import", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json().catch(() => null)) as
        | { items?: AtaCarnetItem[]; error?: string }
        | null;

      if (!response.ok || !payload?.items) {
        setError(
          payload?.error ||
            t(locale, "Import ATA impossible.", "Unable to import ATA file.")
        );
        return;
      }

      setItems(payload.items);
      setFeedback(
        t(
          locale,
          "Import gouvernemental chargé dans le carnet ATA.",
          "Government CSV loaded into the ATA carnet."
        )
      );
    });
  }

  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-white/[0.02]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Carnet ATA", "ATA Carnet")}
            </p>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.24em] text-mist-300">
              {items.length} {t(locale, "lignes", "rows")}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-mist-300">
            {t(
              locale,
              "Importe le CSV gouvernemental, garde ta liste de matos sur une seule ligne repliable, puis regénère un CSV propre depuis la même table.",
              "Import the government CSV, keep the equipment list in one collapsible row, then regenerate a clean CSV from the same table."
            )}
          </p>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Pièces", "Pieces")}
            </p>
            <p className="mt-1 text-sm font-medium text-mist-50">{totals.pieces}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Valeur HT", "Ex VAT value")}
            </p>
            <p className="mt-1 text-sm font-medium text-mist-50">
              {formatCurrency(totals.value, "EUR", "EUR")}
            </p>
          </div>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-mist-200">
          <ChevronDown
            className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {isOpen ? (
        <div className="space-y-6 border-t border-white/8 px-6 py-6">
          <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Carnet ATA", "ATA Carnet")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Importe le CSV gouvernemental, nettoie la liste de matos, puis regénère un CSV prêt à envoyer depuis la même table.",
                  "Import the government CSV, clean up your equipment list, then regenerate a ready-to-send CSV from the same table."
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="cursor-pointer">
                <span className="sr-only">
                  {t(locale, "Importer un CSV ATA", "Import ATA CSV")}
                </span>
                <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/5 px-4 text-sm font-medium text-mist-50 transition hover:bg-white/10">
                  <Upload className="h-4 w-4" />
                  {t(locale, "Importer le CSV ATA", "Import ATA CSV")}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      importCsv(file);
                    }

                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <Button type="button" variant="secondary" onClick={addManualItem}>
                <Plus className="h-4 w-4" />
                {t(locale, "Ajouter une ligne", "Add row")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={saveItems}
                disabled={isPending}
              >
                <Save className="h-4 w-4" />
                {t(locale, "Enregistrer", "Save")}
              </Button>
              <a
                href="/api/ata-carnet/export"
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-coral-500 px-4 text-sm font-medium text-white shadow-card transition hover:bg-coral-400"
              >
                <Download className="h-4 w-4" />
                {t(locale, "Exporter le CSV", "Export CSV")}
              </a>
            </div>
          </Card>

          <Card className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Pièces", "Pieces")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-mist-50">{totals.pieces}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Poids total", "Total weight")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-mist-50">
                {totals.weight.toFixed(1)} kg
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Valeur HT", "Ex VAT value")}
              </p>
              <p className="mt-2 text-2xl font-semibold text-mist-50">
                {formatCurrency(totals.value, "EUR", "EUR")}
              </p>
            </div>
          </Card>

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : feedback ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {feedback}
            </div>
          ) : null}

          {!items.length ? (
            <EmptyState
              title={t(locale, "Aucune ligne ATA", "No ATA line yet")}
              body={t(
                locale,
                "Importe le CSV officiel ou commence une liste de matos manuelle pour générer ensuite le fichier d'export.",
                "Import the official CSV or start a manual equipment list so you can generate the export file next."
              )}
            />
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] text-left text-sm">
                  <thead className="border-b border-white/8 bg-white/[0.03] text-mist-300">
                    <tr>
                      {[
                        t(locale, "Nb pièces", "Pieces"),
                        t(locale, "Emballage", "Packaging"),
                        t(locale, "Désignation", "Designation"),
                        t(locale, "Poids", "Weight"),
                        t(locale, "Unité", "Unit"),
                        t(locale, "Valeur HT", "Ex VAT value"),
                        t(locale, "Origine", "Origin"),
                        t(locale, "N° série", "Serial"),
                        t(locale, "Notes", "Notes"),
                        t(locale, "Action", "Action")
                      ].map((label) => (
                        <th key={label} className="px-4 py-4 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-white/8 align-top">
                        <td className="px-4 py-4">
                          <Input
                            value={item.pieces}
                            onChange={(event) =>
                              updateItem(item.id, {
                                pieces: Math.max(
                                  1,
                                  Math.floor(parseNumericValue(event.target.value))
                                )
                              })
                            }
                            type="number"
                            min={1}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            value={item.packaging}
                            onChange={(event) =>
                              updateItem(item.id, { packaging: event.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            value={item.designation}
                            onChange={(event) =>
                              updateItem(item.id, { designation: event.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            value={item.weight}
                            onChange={(event) =>
                              updateItem(item.id, {
                                weight: parseNumericValue(event.target.value)
                              })
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            value={item.weightUnit}
                            onChange={(event) =>
                              updateItem(item.id, { weightUnit: event.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            value={item.valueExVat}
                            onChange={(event) =>
                              updateItem(item.id, {
                                valueExVat: parseNumericValue(event.target.value)
                              })
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            value={item.origin}
                            onChange={(event) =>
                              updateItem(item.id, { origin: event.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            value={item.serialNumber}
                            onChange={(event) =>
                              updateItem(item.id, { serialNumber: event.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            value={item.notes}
                            onChange={(event) =>
                              updateItem(item.id, { notes: event.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Card className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 h-5 w-5 text-coral-300" />
            <div>
              <p className="text-sm font-medium text-mist-50">
                {t(
                  locale,
                  "Compatible import / export gouvernemental",
                  "Government import / export ready"
                )}
              </p>
              <p className="mt-2 text-sm leading-7 text-mist-300">
                {t(
                  locale,
                  "Le module garde la structure CSV Carnet ATA, importe les colonnes officielles et te laisse regénérer un fichier propre depuis la même liste de matos.",
                  "The module keeps the ATA carnet CSV structure, imports the official columns, and lets you regenerate a clean file from the same equipment list."
                )}
              </p>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}
