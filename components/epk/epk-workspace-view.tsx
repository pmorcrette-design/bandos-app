"use client";

import { useMemo } from "react";
import {
  Download,
  ImagePlus,
  Link2,
  Plus,
  Trash2
} from "lucide-react";

import { PremiumEpkDocument } from "@/components/epk/premium-epk-document";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t, type Locale } from "@/lib/i18n";
import type {
  EpkMemberEntry,
  EpkPressQuoteEntry,
  EpkProfile,
  EpkReleaseEntry
} from "@/lib/workspace-data";
import { useBandosUIStore } from "@/store/ui-store";

const textareaClassName =
  "min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition placeholder:text-mist-300/70 focus:border-coral-500/50 focus:bg-white/[0.07]";

function buildRowId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

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

  const maxSide = 2200;
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
  return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.9);
}

function parseNullableInteger(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

function FieldLabel({ children }: { children: string }) {
  return <span className="text-sm text-mist-200">{children}</span>;
}

function ImageField({
  locale,
  label,
  value,
  onChange,
  onUpload,
  onRemove
}: {
  locale: Locale;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value.trim() || null)}
        placeholder={t(locale, "URL image ou upload", "Image URL or upload")}
      />
      <div className="flex flex-wrap gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-100 transition hover:bg-white/10">
          <ImagePlus className="h-4 w-4" />
          {t(locale, "Uploader", "Upload")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              await onUpload(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {value ? (
          <Button type="button" variant="secondary" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
            {t(locale, "Retirer", "Remove")}
          </Button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-[20px] border border-white/8 bg-[#0f1012]">
        {value ? (
          <img
            src={value}
            alt={label}
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="flex h-44 items-end bg-[radial-gradient(circle_at_top,_rgba(239,90,76,0.16),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
            <p className="max-w-[14rem] text-sm uppercase tracking-[0.2em] text-white/45">
              {t(
                locale,
                "Upload pour remplir le presskit final",
                "Upload to complete the final press kit"
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function EpkWorkspaceView({
  locale,
  workspaceName,
  workspaceLogo
}: {
  locale: Locale;
  workspaceName: string;
  workspaceLogo: string;
}) {
  const epkProfile = useBandosUIStore((state) => state.epkProfile);
  const updateEpkProfile = useBandosUIStore((state) => state.updateEpkProfile);

  const completion = useMemo(() => {
    const checks = [
      epkProfile.bandName.trim(),
      epkProfile.genre.trim(),
      epkProfile.bio.trim(),
      epkProfile.members.length > 0,
      epkProfile.heroImageUrl,
      epkProfile.liveImageUrl,
      epkProfile.website.trim() || epkProfile.contactEmail.trim() || epkProfile.contactPhone.trim()
    ];

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100
    );
  }, [epkProfile]);

  function updateMember(id: string, patch: Partial<EpkMemberEntry>) {
    updateEpkProfile({
      members: epkProfile.members.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      )
    });
  }

  function updateRelease(id: string, patch: Partial<EpkReleaseEntry>) {
    updateEpkProfile({
      releases: epkProfile.releases.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      )
    });
  }

  function updateQuote(id: string, patch: Partial<EpkPressQuoteEntry>) {
    updateEpkProfile({
      pressQuotes: epkProfile.pressQuotes.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      )
    });
  }

  async function uploadImageField(
    key:
      | "logoUrl"
      | "heroImageUrl"
      | "liveImageUrl"
      | "detailImageUrl"
      | "closingImageUrl"
      | "supportImageUrl",
    file: File
  ) {
    const dataUrl = await readFileAsDataUrl(file);
    updateEpkProfile({
      [key]: dataUrl
    } as Partial<EpkProfile>);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="EPK"
        title={t(
          locale,
          "Builder EPK et press kit téléchargeable",
          "Downloadable EPK and press kit builder"
        )}
        description={t(
          locale,
          "Renseigne les infos du groupe, les stats, les visuels et les reviews. Le rendu premium à droite sert aussi de base pour le PDF exporté.",
          "Fill in your band details, stats, visuals, and reviews. The premium preview on the right is also the base for the exported PDF."
        )}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.open("/epk/print", "_blank", "noopener,noreferrer")}
            >
              <Link2 className="h-4 w-4" />
              {t(locale, "Version print", "Print version")}
            </Button>
            <Button
              type="button"
              onClick={() =>
                window.open("/epk/print?autoprint=1", "_blank", "noopener,noreferrer")
              }
            >
              <Download className="h-4 w-4" />
              {t(locale, "Télécharger le PDF", "Download PDF")}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm uppercase tracking-[0.22em] text-mist-300">
            {t(locale, "Progression", "Completion")}
          </p>
          <p className="mt-3 text-4xl font-semibold text-mist-50">{completion}%</p>
          <p className="mt-2 text-sm leading-7 text-mist-300">
            {t(
              locale,
              "Plus tu remplis les visuels, le line-up et la bio, plus le PDF ressemble à un vrai presskit exploitable.",
              "The more you fill visuals, lineup, and bio, the more the PDF looks like a real press kit."
            )}
          </p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.22em] text-mist-300">
            {t(locale, "Export", "Export")}
          </p>
          <p className="mt-3 text-xl font-medium text-mist-50">
            {t(locale, "PDF multi-pages propre", "Clean multi-page PDF")}
          </p>
          <p className="mt-2 text-sm leading-7 text-mist-300">
            {t(
              locale,
              "Le bouton PDF ouvre la version print dédiée. Tu peux ensuite l'enregistrer en PDF depuis le navigateur.",
              "The PDF button opens a dedicated print view. Then save it as PDF from the browser."
            )}
          </p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.22em] text-mist-300">
            {t(locale, "Workspace", "Workspace")}
          </p>
          <p className="mt-3 text-xl font-medium text-mist-50">{workspaceName}</p>
          <p className="mt-2 text-sm leading-7 text-mist-300">
            {t(
              locale,
              "Le logo et le nom du workspace servent de fallback si tu ne renseignes pas encore le branding dans l’EPK.",
              "The workspace logo and name act as fallbacks until you fill the EPK branding."
            )}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.03fr_0.97fr]">
        <div className="space-y-4">
          <Card className="space-y-5">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Identité & contact", "Identity & contact")}
              </p>
              <p className="mt-2 text-sm leading-7 text-mist-300">
                {t(
                  locale,
                  "Les infos de base qui construisent la cover et le footer du presskit.",
                  "Core information that drives the cover and footer of the press kit."
                )}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Nom du groupe", "Band name")}</FieldLabel>
                <Input
                  value={epkProfile.bandName}
                  onChange={(event) => updateEpkProfile({ bandName: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Genre", "Genre")}</FieldLabel>
                <Input
                  value={epkProfile.genre}
                  onChange={(event) => updateEpkProfile({ genre: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Origine", "Origin")}</FieldLabel>
                <Input
                  value={epkProfile.origin}
                  onChange={(event) => updateEpkProfile({ origin: event.target.value })}
                  placeholder={t(locale, "Paris, France", "Paris, France")}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Année de création", "Founded year")}</FieldLabel>
                <Input
                  value={epkProfile.foundedYear}
                  onChange={(event) =>
                    updateEpkProfile({ foundedYear: event.target.value })
                  }
                  placeholder="2011"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Téléphone", "Phone")}</FieldLabel>
                <Input
                  value={epkProfile.contactPhone}
                  onChange={(event) =>
                    updateEpkProfile({ contactPhone: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Email", "Email")}</FieldLabel>
                <Input
                  value={epkProfile.contactEmail}
                  onChange={(event) =>
                    updateEpkProfile({ contactEmail: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <FieldLabel>{t(locale, "Site web", "Website")}</FieldLabel>
                <Input
                  value={epkProfile.website}
                  onChange={(event) => updateEpkProfile({ website: event.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Stats & liens", "Stats & links")}
              </p>
              <p className="mt-2 text-sm leading-7 text-mist-300">
                {t(
                  locale,
                  "Ces chiffres alimentent directement le bloc stats de la cover et les infos de fin d’EPK.",
                  "These figures directly feed the cover metrics and the end-of-EPK info block."
                )}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Instagram</FieldLabel>
                <Input
                  value={epkProfile.instagramUrl}
                  onChange={(event) =>
                    updateEpkProfile({ instagramUrl: event.target.value })
                  }
                  placeholder="instagram.com/..."
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Followers Instagram", "Instagram followers")}</FieldLabel>
                <Input
                  type="number"
                  value={epkProfile.instagramFollowers ?? ""}
                  onChange={(event) =>
                    updateEpkProfile({
                      instagramFollowers: parseNullableInteger(event.target.value)
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Facebook</FieldLabel>
                <Input
                  value={epkProfile.facebookUrl}
                  onChange={(event) => updateEpkProfile({ facebookUrl: event.target.value })}
                  placeholder="facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Followers Facebook", "Facebook followers")}</FieldLabel>
                <Input
                  type="number"
                  value={epkProfile.facebookFollowers ?? ""}
                  onChange={(event) =>
                    updateEpkProfile({
                      facebookFollowers: parseNullableInteger(event.target.value)
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Spotify</FieldLabel>
                <Input
                  value={epkProfile.spotifyUrl}
                  onChange={(event) => updateEpkProfile({ spotifyUrl: event.target.value })}
                  placeholder="open.spotify.com/..."
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Auditeurs Spotify", "Spotify listeners")}</FieldLabel>
                <Input
                  type="number"
                  value={epkProfile.spotifyMonthlyListeners ?? ""}
                  onChange={(event) =>
                    updateEpkProfile({
                      spotifyMonthlyListeners: parseNullableInteger(event.target.value)
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>YouTube</FieldLabel>
                <Input
                  value={epkProfile.youtubeUrl}
                  onChange={(event) => updateEpkProfile({ youtubeUrl: event.target.value })}
                  placeholder="youtube.com/..."
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Vues YouTube", "YouTube views")}</FieldLabel>
                <Input
                  type="number"
                  value={epkProfile.youtubeViews ?? ""}
                  onChange={(event) =>
                    updateEpkProfile({
                      youtubeViews: parseNullableInteger(event.target.value)
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>TikTok</FieldLabel>
                <Input
                  value={epkProfile.tiktokUrl}
                  onChange={(event) => updateEpkProfile({ tiktokUrl: event.target.value })}
                  placeholder="tiktok.com/@..."
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Streams globaux", "Total streams")}</FieldLabel>
                <Input
                  type="number"
                  value={epkProfile.streamCount ?? ""}
                  onChange={(event) =>
                    updateEpkProfile({
                      streamCount: parseNullableInteger(event.target.value)
                    })
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Bio & line-up", "Bio & lineup")}
              </p>
            </div>
            <div className="space-y-2">
              <FieldLabel>{t(locale, "Bio du groupe", "Band bio")}</FieldLabel>
              <textarea
                className={textareaClassName}
                value={epkProfile.bio}
                onChange={(event) => updateEpkProfile({ bio: event.target.value })}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t(locale, "Membres", "Members")}</FieldLabel>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    updateEpkProfile({
                      members: [
                        ...epkProfile.members,
                        { id: buildRowId("epk-member"), name: "", role: "" }
                      ]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t(locale, "Ajouter un membre", "Add member")}
                </Button>
              </div>
              <div className="space-y-3">
                {epkProfile.members.map((member) => (
                  <div
                    key={member.id}
                    className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[1fr_1fr_auto]"
                  >
                    <Input
                      value={member.name}
                      onChange={(event) => updateMember(member.id, { name: event.target.value })}
                      placeholder={t(locale, "Nom", "Name")}
                    />
                    <Input
                      value={member.role}
                      onChange={(event) => updateMember(member.id, { role: event.target.value })}
                      placeholder={t(locale, "Rôle", "Role")}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        updateEpkProfile({
                          members: epkProfile.members.filter((entry) => entry.id !== member.id)
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {epkProfile.members.length === 0 ? (
                  <p className="text-sm text-mist-300">
                    {t(locale, "Ajoute le line-up officiel du groupe.", "Add the official band lineup.")}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Parcours live & discographie", "Live history & releases")}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t(locale, "Shared stage with", "Shared stage with")}</FieldLabel>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    updateEpkProfile({
                      sharedStageWith: [...epkProfile.sharedStageWith, ""]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t(locale, "Ajouter un nom", "Add artist")}
                </Button>
              </div>
              <div className="space-y-3">
                {epkProfile.sharedStageWith.map((artist, index) => (
                  <div
                    key={`${artist}-${index}`}
                    className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[1fr_auto]"
                  >
                    <Input
                      value={artist}
                      onChange={(event) =>
                        updateEpkProfile({
                          sharedStageWith: epkProfile.sharedStageWith.map((entry, entryIndex) =>
                            entryIndex === index ? event.target.value : entry
                          )
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        updateEpkProfile({
                          sharedStageWith: epkProfile.sharedStageWith.filter(
                            (_, entryIndex) => entryIndex !== index
                          )
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t(locale, "Releases", "Releases")}</FieldLabel>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    updateEpkProfile({
                      releases: [
                        ...epkProfile.releases,
                        {
                          id: buildRowId("epk-release"),
                          year: "",
                          title: "",
                          format: ""
                        }
                      ]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t(locale, "Ajouter une release", "Add release")}
                </Button>
              </div>
              <div className="space-y-3">
                {epkProfile.releases.map((release) => (
                  <div
                    key={release.id}
                    className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[110px_1fr_160px_auto]"
                  >
                    <Input
                      value={release.year}
                      onChange={(event) => updateRelease(release.id, { year: event.target.value })}
                      placeholder="2024"
                    />
                    <Input
                      value={release.title}
                      onChange={(event) =>
                        updateRelease(release.id, { title: event.target.value })
                      }
                      placeholder={t(locale, "Titre", "Title")}
                    />
                    <Input
                      value={release.format}
                      onChange={(event) =>
                        updateRelease(release.id, { format: event.target.value })
                      }
                      placeholder="EP / Album / Demo"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        updateEpkProfile({
                          releases: epkProfile.releases.filter((entry) => entry.id !== release.id)
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Reviews, assets & support", "Reviews, assets & support")}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Titre support", "Support title")}</FieldLabel>
                <Input
                  value={epkProfile.supportTitle}
                  onChange={(event) =>
                    updateEpkProfile({ supportTitle: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Sous-texte support", "Support subtitle")}</FieldLabel>
                <Input
                  value={epkProfile.supportSubtitle}
                  onChange={(event) =>
                    updateEpkProfile({ supportSubtitle: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t(locale, "Press quotes", "Press quotes")}</FieldLabel>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    updateEpkProfile({
                      pressQuotes: [
                        ...epkProfile.pressQuotes,
                        {
                          id: buildRowId("epk-quote"),
                          source: "",
                          quote: ""
                        }
                      ]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t(locale, "Ajouter une quote", "Add quote")}
                </Button>
              </div>
              <div className="space-y-3">
                {epkProfile.pressQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex gap-3">
                      <Input
                        value={quote.source}
                        onChange={(event) =>
                          updateQuote(quote.id, { source: event.target.value })
                        }
                        placeholder={t(locale, "Source média", "Media source")}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          updateEpkProfile({
                            pressQuotes: epkProfile.pressQuotes.filter(
                              (entry) => entry.id !== quote.id
                            )
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <textarea
                      className={textareaClassName}
                      value={quote.quote}
                      onChange={(event) =>
                        updateQuote(quote.id, { quote: event.target.value })
                      }
                      placeholder={t(locale, "Citation / review", "Quote / review")}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t(locale, "Assets listés", "Listed assets")}</FieldLabel>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    updateEpkProfile({
                      assetList: [...epkProfile.assetList, ""]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t(locale, "Ajouter un asset", "Add asset")}
                </Button>
              </div>
              <div className="space-y-3">
                {epkProfile.assetList.map((asset, index) => (
                  <div
                    key={`${asset}-${index}`}
                    className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[1fr_auto]"
                  >
                    <Input
                      value={asset}
                      onChange={(event) =>
                        updateEpkProfile({
                          assetList: epkProfile.assetList.map((entry, entryIndex) =>
                            entryIndex === index ? event.target.value : entry
                          )
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        updateEpkProfile({
                          assetList: epkProfile.assetList.filter(
                            (_, entryIndex) => entryIndex !== index
                          )
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Visuels du press kit", "Press kit visuals")}
              </p>
              <p className="mt-2 text-sm leading-7 text-mist-300">
                {t(
                  locale,
                  "Tu peux soit uploader des images, soit coller des URLs directes. Le rendu final s’actualise en live.",
                  "You can upload images or paste direct URLs. The final render updates live."
                )}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ImageField
                locale={locale}
                label={t(locale, "Logo groupe", "Band logo")}
                value={epkProfile.logoUrl}
                onChange={(value) => updateEpkProfile({ logoUrl: value })}
                onUpload={(file) => uploadImageField("logoUrl", file)}
                onRemove={() => updateEpkProfile({ logoUrl: null })}
              />
              <ImageField
                locale={locale}
                label={t(locale, "Photo cover", "Cover photo")}
                value={epkProfile.heroImageUrl}
                onChange={(value) => updateEpkProfile({ heroImageUrl: value })}
                onUpload={(file) => uploadImageField("heroImageUrl", file)}
                onRemove={() => updateEpkProfile({ heroImageUrl: null })}
              />
              <ImageField
                locale={locale}
                label={t(locale, "Photo live 1", "Live photo 1")}
                value={epkProfile.liveImageUrl}
                onChange={(value) => updateEpkProfile({ liveImageUrl: value })}
                onUpload={(file) => uploadImageField("liveImageUrl", file)}
                onRemove={() => updateEpkProfile({ liveImageUrl: null })}
              />
              <ImageField
                locale={locale}
                label={t(locale, "Photo live 2", "Live photo 2")}
                value={epkProfile.detailImageUrl}
                onChange={(value) => updateEpkProfile({ detailImageUrl: value })}
                onUpload={(file) => uploadImageField("detailImageUrl", file)}
                onRemove={() => updateEpkProfile({ detailImageUrl: null })}
              />
              <ImageField
                locale={locale}
                label={t(locale, "Photo finale pleine page", "Final full-page image")}
                value={epkProfile.closingImageUrl}
                onChange={(value) => updateEpkProfile({ closingImageUrl: value })}
                onUpload={(file) => uploadImageField("closingImageUrl", file)}
                onRemove={() => updateEpkProfile({ closingImageUrl: null })}
              />
              <ImageField
                locale={locale}
                label={t(locale, "Visuel support / partenaire", "Support / partner visual")}
                value={epkProfile.supportImageUrl}
                onChange={(value) => updateEpkProfile({ supportImageUrl: value })}
                onUpload={(file) => uploadImageField("supportImageUrl", file)}
                onRemove={() => updateEpkProfile({ supportImageUrl: null })}
              />
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-medium text-mist-50">
                  {t(locale, "Aperçu premium", "Premium preview")}
                </p>
                <p className="mt-1 text-sm text-mist-300">
                  {t(
                    locale,
                    "C’est cette composition qui part en version print / PDF.",
                    "This exact composition is what goes to print / PDF."
                  )}
                </p>
              </div>
            </div>
            <div className="max-h-[78vh] overflow-auto rounded-[28px] border border-white/8 bg-[#090a0c] p-3">
              <PremiumEpkDocument
                locale={locale}
                profile={epkProfile}
                workspaceName={workspaceName}
                workspaceLogo={workspaceLogo}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
