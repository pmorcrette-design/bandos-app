"use client";

import { useMemo, useState } from "react";
import { Archive, ImagePlus, Layers3, Plus, Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { t, type Locale } from "@/lib/i18n";
import { useBandosUIStore } from "@/store/ui-store";

const textareaClassName =
  "min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition placeholder:text-mist-300/70 focus:border-coral-500/50 focus:bg-white/[0.07]";

const productTypeOptions = [
  "t-shirt",
  "hoodie",
  "longsleeve",
  "patch",
  "poster",
  "vinyl",
  "cd",
  "other"
] as const;

const collectionOptions = [
  "tour",
  "album",
  "single",
  "special drop",
  "evergreen"
] as const;

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function parseTagInput(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function MerchDesignsManager({ locale }: { locale: Locale }) {
  const merchDesigns = useBandosUIStore((state) => state.merchDesigns);
  const merchCatalog = useBandosUIStore((state) => state.merchCatalog);
  const addMerchDesign = useBandosUIStore((state) => state.addMerchDesign);
  const updateMerchDesign = useBandosUIStore((state) => state.updateMerchDesign);
  const archiveMerchDesign = useBandosUIStore((state) => state.archiveMerchDesign);
  const [newDesign, setNewDesign] = useState({
    name: "",
    description: "",
    imageUrl: "",
    collection: "tour" as const,
    status: "draft" as const,
    tags: "logo, tour design",
    productTypes: ["t-shirt"] as string[]
  });

  const activeDesigns = useMemo(
    () => merchDesigns.filter((design) => design.status !== "archived"),
    [merchDesigns]
  );

  function createDesign() {
    if (!newDesign.name.trim()) {
      return;
    }

    addMerchDesign({
      name: newDesign.name.trim(),
      description: newDesign.description.trim(),
      imageUrl: newDesign.imageUrl.trim() || null,
      collection: newDesign.collection,
      status: newDesign.status,
      tags: parseTagInput(newDesign.tags),
      productTypes: newDesign.productTypes as Array<
        | "t-shirt"
        | "hoodie"
        | "longsleeve"
        | "patch"
        | "poster"
        | "vinyl"
        | "cd"
        | "other"
      >
    });

    setNewDesign({
      name: "",
      description: "",
      imageUrl: "",
      collection: "tour",
      status: "draft",
      tags: "logo, tour design",
      productTypes: ["t-shirt"]
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Layers3 className="h-5 w-5 text-coral-300" />
              </div>
              <div>
                <p className="text-lg font-medium text-mist-50">
                  {t(locale, "Merch Designs", "Merch Designs")}
                </p>
                <p className="text-sm text-mist-300">
                  {t(
                    locale,
                    "Centralise les visuels, les collections et les produits liés pour piloter les ventes par design.",
                    "Centralize visuals, collections, and linked products so sales can be tracked per design."
                  )}
                </p>
              </div>
            </div>
          </div>
          <Badge tone="accent">
            {activeDesigns.length} {t(locale, "design(s) actif(s)", "active design(s)")}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-3 rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="text-sm font-medium text-mist-50">
              {t(locale, "Ajouter un design", "Add a design")}
            </p>
            <Input
              value={newDesign.name}
              onChange={(event) =>
                setNewDesign((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={t(locale, "Nom du design", "Design name")}
            />
            <textarea
              value={newDesign.description}
              onChange={(event) =>
                setNewDesign((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
              className={textareaClassName}
              placeholder={t(locale, "Description rapide", "Short description")}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={newDesign.collection}
                onChange={(event) =>
                  setNewDesign((current) => ({
                    ...current,
                    collection: event.target.value as typeof newDesign.collection
                  }))
                }
              >
                {collectionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <Select
                value={newDesign.status}
                onChange={(event) =>
                  setNewDesign((current) => ({
                    ...current,
                    status: event.target.value as typeof newDesign.status
                  }))
                }
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </Select>
            </div>
            <Input
              value={newDesign.tags}
              onChange={(event) =>
                setNewDesign((current) => ({ ...current, tags: event.target.value }))
              }
              placeholder={t(
                locale,
                "Tags séparés par des virgules",
                "Comma-separated tags"
              )}
            />
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Produits associés", "Linked product types")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {productTypeOptions.map((option) => {
                  const selected = newDesign.productTypes.includes(option);

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setNewDesign((current) => ({
                          ...current,
                          productTypes: selected
                            ? current.productTypes.filter((entry) => entry !== option)
                            : [...current.productTypes, option]
                        }))
                      }
                      className={`rounded-full border px-3 py-2 text-xs transition ${
                        selected
                          ? "border-coral-500/30 bg-coral-500/10 text-coral-200"
                          : "border-white/10 bg-white/5 text-mist-200 hover:bg-white/10"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <Input
                value={newDesign.imageUrl}
                onChange={(event) =>
                  setNewDesign((current) => ({
                    ...current,
                    imageUrl: event.target.value
                  }))
                }
                placeholder={t(locale, "URL image", "Image URL")}
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-100 transition hover:bg-white/10">
                <ImagePlus className="h-4 w-4" />
                {t(locale, "Uploader un visuel", "Upload artwork")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    const imageUrl = await readFileAsDataUrl(file);
                    setNewDesign((current) => ({
                      ...current,
                      imageUrl
                    }));
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0f1012]">
                {newDesign.imageUrl ? (
                  <img
                    src={newDesign.imageUrl}
                    alt={newDesign.name || "Merch design"}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-end bg-[radial-gradient(circle_at_top,_rgba(239,90,76,0.16),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
                    <p className="max-w-[14rem] text-sm uppercase tracking-[0.2em] text-white/45">
                      {t(
                        locale,
                        "Visuel merch pour la galerie",
                        "Merch artwork for the gallery"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <Button type="button" onClick={createDesign}>
              <Plus className="h-4 w-4" />
              {t(locale, "Créer le design", "Create design")}
            </Button>
          </div>

          <div className="space-y-4">
            {activeDesigns.length ? (
              activeDesigns.map((design) => {
                const linkedProducts = merchCatalog.filter(
                  (product) => product.designId === design.id
                );

                return (
                  <div
                    key={design.id}
                    className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0f1012]">
                        {design.imageUrl ? (
                          <img
                            src={design.imageUrl}
                            alt={design.name}
                            className="h-full min-h-[180px] w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-[180px] items-end bg-[radial-gradient(circle_at_top,_rgba(239,90,76,0.16),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
                            <p className="text-sm uppercase tracking-[0.2em] text-white/45">
                              {design.collection}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xl font-semibold text-mist-50">
                                {design.name}
                              </p>
                              <Badge tone={design.status === "active" ? "success" : "neutral"}>
                                {design.status}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-mist-300">
                              {linkedProducts.length}{" "}
                              {t(locale, "produit(s) lié(s)", "linked product(s)")}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => archiveMerchDesign(design.id)}
                          >
                            <Archive className="h-4 w-4" />
                            {t(locale, "Archiver", "Archive")}
                          </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            defaultValue={design.name}
                            onBlur={(event) =>
                              updateMerchDesign(design.id, { name: event.target.value })
                            }
                          />
                          <Select
                            defaultValue={design.collection}
                            onBlur={(event) =>
                              updateMerchDesign(design.id, {
                                collection: event.currentTarget.value as typeof design.collection
                              })
                            }
                          >
                            {collectionOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <textarea
                          defaultValue={design.description}
                          onBlur={(event) =>
                            updateMerchDesign(design.id, {
                              description: event.target.value
                            })
                          }
                          className={textareaClassName}
                        />

                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            defaultValue={design.imageUrl ?? ""}
                            onBlur={(event) =>
                              updateMerchDesign(design.id, {
                                imageUrl: event.target.value.trim() || null
                              })
                            }
                            placeholder={t(locale, "URL visuel", "Artwork URL")}
                          />
                          <Input
                            defaultValue={design.tags.join(", ")}
                            onBlur={(event) =>
                              updateMerchDesign(design.id, {
                                tags: parseTagInput(event.target.value)
                              })
                            }
                            placeholder="brutal, logo, limited edition"
                          />
                        </div>

                        <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                          <div className="flex items-center gap-2 text-sm text-mist-200">
                            <Tags className="h-4 w-4 text-coral-300" />
                            {t(locale, "Produits liés", "Linked products")}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {linkedProducts.length ? (
                              linkedProducts.map((product) => (
                                <Badge key={product.id}>
                                  {product.name} • {product.productType}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-sm text-mist-300">
                                {t(
                                  locale,
                                  "Aucun produit BandOS n'est encore lié à ce design.",
                                  "No BandOS product is linked to this design yet."
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title={t(locale, "Aucun design merch", "No merch design yet")}
                body={t(
                  locale,
                  "Crée ton premier design pour relier ensuite les t-shirts, hoodies, patches ou posters.",
                  "Create your first design, then link tees, hoodies, patches, or posters to it."
                )}
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
