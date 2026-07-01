"use client";

import { useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import { Eye, IdCard, Trash2, Upload } from "lucide-react";

import { AtaCarnetManager } from "@/components/documents/ata-carnet-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  t,
  translateDocumentCategory,
  type Locale
} from "@/lib/i18n";
import { documents } from "@/lib/mock-data";
import { useBandosUIStore } from "@/store/ui-store";

const uploadableCategories = [
  "Contracts",
  "Riders",
  "Invoices",
  "Route Docs",
  "Travel",
  "Uploaded"
] as const;

const documentSummaryCategories = [
  "Contracts",
  "Riders",
  "Invoices",
  "Passports",
  "Route Docs",
  "Travel"
] as const;

async function readFileAsDataUrl(file: File) {
  const baseUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  if (!file.type.startsWith("image/")) {
    return baseUrl;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("image-load-failed"));
    nextImage.src = baseUrl;
  });

  const maxSide = 1600;
  const scale = Math.min(1, maxSide / image.width, maxSide / image.height);

  if (scale >= 1) {
    return baseUrl;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const context = canvas.getContext("2d");

  if (!context) {
    return baseUrl;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (file.type === "image/png") {
    return canvas.toDataURL("image/png");
  }

  return canvas.toDataURL("image/jpeg", 0.86);
}

function buildUploadedDocumentId(file: File) {
  return `uploaded-${file.name}-${file.size}-${file.lastModified}-${Date.now()}`;
}

function getDocumentPreviewUrl(document: unknown) {
  if (
    !document ||
    typeof document !== "object" ||
    !("previewUrl" in document) ||
    typeof document.previewUrl !== "string" ||
    !document.previewUrl
  ) {
    return null;
  }

  return document.previewUrl;
}

export function DocumentsView({
  locale,
  initialAtaItems,
  includeSeededDocuments
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
  includeSeededDocuments: boolean;
}) {
  const [selectedTour, setSelectedTour] = useState("all");
  const [uploadTour, setUploadTour] = useState("-");
  const [passportTour, setPassportTour] = useState("-");
  const [uploadCategory, setUploadCategory] = useState<(typeof uploadableCategories)[number]>(
    "Uploaded"
  );
  const [passportHolder, setPassportHolder] = useState("");
  const uploadedDocuments = useBandosUIStore((state) => state.uploadedDocuments);
  const importedShowFolders = useBandosUIStore((state) => state.importedShowFolders);
  const addUploadedDocuments = useBandosUIStore(
    (state) => state.addUploadedDocuments
  );
  const deleteUploadedDocument = useBandosUIStore(
    (state) => state.deleteUploadedDocument
  );

  const seededDocuments = useMemo(
    () => (includeSeededDocuments ? documents : []),
    [includeSeededDocuments]
  );

  const allDocuments = useMemo(
    () => [...uploadedDocuments, ...seededDocuments],
    [seededDocuments, uploadedDocuments]
  );

  const tourOptions = useMemo(() => {
    const tours = new Set<string>();

    seededDocuments.forEach((entry) => {
      if (entry.tour && entry.tour !== "-") {
        tours.add(entry.tour);
      }
    });
    uploadedDocuments.forEach((entry) => {
      if (entry.tour && entry.tour !== "-") {
        tours.add(entry.tour);
      }
    });
    importedShowFolders.forEach((entry) => {
      if (entry.tourName) {
        tours.add(entry.tourName);
      }
    });
    return Array.from(tours);
  }, [importedShowFolders, seededDocuments, uploadedDocuments]);

  useEffect(() => {
    const nextDefaultTour = tourOptions[0] ?? "-";

    if (uploadTour === "-" || !tourOptions.includes(uploadTour)) {
      setUploadTour(nextDefaultTour);
    }

    if (passportTour === "-" || !tourOptions.includes(passportTour)) {
      setPassportTour(nextDefaultTour);
    }
  }, [passportTour, tourOptions, uploadTour]);

  const filteredDocuments = allDocuments.filter(
    (document) => selectedTour === "all" || document.tour === selectedTour
  );

  const uploadedDocumentIds = useMemo(
    () => new Set(uploadedDocuments.map((entry) => entry.id)),
    [uploadedDocuments]
  );

  const passportUploads = uploadedDocuments.filter(
    (entry) => entry.category === "Passports"
  );

  async function handleGenericUpload(files: File[]) {
    if (!files.length) {
      return;
    }

    const nextEntries = await Promise.all(
      files.map(async (file) => ({
        id: buildUploadedDocumentId(file),
        name: file.name,
        category: uploadCategory,
        tour: uploadTour,
        show: "-",
        showId: null,
        updatedAt: new Date().toISOString().slice(0, 10),
        owner: "Current user",
        previewUrl: file.type.startsWith("image/") ? await readFileAsDataUrl(file) : null,
        mimeType: file.type || null,
        subject: ""
      }))
    );

    addUploadedDocuments(nextEntries);
  }

  async function handlePassportUpload(files: File[]) {
    if (!files.length) {
      return;
    }

    const nextEntries = await Promise.all(
      files.map(async (file) => ({
        id: buildUploadedDocumentId(file),
        name: passportHolder.trim()
          ? `${passportHolder.trim()} - ${file.name}`
          : file.name,
        category: "Passports",
        tour: passportTour,
        show: "-",
        showId: null,
        updatedAt: new Date().toISOString().slice(0, 10),
        owner: "Current user",
        previewUrl: await readFileAsDataUrl(file),
        mimeType: file.type || "image/jpeg",
        subject: passportHolder.trim()
      }))
    );

    addUploadedDocuments(nextEntries);
    setPassportHolder("");
  }

  return (
    <div className="space-y-6">
      <AtaCarnetManager locale={locale} initialItems={initialAtaItems} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Centre d'import", "Upload center")}
            </p>
            <p className="mt-2 text-sm text-mist-300">
              {t(
                locale,
                "Ajoute les contrats, riders, factures et documents de route sans toucher aux éléments déjà stockés dans le workspace.",
                "Add contracts, riders, invoices, and route docs without touching the files already stored in the workspace."
              )}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-2 text-sm text-mist-300">
              <span>{t(locale, "Filtrer par tournée", "Filter by tour")}</span>
              <select
                value={selectedTour}
                onChange={(event) => setSelectedTour(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                <option value="all" className="bg-graphite-900">
                  {t(locale, "Toutes les tournées", "All tours")}
                </option>
                {tourOptions.map((tour) => (
                  <option key={tour} value={tour} className="bg-graphite-900">
                    {tour}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-mist-300">
              <span>{t(locale, "Tournée des fichiers", "Files tour")}</span>
              <select
                value={uploadTour}
                onChange={(event) => setUploadTour(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                {(tourOptions.length ? tourOptions : ["-"]).map((tour) => (
                  <option key={tour} value={tour} className="bg-graphite-900">
                    {tour}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-mist-300">
              <span>{t(locale, "Catégorie", "Category")}</span>
              <select
                value={uploadCategory}
                onChange={(event) =>
                  setUploadCategory(
                    event.target.value as (typeof uploadableCategories)[number]
                  )
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                {uploadableCategories.map((category) => (
                  <option key={category} value={category} className="bg-graphite-900">
                    {translateDocumentCategory(locale, category)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="cursor-pointer">
            <span className="sr-only">
              {t(locale, "Importer des fichiers", "Upload files")}
            </span>
            <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-coral-500 px-4 text-sm font-medium text-white">
              <Upload className="h-4 w-4" />
              {t(locale, "Importer des fichiers", "Upload files")}
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={async (event) => {
                const files = Array.from(event.target.files ?? []);
                await handleGenericUpload(files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-coral-400/20 bg-coral-500/10 p-3 text-coral-200">
              <IdCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Passeports", "Passports")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Charge ici les photos de passeport du crew. Elles restent dans le workspace et ne remplacent pas les autres documents.",
                  "Upload the crew passport photos here. They stay in the workspace and do not replace your other documents."
                )}
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm text-mist-300">
              <span>{t(locale, "Nom / titulaire", "Name / holder")}</span>
              <Input
                value={passportHolder}
                onChange={(event) => setPassportHolder(event.target.value)}
                placeholder={t(locale, "Ex. Alex Mercer", "e.g. Alex Mercer")}
              />
            </label>
            <label className="space-y-2 text-sm text-mist-300">
              <span>{t(locale, "Tournée liée", "Linked tour")}</span>
              <select
                value={passportTour}
                onChange={(event) => setPassportTour(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
              >
                {(tourOptions.length ? tourOptions : ["-"]).map((tour) => (
                  <option key={tour} value={tour} className="bg-graphite-900">
                    {tour}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="cursor-pointer">
              <span className="sr-only">
                {t(locale, "Importer les photos de passeport", "Upload passport photos")}
              </span>
              <span className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-mist-50 transition hover:bg-white/10">
                <Upload className="h-4 w-4" />
                {t(locale, "Importer les photos", "Upload photos")}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (event) => {
                  const files = Array.from(event.target.files ?? []);
                  await handlePassportUpload(files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p className="text-sm text-mist-300">
              {passportUploads.length}{" "}
              {t(locale, "photo(s) déjà dans le workspace", "photo(s) already in the workspace")}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documentSummaryCategories.map((category) => (
          <Card key={category}>
            <p className="text-lg font-medium text-mist-50">
              {translateDocumentCategory(locale, category)}
            </p>
            <p className="mt-2 text-sm text-mist-300">
              {
                allDocuments.filter((document) => document.category === category).length
              }{" "}
              {t(locale, "éléments dans le workspace", "items in workspace")}
            </p>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Photos de passeports", "Passport photos")}
            </p>
            <p className="mt-2 text-sm text-mist-300">
              {t(
                locale,
                "Vue rapide des passeports uploadés pour contrôler le crew avant frontière.",
                "Quick passport view to verify the crew before border crossings."
              )}
            </p>
          </div>
          <Badge>{passportUploads.length}</Badge>
        </div>

        {!passportUploads.length ? (
          <EmptyState
            title={t(locale, "Aucune photo de passeport", "No passport photo yet")}
            body={t(
              locale,
              "Importe les photos ici, elles resteront liées au workspace et à la tournée sélectionnée.",
              "Upload photos here and they will remain linked to the workspace and selected tour."
            )}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {passportUploads.map((document) => {
              const previewUrl = getDocumentPreviewUrl(document);

              return (
                <div
                  key={document.id}
                  className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03]"
                >
                  {previewUrl ? (
                    <NextImage
                      src={previewUrl}
                      alt={document.subject || document.name}
                      width={960}
                      height={640}
                      unoptimized
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-white/[0.03] text-sm text-mist-300">
                      {t(locale, "Aperçu indisponible", "Preview unavailable")}
                    </div>
                  )}
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-sm font-medium text-mist-50">
                        {document.subject || document.name}
                      </p>
                      <p className="mt-1 text-xs text-mist-300">{document.tour}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {previewUrl ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-mist-50 transition hover:bg-white/10"
                        >
                          <Eye className="h-4 w-4" />
                          {t(locale, "Voir", "Open")}
                        </a>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => deleteUploadedDocument(document.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t(locale, "Supprimer", "Delete")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
                <th className="px-5 py-4 font-medium">{t(locale, "Action", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document) => {
                const previewUrl = getDocumentPreviewUrl(document);

                return (
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
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {previewUrl ? (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-mist-50 transition hover:bg-white/10"
                          >
                            <Eye className="h-4 w-4" />
                            {t(locale, "Voir", "Open")}
                          </a>
                        ) : null}
                        {uploadedDocumentIds.has(document.id) ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => deleteUploadedDocument(document.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t(locale, "Supprimer", "Delete")}
                          </Button>
                        ) : (
                          <span className="text-xs text-mist-400">
                            {t(locale, "Document de base", "Seeded document")}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
