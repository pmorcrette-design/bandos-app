"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";

import { AtaCarnetManager } from "@/components/documents/ata-carnet-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  t,
  translateDocumentCategory,
  type Locale
} from "@/lib/i18n";
import { documents } from "@/lib/mock-data";
import { useBandosUIStore } from "@/store/ui-store";

export function DocumentsView({
  locale,
  initialAtaItems
}: {
  locale: Locale;
  initialAtaItems: Array<{
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
  }>;
}) {
  const [selectedTour, setSelectedTour] = useState("all");
  const uploadedDocuments = useBandosUIStore((state) => state.uploadedDocuments);
  const addUploadedDocuments = useBandosUIStore(
    (state) => state.addUploadedDocuments
  );

  const allDocuments = useMemo(
    () => [
      ...uploadedDocuments.map((entry) => ({
        id: entry.id,
        name: entry.name,
        category: entry.category,
        tour: entry.tour,
        show: "-",
        updatedAt: "Now",
        owner: "Current user"
      })),
      ...documents
    ],
    [uploadedDocuments]
  );

  const filteredDocuments = allDocuments.filter(
    (document) => selectedTour === "all" || document.tour === selectedTour
  );

  return (
    <div className="space-y-6">
      <AtaCarnetManager locale={locale} initialItems={initialAtaItems} />

      <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Centre d'import", "Upload center")}
          </p>
          <p className="mt-2 text-sm text-mist-300">
            {t(
              locale,
              "Ajoute les contrats, riders, factures, passeports et docs de route au workspace.",
              "Add contracts, riders, invoices, passports, and routing docs to the workspace."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedTour}
            onChange={(event) => setSelectedTour(event.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
          >
            <option value="all" className="bg-graphite-900">
              {t(locale, "Toutes les tournées", "All tours")}
            </option>
            <option value="Northbound Ruin 2026" className="bg-graphite-900">
              Northbound Ruin 2026
            </option>
          </select>
          <label className="cursor-pointer">
            <span className="sr-only">{t(locale, "Importer des fichiers", "Upload files")}</span>
            <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-coral-500 px-4 text-sm font-medium text-white">
              <Upload className="h-4 w-4" />
              {t(locale, "Importer des fichiers", "Upload files")}
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (!files.length) {
                  return;
                }
                addUploadedDocuments(
                  files.map((file, index) => ({
                    id: `${file.name}-${index}`,
                    name: file.name,
                    category: "Uploaded",
                    tour: "Northbound Ruin 2026"
                  }))
                );
              }}
            />
          </label>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {["Contracts", "Riders", "Invoices", "Passports", "Route Docs"].map(
          (category) => (
            <Card key={category}>
              <p className="text-lg font-medium text-mist-50">
                {translateDocumentCategory(locale, category)}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {allDocuments.filter((document) =>
                  document.category.toLowerCase().includes(category.toLowerCase())
                ).length || 0}{" "}
                {t(locale, "éléments dans le workspace", "items in workspace")}
              </p>
            </Card>
          )
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/8 bg-white/[0.03] text-mist-300">
              <tr>
                <th className="px-5 py-4 font-medium">{t(locale, "Document", "Document")}</th>
                <th className="px-5 py-4 font-medium">{t(locale, "Catégorie", "Category")}</th>
                <th className="px-5 py-4 font-medium">{t(locale, "Tournée", "Tour")}</th>
                <th className="px-5 py-4 font-medium">{t(locale, "Concert", "Show")}</th>
                <th className="px-5 py-4 font-medium">{t(locale, "Mis à jour", "Updated")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document) => (
                <tr key={document.id} className="border-b border-white/8">
                  <td className="px-5 py-4 text-mist-50">{document.name}</td>
                  <td className="px-5 py-4">
                    <Badge>{translateDocumentCategory(locale, document.category)}</Badge>
                  </td>
                  <td className="px-5 py-4 text-mist-200">{document.tour}</td>
                  <td className="px-5 py-4 text-mist-200">{document.show}</td>
                  <td className="px-5 py-4 text-mist-200">
                    {document.updatedAt === "Now"
                      ? t(locale, "Maintenant", "Now")
                      : document.updatedAt}{" "}
                    •{" "}
                    {document.owner === "Current user"
                      ? t(locale, "Utilisateur actuel", "Current user")
                      : document.owner}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Button variant="secondary">
        {t(locale, "Créer une vue dossier partageable", "Create shareable folder view")}
      </Button>
    </div>
  );
}
