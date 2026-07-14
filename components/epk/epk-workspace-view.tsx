"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  Grid2x2,
  ImagePlus,
  LayoutTemplate,
  Lock,
  Monitor,
  Plus,
  Redo2,
  Search,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  Unlock
} from "lucide-react";

import {
  createBlankEpkBuilderPage,
  createEpkBuilderBlock,
  createPublishedEpkSlug,
  epkBuilderBlockCatalog,
  normalizeEpkBuilder,
  type EpkBuilderBlock,
  type EpkBuilderBlockCatalogEntry,
  type EpkBuilderPage,
  type EpkBuilderState
} from "@/lib/epk-builder";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  EpkMemberEntry,
  EpkPressQuoteEntry,
  EpkProfile,
  EpkReleaseEntry
} from "@/lib/workspace-data";
import { useBandosUIStore } from "@/store/ui-store";
import { EpkBuilderRenderer } from "@/components/epk/epk-builder-renderer";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const textareaClassName =
  "min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-50 outline-none transition placeholder:text-mist-300/70 focus:border-coral-500/50 focus:bg-white/[0.07]";

const categoryOrder: Array<EpkBuilderBlockCatalogEntry["category"]> = [
  "Structure",
  "Texte",
  "Media",
  "Live",
  "Contact"
];

const canvasDeviceWidths = {
  desktop: 1320,
  tablet: 900,
  mobile: 430
} as const;

function clampZoom(value: number) {
  return Math.min(1.4, Math.max(0.35, Number(value.toFixed(2))));
}

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

function parsePercent(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0.42;
  }

  return Math.min(0.96, Math.max(0, parsed / 100));
}

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs uppercase tracking-[0.22em] text-mist-300">{children}</span>;
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const safeValue = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#f5f2ee";

  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={safeValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-14 cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-1"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="text-base font-semibold text-mist-50">{title}</p>
        {description ? <p className="mt-1 text-sm leading-7 text-mist-300">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
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
    </div>
  );
}

function ensureUniquePageSlug(
  pages: EpkBuilderPage[],
  requestedSlug: string,
  currentPageId?: string
) {
  const normalizedBase = createPublishedEpkSlug(requestedSlug);
  const blocked = new Set(
    pages.filter((page) => page.id !== currentPageId).map((page) => page.slug)
  );

  if (!blocked.has(normalizedBase)) {
    return normalizedBase;
  }

  let suffix = 2;
  let candidate = `${normalizedBase}-${suffix}`;

  while (blocked.has(candidate)) {
    suffix += 1;
    candidate = `${normalizedBase}-${suffix}`;
  }

  return candidate;
}

function buildAssistantReply(
  locale: Locale,
  profile: EpkProfile,
  showsCount: number,
  variant: "booking" | "festival" | "press" | "seo" | "summary"
) {
  const bandName = profile.bandName.trim() || "Band";
  const genre = profile.genre.trim() || t(locale, "genre a completer", "genre to complete");
  const origin = profile.origin.trim() || t(locale, "origine a completer", "origin to complete");
  const bio = profile.bio.trim() || t(locale, "Ajoute d'abord la bio du projet.", "Add the project bio first.");
  const releases = profile.releases.length;
  const pressQuotes = profile.pressQuotes.length;

  if (variant === "booking") {
    return t(
      locale,
      `${bandName} est un projet ${genre} base a ${origin}. L'angle booking a pousser ici: intensite live, execution tour-ready et un set deja pense pour la route. Aujourd'hui, le projet affiche ${releases} release(s), ${showsCount} date(s) visibles dans BandOS et une base EPK deja exploitable pour un mail de prog.`,
      `${bandName} is a ${genre} project based in ${origin}. The booking angle to push here is live intensity, tour-ready execution, and a set already built for the road. Right now the project shows ${releases} release(s), ${showsCount} visible show(s) in BandOS, and an EPK already usable for promoter outreach.`
    );
  }

  if (variant === "festival") {
    return t(
      locale,
      `${bandName} doit etre presente ici comme un projet a fort impact visuel et a lecture immediate. Pour la version festival, garde une bio plus courte, pousse les stats, les photos live les plus fortes et mets en avant l'origine ${origin} ainsi que le genre ${genre}.`,
      `${bandName} should be positioned here as an instant-read, high-impact live act. For the festival version, keep the bio shorter, push the strongest stats, use the best live photos, and emphasize ${origin} plus the ${genre} positioning.`
    );
  }

  if (variant === "press") {
    return t(
      locale,
      `Version presse conseillee: ouvre avec une phrase tres claire sur ${bandName}, puis enchaine avec la vision artistique, les releases (${releases}) et les retours medias deja disponibles (${pressQuotes}). La bio actuelle peut etre coupee en 2 ou 3 paragraphes plus nets pour etre plus facilement reprise.`,
      `Recommended press version: open with a very clear statement about ${bandName}, then move into artistic vision, releases (${releases}), and the media feedback already available (${pressQuotes}). The current bio can be trimmed into 2 or 3 sharper paragraphs to be easier to quote.`
    );
  }

  if (variant === "seo") {
    return t(
      locale,
      `SEO EPK: pense a repeter naturellement ${bandName}, ${genre}, ${origin} et les mots-cles live / booking / tour. Ajoute aussi un titre de page plus precis et une meta-description courte centree sur la proposition live du groupe.`,
      `EPK SEO: naturally repeat ${bandName}, ${genre}, ${origin}, and live / booking / tour keywords. Also add a sharper page title and a short meta description centered on the band's live proposition.`
    );
  }

  return bio;
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
  const epkBuilder = useBandosUIStore((state) => state.epkBuilder);
  const replaceEpkBuilder = useBandosUIStore((state) => state.replaceEpkBuilder);
  const importedShowFolders = useBandosUIStore((state) => state.importedShowFolders);
  const uploadedDocuments = useBandosUIStore((state) => state.uploadedDocuments);

  const [libraryQuery, setLibraryQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "manual">("fit");
  const [showGrid, setShowGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [assistantReply, setAssistantReply] = useState("");
  const [appOrigin, setAppOrigin] = useState("");
  const [publicUrlMessage, setPublicUrlMessage] = useState("");

  const historyRef = useRef<EpkBuilderState[]>([]);
  const futureRef = useRef<EpkBuilderState[]>([]);
  const copiedBlockRef = useRef<EpkBuilderBlock | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);

  const selectedPage =
    epkBuilder.pages.find((page) => page.id === epkBuilder.selectedPageId) ||
    epkBuilder.pages[0] ||
    null;
  const selectedBlock =
    selectedPage?.blocks.find((block) => block.id === epkBuilder.selectedBlockId) || null;

  const completion = useMemo(() => {
    const checks = [
      epkProfile.bandName.trim(),
      epkProfile.genre.trim(),
      epkProfile.bio.trim(),
      epkProfile.members.length > 0,
      epkProfile.heroImageUrl,
      epkProfile.liveImageUrl,
      epkBuilder.pages.some((page) => page.blocks.some((block) => block.visible)),
      epkBuilder.publishedSlug.trim()
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [epkBuilder.pages, epkBuilder.publishedSlug, epkProfile]);

  const filteredCatalog = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();

    return epkBuilderBlockCatalog.filter((entry) => {
      if (!query) {
        return true;
      }

      return [entry.title, entry.description, entry.category]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [libraryQuery]);

  const recentBlocks = epkBuilder.recentBlockTypes
    .map((type) => epkBuilderBlockCatalog.find((entry) => entry.type === type))
    .filter(Boolean) as EpkBuilderBlockCatalogEntry[];
  const favoriteBlocks = epkBuilder.favoriteBlockTypes
    .map((type) => epkBuilderBlockCatalog.find((entry) => entry.type === type))
    .filter(Boolean) as EpkBuilderBlockCatalogEntry[];
  const canvasBaseWidth = canvasDeviceWidths[epkBuilder.deviceMode];
  const canvasFrameWidth = Math.round(canvasBaseWidth * zoom);

  function commitBuilder(
    recipe: (current: EpkBuilderState) => EpkBuilderState,
    options?: { trackHistory?: boolean }
  ) {
    const base = epkBuilder;
    const next = normalizeEpkBuilder(recipe(base));

    if (JSON.stringify(base) === JSON.stringify(next)) {
      return;
    }

    if (options?.trackHistory !== false) {
      historyRef.current.push(base);
      historyRef.current = historyRef.current.slice(-40);
      futureRef.current = [];
    }

    replaceEpkBuilder(next);
  }

  function undoBuilder() {
    const previous = historyRef.current.pop();

    if (!previous) {
      return;
    }

    futureRef.current.unshift(epkBuilder);
    replaceEpkBuilder(previous);
  }

  function redoBuilder() {
    const next = futureRef.current.shift();

    if (!next) {
      return;
    }

    historyRef.current.push(epkBuilder);
    replaceEpkBuilder(next);
  }

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

  async function uploadSelectedBlockImage(file: File) {
    if (!selectedPage || !selectedBlock) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);

    commitBuilder((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === selectedPage.id
          ? {
              ...page,
              blocks: page.blocks.map((block) =>
                block.id === selectedBlock.id
                  ? {
                      ...block,
                      imageUrl: dataUrl
                    }
                  : block
              )
            }
          : page
      )
    }));
  }

  function selectPage(pageId: string) {
    commitBuilder(
      (current) => {
        const page = current.pages.find((entry) => entry.id === pageId);

        if (!page) {
          return current;
        }

        return {
          ...current,
          selectedPageId: pageId,
          selectedBlockId: page.blocks[0]?.id ?? null
        };
      },
      { trackHistory: false }
    );
  }

  function selectBlock(pageId: string, blockId: string) {
    commitBuilder(
      (current) => ({
        ...current,
        selectedPageId: pageId,
        selectedBlockId: blockId
      }),
      { trackHistory: false }
    );
  }

  function addBlock(type: EpkBuilderBlock["type"]) {
    if (!selectedPage) {
      return;
    }

    const nextBlock = createEpkBuilderBlock(type);

    commitBuilder((current) => ({
      ...current,
      selectedPageId: selectedPage.id,
      selectedBlockId: nextBlock.id,
      recentBlockTypes: [type, ...current.recentBlockTypes.filter((entry) => entry !== type)].slice(
        0,
        8
      ),
      pages: current.pages.map((page) =>
        page.id === selectedPage.id
          ? {
              ...page,
              blocks: [...page.blocks, nextBlock]
            }
          : page
      )
    }));
  }

  function duplicateSelectedBlock() {
    if (!selectedPage || !selectedBlock) {
      return;
    }

    const duplicateBlock = createEpkBuilderBlock(selectedBlock.type, {
      ...selectedBlock
    });

    commitBuilder((current) => ({
      ...current,
      selectedBlockId: duplicateBlock.id,
      pages: current.pages.map((page) => {
        if (page.id !== selectedPage.id) {
          return page;
        }

        const blockIndex = page.blocks.findIndex((block) => block.id === selectedBlock.id);

        if (blockIndex < 0) {
          return page;
        }

        const nextBlocks = [...page.blocks];
        nextBlocks.splice(blockIndex + 1, 0, duplicateBlock);

        return {
          ...page,
          blocks: nextBlocks
        };
      })
    }));
  }

  function deleteSelectedBlock() {
    if (!selectedPage || !selectedBlock) {
      return;
    }

    commitBuilder((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== selectedPage.id) {
          return page;
        }

        const nextBlocks = page.blocks.filter((block) => block.id !== selectedBlock.id);

        return {
          ...page,
          blocks: nextBlocks
        };
      }),
      selectedBlockId:
        selectedPage.blocks.filter((block) => block.id !== selectedBlock.id)[0]?.id ?? null
    }));
  }

  function moveBlock(pageId: string, draggedBlockId: string, targetBlockId: string) {
    commitBuilder((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== pageId) {
          return page;
        }

        const sourceIndex = page.blocks.findIndex((block) => block.id === draggedBlockId);
        const targetIndex = page.blocks.findIndex((block) => block.id === targetBlockId);

        if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
          return page;
        }

        const nextBlocks = [...page.blocks];
        const [movedBlock] = nextBlocks.splice(sourceIndex, 1);
        nextBlocks.splice(targetIndex, 0, movedBlock);

        return {
          ...page,
          blocks: nextBlocks
        };
      })
    }));
  }

  function addPage() {
    const nextPage = createBlankEpkBuilderPage(
      t(locale, "Nouvelle page", "New page")
    );

    commitBuilder((current) => ({
      ...current,
      selectedPageId: nextPage.id,
      selectedBlockId: nextPage.blocks[0]?.id ?? null,
      pages: [
        ...current.pages,
        {
          ...nextPage,
          slug: ensureUniquePageSlug(current.pages, nextPage.slug)
        }
      ]
    }));
  }

  function deletePage(pageId: string) {
    if (epkBuilder.pages.length <= 1) {
      return;
    }

    commitBuilder((current) => {
      const nextPages = current.pages.filter((page) => page.id !== pageId);
      const fallbackPage = nextPages[0] || null;

      return {
        ...current,
        pages: nextPages,
        selectedPageId: fallbackPage?.id ?? "",
        selectedBlockId: fallbackPage?.blocks[0]?.id ?? null
      };
    });
  }

  function toggleFavoriteBlockType(type: EpkBuilderBlock["type"]) {
    commitBuilder(
      (current) => ({
        ...current,
        favoriteBlockTypes: current.favoriteBlockTypes.includes(type)
          ? current.favoriteBlockTypes.filter((entry) => entry !== type)
          : [...current.favoriteBlockTypes, type]
      }),
      { trackHistory: false }
    );
  }

  function updateSelectedPage(patch: Partial<EpkBuilderPage>) {
    if (!selectedPage) {
      return;
    }

    commitBuilder((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === selectedPage.id
          ? {
              ...page,
              ...patch,
              slug:
                patch.slug !== undefined
                  ? ensureUniquePageSlug(current.pages, patch.slug, selectedPage.id)
                  : page.slug,
              background:
                patch.background !== undefined
                  ? patch.background
                  : page.background
            }
          : page
      )
    }));
  }

  function updateSelectedBlock(patch: Partial<EpkBuilderBlock>) {
    if (!selectedPage || !selectedBlock) {
      return;
    }

    commitBuilder((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === selectedPage.id
          ? {
              ...page,
              blocks: page.blocks.map((block) =>
                block.id === selectedBlock.id
                  ? {
                      ...block,
                      ...patch
                    }
                  : block
              )
            }
          : page
      )
    }));
  }

  useEffect(() => {
    setAppOrigin(window.location.origin);
  }, []);

  const fitCanvasToViewport = useCallback(() => {
    const viewport = canvasViewportRef.current;

    if (!viewport) {
      return;
    }

    const availableWidth = Math.max(viewport.clientWidth - 20, 280);
    const nextZoom = clampZoom(availableWidth / canvasBaseWidth);
    setZoom(nextZoom);
  }, [canvasBaseWidth]);

  useEffect(() => {
    if (!epkBuilder.publishedSlug && (epkProfile.bandName || workspaceName)) {
      commitBuilder(
        (current) => ({
          ...current,
          publishedSlug: createPublishedEpkSlug(epkProfile.bandName || workspaceName)
        }),
        { trackHistory: false }
      );
    }
  }, [epkBuilder.publishedSlug, epkProfile.bandName, workspaceName]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return;
      }

      const modifierPressed = event.metaKey || event.ctrlKey;

      if (modifierPressed && event.key.toLowerCase() === "c" && selectedBlock) {
        copiedBlockRef.current = selectedBlock;
        event.preventDefault();
        return;
      }

      if (modifierPressed && event.key.toLowerCase() === "v" && selectedPage) {
        if (copiedBlockRef.current) {
          const pastedBlock = createEpkBuilderBlock(copiedBlockRef.current.type, {
            ...copiedBlockRef.current
          });

          commitBuilder((current) => ({
            ...current,
            selectedPageId: selectedPage.id,
            selectedBlockId: pastedBlock.id,
            pages: current.pages.map((page) =>
              page.id === selectedPage.id
                ? {
                    ...page,
                    blocks: [...page.blocks, pastedBlock]
                  }
                : page
            )
          }));
          event.preventDefault();
        }

        return;
      }

      if (modifierPressed && event.key.toLowerCase() === "d") {
        duplicateSelectedBlock();
        event.preventDefault();
        return;
      }

      if (modifierPressed && event.key.toLowerCase() === "z" && event.shiftKey) {
        redoBuilder();
        event.preventDefault();
        return;
      }

      if (modifierPressed && event.key.toLowerCase() === "z") {
        undoBuilder();
        event.preventDefault();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelectedBlock();
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [epkBuilder, selectedBlock, selectedPage]);

  useEffect(() => {
    if (zoomMode !== "fit") {
      return;
    }

    fitCanvasToViewport();

    function handleResize() {
      fitCanvasToViewport();
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitCanvasToViewport, zoomMode, selectedPage?.id]);

  const previewUrl = `/epk/${epkBuilder.publishedSlug || createPublishedEpkSlug(epkProfile.bandName || workspaceName)}`;
  const absolutePreviewUrl = appOrigin ? `${appOrigin}${previewUrl}` : previewUrl;

  async function publishAndCopyPublicUrl() {
    const nextSlug = createPublishedEpkSlug(
      epkBuilder.publishedSlug || epkProfile.bandName || workspaceName
    );

    commitBuilder(
      (current) => ({
        ...current,
        published: true,
        publishedSlug: nextSlug
      }),
      { trackHistory: false }
    );

    const nextUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/epk/${nextSlug}`
        : `/epk/${nextSlug}`;

    try {
      await navigator.clipboard.writeText(nextUrl);
      setPublicUrlMessage(
        t(locale, "Lien public copie dans le presse-papiers.", "Public link copied to clipboard.")
      );
    } catch {
      setPublicUrlMessage(nextUrl);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="EPK Builder"
        title={t(
          locale,
          "Constructeur EPK live, public et PDF",
          "Live, public and PDF EPK builder"
        )}
        description={t(
          locale,
          "Le canvas central est maintenant la source unique du rendu. Tu construis le site final en direct, puis tu publies cette meme version sur une URL BandOS et tu l’exportes en PDF.",
          "The central canvas is now the single source of truth. You build the final site directly, then publish that exact version on a BandOS URL and export it to PDF."
        )}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
            >
              <Eye className="h-4 w-4" />
              {t(locale, "Voir l’EPK public", "Open public EPK")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.open("/epk/print", "_blank", "noopener,noreferrer")}
            >
              <Download className="h-4 w-4" />
              {t(locale, "Version print", "Print version")}
            </Button>
            <Button
              type="button"
              onClick={() =>
                commitBuilder((current) => ({
                  ...current,
                  published: true
                }))
              }
            >
              {epkBuilder.published
                ? t(locale, "EPK publie", "EPK published")
                : t(locale, "Publier", "Publish")}
            </Button>
            <Button type="button" variant="secondary" onClick={publishAndCopyPublicUrl}>
              {t(
                locale,
                "Generer et copier l’URL publique",
                "Generate and copy public URL"
              )}
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
        <div className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-2 no-scrollbar">
          <SectionCard
            title={t(locale, "Bibliotheque", "Library")}
            description={t(
              locale,
              "Recherche, favoris, blocs recents et categories.",
              "Search, favorites, recent blocks and categories."
            )}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-300" />
              <Input
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder={t(locale, "Rechercher un bloc", "Search block")}
                className="pl-10"
              />
            </div>

            {favoriteBlocks.length ? (
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Favoris", "Favorites")}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {favoriteBlocks.map((entry) => (
                    <button
                      key={entry.type}
                      type="button"
                      onClick={() => addBlock(entry.type)}
                      className="rounded-full border border-coral-500/25 bg-coral-500/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-coral-200"
                    >
                      {entry.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {recentBlocks.length ? (
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Recents", "Recent")}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {recentBlocks.map((entry) => (
                    <button
                      key={entry.type}
                      type="button"
                      onClick={() => addBlock(entry.type)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-mist-100"
                    >
                      {entry.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              {categoryOrder.map((category) => {
                const rows = filteredCatalog.filter((entry) => entry.category === category);

                if (!rows.length) {
                  return null;
                }

                return (
                  <div key={category} className="space-y-2">
                    <FieldLabel>{category}</FieldLabel>
                    <div className="space-y-2">
                      {rows.map((entry) => (
                        <div
                          key={entry.type}
                          className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-mist-50">{entry.title}</p>
                              <p className="mt-1 text-xs leading-6 text-mist-300">
                                {entry.description}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleFavoriteBlockType(entry.type)}
                              className={cn(
                                "shrink-0 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em]",
                                epkBuilder.favoriteBlockTypes.includes(entry.type)
                                  ? "border-coral-500/30 bg-coral-500/10 text-coral-200"
                                  : "border-white/10 bg-white/[0.03] text-mist-300"
                              )}
                            >
                              {t(locale, "Fav", "Fav")}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => addBlock(entry.type)}
                            className="mt-3 inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-mist-100"
                          >
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            {t(locale, "Ajouter", "Add")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title={t(locale, "Pages", "Pages")}
            description={t(
              locale,
              "Chaque page a sa propre URL publique.",
              "Every page gets its own public URL."
            )}
          >
            <div className="space-y-2">
              {epkBuilder.pages.map((page) => (
                <div
                  key={page.id}
                  className={cn(
                    "rounded-[22px] border px-4 py-3",
                    selectedPage?.id === page.id
                      ? "border-coral-500/40 bg-coral-500/10"
                      : "border-white/8 bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => selectPage(page.id)}
                    >
                      <p className="truncate text-sm font-medium text-mist-50">{page.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-mist-300">
                        /{page.slug || ""}
                      </p>
                    </button>
                    {epkBuilder.pages.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => deletePage(page.id)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-mist-300"
                      >
                        {t(locale, "Suppr", "Delete")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={addPage}>
              <Plus className="h-4 w-4" />
              {t(locale, "Ajouter une page", "Add page")}
            </Button>
          </SectionCard>

          <SectionCard
            title={t(locale, "Raccourcis", "Shortcuts")}
            description={t(
              locale,
              "Copy, paste, duplicate, delete, undo et redo sont deja actifs.",
              "Copy, paste, duplicate, delete, undo and redo are already active."
            )}
          >
            <div className="grid gap-2 text-xs text-mist-300">
              <p>Ctrl/Cmd + C · {t(locale, "copier le bloc", "copy block")}</p>
              <p>Ctrl/Cmd + V · {t(locale, "coller le bloc", "paste block")}</p>
              <p>Ctrl/Cmd + D · {t(locale, "dupliquer", "duplicate")}</p>
              <p>Delete · {t(locale, "supprimer", "delete")}</p>
              <p>Ctrl/Cmd + Z · {t(locale, "annuler", "undo")}</p>
              <p>Ctrl/Cmd + Shift + Z · {t(locale, "retablir", "redo")}</p>
            </div>
          </SectionCard>
        </div>

        <div className="min-w-0 space-y-4">
          <SectionCard
            title={t(locale, "Canvas", "Canvas")}
            description={t(
              locale,
              "Le canvas central est le futur site. Pas de mode preview separe.",
              "The central canvas is the future site itself. No separate preview mode."
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setZoomMode("fit");
                    commitBuilder(
                      (current) => ({
                        ...current,
                        deviceMode: "desktop"
                      }),
                      { trackHistory: false }
                    );
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs uppercase tracking-[0.2em]",
                    epkBuilder.deviceMode === "desktop"
                      ? "border-coral-500/40 bg-coral-500/10 text-coral-200"
                      : "border-white/10 bg-white/5 text-mist-100"
                  )}
                >
                  <Monitor className="h-4 w-4" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomMode("fit");
                    commitBuilder(
                      (current) => ({
                        ...current,
                        deviceMode: "tablet"
                      }),
                      { trackHistory: false }
                    );
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs uppercase tracking-[0.2em]",
                    epkBuilder.deviceMode === "tablet"
                      ? "border-coral-500/40 bg-coral-500/10 text-coral-200"
                      : "border-white/10 bg-white/5 text-mist-100"
                  )}
                >
                  <Tablet className="h-4 w-4" />
                  Tablet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomMode("fit");
                    commitBuilder(
                      (current) => ({
                        ...current,
                        deviceMode: "mobile"
                      }),
                      { trackHistory: false }
                    );
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs uppercase tracking-[0.2em]",
                    epkBuilder.deviceMode === "mobile"
                      ? "border-coral-500/40 bg-coral-500/10 text-coral-200"
                      : "border-white/10 bg-white/5 text-mist-100"
                  )}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGrid((value) => !value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs uppercase tracking-[0.2em]",
                    showGrid
                      ? "border-white/10 bg-white/8 text-mist-50"
                      : "border-white/10 bg-white/5 text-mist-300"
                  )}
                >
                  <Grid2x2 className="h-4 w-4" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuides((value) => !value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs uppercase tracking-[0.2em]",
                    showGuides
                      ? "border-white/10 bg-white/8 text-mist-50"
                      : "border-white/10 bg-white/5 text-mist-300"
                  )}
                >
                  <LayoutTemplate className="h-4 w-4" />
                  Guides
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomMode("fit");
                    fitCanvasToViewport();
                  }}
                  className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-mist-100"
                >
                  Fit
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FieldLabel>{t(locale, "Zoom", "Zoom")}</FieldLabel>
              <input
                type="range"
                min="0.35"
                max="1.4"
                step="0.01"
                value={zoom}
                onChange={(event) => {
                  setZoomMode("manual");
                  setZoom(clampZoom(Number(event.target.value)));
                }}
                className="w-full accent-coral-500"
              />
              <span className="text-xs text-mist-300">{Math.round(zoom * 100)}%</span>
            </div>
          </SectionCard>

          <Card className="overflow-hidden p-3 lg:p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {epkBuilder.pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => selectPage(page.id)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs uppercase tracking-[0.2em]",
                    selectedPage?.id === page.id
                      ? "border-coral-500/40 bg-coral-500/10 text-coral-200"
                      : "border-white/10 bg-white/5 text-mist-100"
                  )}
                >
                  {page.title}
                </button>
              ))}
            </div>

            <div className="relative overflow-hidden rounded-[30px] border border-white/8 bg-[#060709] p-3 sm:p-4 lg:p-6">
              {showGrid ? (
                <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:22px_22px]" />
              ) : null}
              {showGuides ? (
                <>
                  <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-white/8" />
                  <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-white/8" />
                </>
              ) : null}
              <div
                ref={canvasViewportRef}
                className="relative h-[72vh] min-h-[520px] max-h-[900px] overflow-auto rounded-[28px] bg-[#040506] p-2 sm:p-4 lg:p-5"
              >
                <div
                  className="mx-auto transition-[width] duration-200"
                  style={{
                    width: `${canvasFrameWidth}px`
                  }}
                >
                  <EpkBuilderRenderer
                    locale={locale}
                    profile={epkProfile}
                    builder={epkBuilder}
                    workspaceName={workspaceName}
                    workspaceLogo={workspaceLogo}
                    importedShowFolders={importedShowFolders}
                    uploadedDocuments={uploadedDocuments}
                    mode="editor"
                    previewDeviceMode={epkBuilder.deviceMode}
                    activePageId={selectedPage?.id ?? null}
                    selectedBlockId={selectedBlock?.id ?? null}
                    siteSlug={epkBuilder.publishedSlug}
                    onSelectPage={selectPage}
                    onSelectBlock={selectBlock}
                    onMoveBlock={moveBlock}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pl-2 no-scrollbar">
          <SectionCard
            title={t(locale, "Proprietes de page", "Page properties")}
            description={t(
              locale,
              "Chaque page a son titre, son slug et son background.",
              "Every page has its own title, slug and background."
            )}
          >
            {selectedPage ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel>{t(locale, "Titre de page", "Page title")}</FieldLabel>
                  <Input
                    value={selectedPage.title}
                    onChange={(event) =>
                      updateSelectedPage({ title: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Slug</FieldLabel>
                  <Input
                    value={selectedPage.slug}
                    onChange={(event) =>
                      updateSelectedPage({ slug: event.target.value })
                    }
                    placeholder="epk"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>{t(locale, "Description", "Description")}</FieldLabel>
                  <textarea
                    className={textareaClassName}
                    value={selectedPage.description}
                    onChange={(event) =>
                      updateSelectedPage({ description: event.target.value })
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>{t(locale, "Template", "Template")}</FieldLabel>
                    <Select
                      value={epkBuilder.template}
                      onChange={(event) =>
                        commitBuilder(
                          (current) => ({
                            ...current,
                            template: event.target.value as EpkBuilderState["template"]
                          }),
                          { trackHistory: false }
                        )
                      }
                    >
                      <option value="metal">Metal</option>
                      <option value="hardcore">Hardcore</option>
                      <option value="booking">Booking</option>
                      <option value="minimal">Minimal</option>
                      <option value="light">Light</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>{t(locale, "Type de page", "Page type")}</FieldLabel>
                    <Select
                      value={selectedPage.pageType}
                      onChange={(event) =>
                        updateSelectedPage({
                          pageType: event.target.value as EpkBuilderPage["pageType"]
                        })
                      }
                    >
                      <option value="home">Home</option>
                      <option value="epk">EPK</option>
                      <option value="live">Live</option>
                      <option value="media">Media</option>
                      <option value="discography">Discography</option>
                      <option value="merch">Merch</option>
                      <option value="contact">Contact</option>
                      <option value="downloads">Downloads</option>
                      <option value="custom">Custom</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>{t(locale, "Fond", "Background")}</FieldLabel>
                    <Select
                      value={selectedPage.background.mode}
                      onChange={(event) =>
                        updateSelectedPage({
                          background: {
                            ...selectedPage.background,
                            mode: event.target.value as EpkBuilderPage["background"]["mode"]
                          }
                        })
                      }
                    >
                      <option value="gradient">Gradient</option>
                      <option value="solid">Solid</option>
                      <option value="image">Image</option>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField
                    label={t(locale, "Couleur fond 1", "Background color 1")}
                    value={selectedPage.background.primaryColor}
                    onChange={(value) =>
                      updateSelectedPage({
                        background: {
                          ...selectedPage.background,
                          primaryColor: value
                        }
                      })
                    }
                  />
                  <ColorField
                    label={t(locale, "Couleur fond 2", "Background color 2")}
                    value={selectedPage.background.secondaryColor}
                    onChange={(value) =>
                      updateSelectedPage({
                        background: {
                          ...selectedPage.background,
                          secondaryColor: value
                        }
                      })
                    }
                  />
                </div>
                <ColorField
                  label={t(locale, "Couleur du texte", "Text color")}
                  value={selectedPage.background.textColor}
                  onChange={(value) =>
                    updateSelectedPage({
                      background: {
                        ...selectedPage.background,
                        textColor: value
                      }
                    })
                  }
                />
                <div className="space-y-2">
                  <FieldLabel>{t(locale, "Image de fond", "Background image")}</FieldLabel>
                  <Input
                    value={selectedPage.background.imageUrl ?? ""}
                    onChange={(event) =>
                      updateSelectedPage({
                        background: {
                          ...selectedPage.background,
                          imageUrl: event.target.value.trim() || null
                        }
                      })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>{t(locale, "Overlay", "Overlay")}</FieldLabel>
                  <Input
                    value={String(Math.round(selectedPage.background.overlayOpacity * 100))}
                    onChange={(event) =>
                      updateSelectedPage({
                        background: {
                          ...selectedPage.background,
                          overlayOpacity: parsePercent(event.target.value)
                        }
                      })
                    }
                  />
                </div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title={t(locale, "Bloc selectionne", "Selected block")}
            description={t(
              locale,
              "Les modifications sont visibles instantanement dans le canvas.",
              "Changes are visible instantly in the canvas."
            )}
          >
            {selectedBlock ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="accent">{selectedBlock.type}</Badge>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={duplicateSelectedBlock}>
                      <Copy className="h-4 w-4" />
                      {t(locale, "Dupliquer", "Duplicate")}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={deleteSelectedBlock}>
                      <Trash2 className="h-4 w-4" />
                      {t(locale, "Supprimer", "Delete")}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateSelectedBlock({ visible: !selectedBlock.visible })}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-100"
                  >
                    {selectedBlock.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {selectedBlock.visible
                      ? t(locale, "Visible", "Visible")
                      : t(locale, "Masque", "Hidden")}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedBlock({ locked: !selectedBlock.locked })}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-100"
                  >
                    {selectedBlock.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    {selectedBlock.locked
                      ? t(locale, "Verrouille", "Locked")
                      : t(locale, "Editable", "Editable")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedBlock({ desktopOnly: !selectedBlock.desktopOnly })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-100"
                  >
                    <Monitor className="h-4 w-4" />
                    {selectedBlock.desktopOnly
                      ? t(locale, "Desktop only", "Desktop only")
                      : t(locale, "Desktop + mobile", "Desktop + mobile")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedBlock({ mobileHidden: !selectedBlock.mobileHidden })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-100"
                  >
                    <Smartphone className="h-4 w-4" />
                    {selectedBlock.mobileHidden
                      ? t(locale, "Masque sur mobile", "Hidden on mobile")
                      : t(locale, "Visible sur mobile", "Visible on mobile")}
                  </button>
                </div>
                <div className="space-y-2">
                  <FieldLabel>{t(locale, "Titre", "Title")}</FieldLabel>
                  <Input
                    value={selectedBlock.title}
                    onChange={(event) =>
                      updateSelectedBlock({ title: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>{t(locale, "Sous-titre", "Subtitle")}</FieldLabel>
                  <Input
                    value={selectedBlock.subtitle}
                    onChange={(event) =>
                      updateSelectedBlock({ subtitle: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>{t(locale, "Contenu libre", "Free content")}</FieldLabel>
                  <textarea
                    className={textareaClassName}
                    value={selectedBlock.body}
                    onChange={(event) =>
                      updateSelectedBlock({ body: event.target.value })
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>{t(locale, "Layout", "Layout")}</FieldLabel>
                    <Select
                      value={selectedBlock.layout}
                      onChange={(event) =>
                        updateSelectedBlock({
                          layout: event.target.value as EpkBuilderBlock["layout"]
                        })
                      }
                    >
                      <option value="contained">Contained</option>
                      <option value="split">Split</option>
                      <option value="full">Full</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>{t(locale, "Alignement", "Alignment")}</FieldLabel>
                    <Select
                      value={selectedBlock.align}
                      onChange={(event) =>
                        updateSelectedBlock({
                          align: event.target.value as EpkBuilderBlock["align"]
                        })
                      }
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>{t(locale, "Hauteur", "Height")}</FieldLabel>
                    <Select
                      value={selectedBlock.height}
                      onChange={(event) =>
                        updateSelectedBlock({
                          height: event.target.value as EpkBuilderBlock["height"]
                        })
                      }
                    >
                      <option value="sm">Small</option>
                      <option value="md">Medium</option>
                      <option value="lg">Large</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>{t(locale, "Limite items", "Item limit")}</FieldLabel>
                    <Input
                      value={selectedBlock.itemsLimit ?? ""}
                      onChange={(event) =>
                        updateSelectedBlock({
                          itemsLimit:
                            parseNullableInteger(event.target.value) ?? null
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>CTA label</FieldLabel>
                    <Input
                      value={selectedBlock.ctaLabel}
                      onChange={(event) =>
                        updateSelectedBlock({ ctaLabel: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>CTA href</FieldLabel>
                    <Input
                      value={selectedBlock.ctaHref}
                      onChange={(event) =>
                        updateSelectedBlock({ ctaHref: event.target.value })
                      }
                    />
                  </div>
                </div>
                <ColorField
                  label={t(locale, "Accent", "Accent")}
                  value={selectedBlock.accent ?? "#f25a4c"}
                  onChange={(value) => updateSelectedBlock({ accent: value || null })}
                />
                <div className="space-y-3">
                  <FieldLabel>{t(locale, "Image override", "Image override")}</FieldLabel>
                  <Input
                    value={selectedBlock.imageUrl ?? ""}
                    onChange={(event) =>
                      updateSelectedBlock({
                        imageUrl: event.target.value.trim() || null
                      })
                    }
                    placeholder="https://..."
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-100 transition hover:bg-white/10">
                    <ImagePlus className="h-4 w-4" />
                    {t(locale, "Uploader une image de bloc", "Upload block image")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];

                        if (!file) {
                          return;
                        }

                        await uploadSelectedBlockImage(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-sm text-mist-300">
                {t(locale, "Selectionne un bloc dans le canvas.", "Select a block in the canvas.")}
              </p>
            )}
          </SectionCard>

          <SectionCard
            title={t(locale, "Publication", "Publishing")}
            description={t(
              locale,
              "L’URL BandOS publique est basee sur ce slug.",
              "The public BandOS URL is based on this slug."
            )}
          >
            <div className="space-y-2">
              <FieldLabel>Slug public</FieldLabel>
              <Input
                value={epkBuilder.publishedSlug}
                onChange={(event) =>
                  commitBuilder(
                    (current) => ({
                      ...current,
                      publishedSlug: createPublishedEpkSlug(event.target.value)
                    }),
                    { trackHistory: false }
                  )
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  commitBuilder((current) => ({
                    ...current,
                    published: !current.published
                  }))
                }
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm font-medium",
                  epkBuilder.published
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-mist-100"
                )}
              >
                {epkBuilder.published
                  ? t(locale, "Publie", "Published")
                  : t(locale, "Brouillon", "Draft")}
              </button>
              <button
                type="button"
                onClick={publishAndCopyPublicUrl}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-mist-100"
              >
                {t(locale, "Generer et copier le lien", "Generate and copy link")}
              </button>
            </div>
            <p className="break-all text-sm text-mist-300">{absolutePreviewUrl}</p>
            {publicUrlMessage ? (
              <p className="text-sm text-coral-200">{publicUrlMessage}</p>
            ) : null}
          </SectionCard>

          <SectionCard
            title={t(locale, "Donnees groupe", "Band data")}
            description={t(
              locale,
              "Toutes ces donnees alimentent automatiquement les blocs du builder.",
              "All these fields automatically power the builder blocks."
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
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
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Annee", "Founded")}</FieldLabel>
                <Input
                  value={epkProfile.foundedYear}
                  onChange={(event) => updateEpkProfile({ foundedYear: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>{t(locale, "Bio", "Bio")}</FieldLabel>
              <textarea
                className={textareaClassName}
                value={epkProfile.bio}
                onChange={(event) => updateEpkProfile({ bio: event.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Email</FieldLabel>
                <Input
                  value={epkProfile.contactEmail}
                  onChange={(event) => updateEpkProfile({ contactEmail: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Telephone", "Phone")}</FieldLabel>
                <Input
                  value={epkProfile.contactPhone}
                  onChange={(event) => updateEpkProfile({ contactPhone: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>Website</FieldLabel>
              <Input
                value={epkProfile.website}
                onChange={(event) => updateEpkProfile({ website: event.target.value })}
              />
            </div>
          </SectionCard>

          <SectionCard
            title={t(locale, "Stats, line-up et releases", "Stats, lineup and releases")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Instagram</FieldLabel>
                <Input
                  value={epkProfile.instagramUrl}
                  onChange={(event) => updateEpkProfile({ instagramUrl: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Followers IG", "IG followers")}</FieldLabel>
                <Input
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
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Followers FB", "FB followers")}</FieldLabel>
                <Input
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
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Listeners", "Listeners")}</FieldLabel>
                <Input
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
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Vues YouTube", "YouTube views")}</FieldLabel>
                <Input
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
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Streams", "Streams")}</FieldLabel>
                <Input
                  value={epkProfile.streamCount ?? ""}
                  onChange={(event) =>
                    updateEpkProfile({
                      streamCount: parseNullableInteger(event.target.value)
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t(locale, "Membres", "Members")}</FieldLabel>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
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
                  {t(locale, "Ajouter", "Add")}
                </Button>
              </div>
              {epkProfile.members.map((member) => (
                <div key={member.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    value={member.name}
                    onChange={(event) => updateMember(member.id, { name: event.target.value })}
                    placeholder={t(locale, "Nom", "Name")}
                  />
                  <Input
                    value={member.role}
                    onChange={(event) => updateMember(member.id, { role: event.target.value })}
                    placeholder={t(locale, "Role", "Role")}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
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
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t(locale, "Shared stage with", "Shared stage with")}</FieldLabel>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    updateEpkProfile({
                      sharedStageWith: [...epkProfile.sharedStageWith, ""]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t(locale, "Ajouter", "Add")}
                </Button>
              </div>
              {epkProfile.sharedStageWith.map((artist, index) => (
                <div key={`${artist}-${index}`} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={artist}
                    onChange={(event) =>
                      updateEpkProfile({
                        sharedStageWith: epkProfile.sharedStageWith.map((entry, entryIndex) =>
                          entryIndex === index ? event.target.value : entry
                        )
                      })
                    }
                    placeholder={t(locale, "Nom artiste / groupe", "Artist / band name")}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t(locale, "Releases", "Releases")}</FieldLabel>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
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
                  {t(locale, "Ajouter", "Add")}
                </Button>
              </div>
              {epkProfile.releases.map((release) => (
                <div key={release.id} className="grid gap-3 sm:grid-cols-[110px_1fr_130px_auto]">
                  <Input
                    value={release.year}
                    onChange={(event) => updateRelease(release.id, { year: event.target.value })}
                    placeholder="2026"
                  />
                  <Input
                    value={release.title}
                    onChange={(event) => updateRelease(release.id, { title: event.target.value })}
                    placeholder={t(locale, "Titre", "Title")}
                  />
                  <Input
                    value={release.format}
                    onChange={(event) => updateRelease(release.id, { format: event.target.value })}
                    placeholder="EP"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
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
          </SectionCard>

          <SectionCard
            title={t(locale, "Presse, assets et visuels", "Press, assets and visuals")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Titre support", "Support title")}</FieldLabel>
                <Input
                  value={epkProfile.supportTitle}
                  onChange={(event) => updateEpkProfile({ supportTitle: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>{t(locale, "Sous-titre support", "Support subtitle")}</FieldLabel>
                <Input
                  value={epkProfile.supportSubtitle}
                  onChange={(event) => updateEpkProfile({ supportSubtitle: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t(locale, "Press quotes", "Press quotes")}</FieldLabel>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    updateEpkProfile({
                      pressQuotes: [
                        ...epkProfile.pressQuotes,
                        { id: buildRowId("epk-quote"), source: "", quote: "" }
                      ]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t(locale, "Ajouter", "Add")}
                </Button>
              </div>
              {epkProfile.pressQuotes.map((quote) => (
                <div key={quote.id} className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex gap-3">
                    <Input
                      value={quote.source}
                      onChange={(event) => updateQuote(quote.id, { source: event.target.value })}
                      placeholder={t(locale, "Source", "Source")}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        updateEpkProfile({
                          pressQuotes: epkProfile.pressQuotes.filter((entry) => entry.id !== quote.id)
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <textarea
                    className={textareaClassName}
                    value={quote.quote}
                    onChange={(event) => updateQuote(quote.id, { quote: event.target.value })}
                    placeholder={t(locale, "Citation", "Quote")}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t(locale, "Assets", "Assets")}</FieldLabel>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    updateEpkProfile({
                      assetList: [...epkProfile.assetList, ""]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t(locale, "Ajouter", "Add")}
                </Button>
              </div>
              {epkProfile.assetList.map((asset, index) => (
                <div key={`${asset}-${index}`} className="grid gap-3 sm:grid-cols-[1fr_auto]">
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
                    size="sm"
                    onClick={() =>
                      updateEpkProfile({
                        assetList: epkProfile.assetList.filter((_, entryIndex) => entryIndex !== index)
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <ImageField
                locale={locale}
                label={t(locale, "Logo", "Logo")}
                value={epkProfile.logoUrl}
                onChange={(value) => updateEpkProfile({ logoUrl: value })}
                onUpload={(file) => uploadImageField("logoUrl", file)}
                onRemove={() => updateEpkProfile({ logoUrl: null })}
              />
              <ImageField
                locale={locale}
                label={t(locale, "Hero image", "Hero image")}
                value={epkProfile.heroImageUrl}
                onChange={(value) => updateEpkProfile({ heroImageUrl: value })}
                onUpload={(file) => uploadImageField("heroImageUrl", file)}
                onRemove={() => updateEpkProfile({ heroImageUrl: null })}
              />
              <ImageField
                locale={locale}
                label={t(locale, "Live image", "Live image")}
                value={epkProfile.liveImageUrl}
                onChange={(value) => updateEpkProfile({ liveImageUrl: value })}
                onUpload={(file) => uploadImageField("liveImageUrl", file)}
                onRemove={() => updateEpkProfile({ liveImageUrl: null })}
              />
              <ImageField
                locale={locale}
                label={t(locale, "Detail image", "Detail image")}
                value={epkProfile.detailImageUrl}
                onChange={(value) => updateEpkProfile({ detailImageUrl: value })}
                onUpload={(file) => uploadImageField("detailImageUrl", file)}
                onRemove={() => updateEpkProfile({ detailImageUrl: null })}
              />
              <ImageField
                locale={locale}
                label={t(locale, "Support image", "Support image")}
                value={epkProfile.supportImageUrl}
                onChange={(value) => updateEpkProfile({ supportImageUrl: value })}
                onUpload={(file) => uploadImageField("supportImageUrl", file)}
                onRemove={() => updateEpkProfile({ supportImageUrl: null })}
              />
              <ImageField
                locale={locale}
                label={t(locale, "Closing image", "Closing image")}
                value={epkProfile.closingImageUrl}
                onChange={(value) => updateEpkProfile({ closingImageUrl: value })}
                onUpload={(file) => uploadImageField("closingImageUrl", file)}
                onRemove={() => updateEpkProfile({ closingImageUrl: null })}
              />
            </div>
          </SectionCard>

          <SectionCard
            title={t(locale, "Assistant IA EPK", "EPK AI assistant")}
            description={t(
              locale,
              "V1: il s’appuie uniquement sur les donnees deja presentes dans BandOS pour suggerer un angle.",
              "V1: it relies only on the data already present in BandOS to suggest an angle."
            )}
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setAssistantReply(
                    buildAssistantReply(
                      locale,
                      epkProfile,
                      importedShowFolders.length,
                      "booking"
                    )
                  )
                }
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-mist-100"
              >
                Booking
              </button>
              <button
                type="button"
                onClick={() =>
                  setAssistantReply(
                    buildAssistantReply(
                      locale,
                      epkProfile,
                      importedShowFolders.length,
                      "festival"
                    )
                  )
                }
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-mist-100"
              >
                Festival
              </button>
              <button
                type="button"
                onClick={() =>
                  setAssistantReply(
                    buildAssistantReply(
                      locale,
                      epkProfile,
                      importedShowFolders.length,
                      "press"
                    )
                  )
                }
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-mist-100"
              >
                Press
              </button>
              <button
                type="button"
                onClick={() =>
                  setAssistantReply(
                    buildAssistantReply(
                      locale,
                      epkProfile,
                      importedShowFolders.length,
                      "seo"
                    )
                  )
                }
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-mist-100"
              >
                SEO
              </button>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-mist-100">
              {assistantReply ||
                t(
                  locale,
                  "Choisis un angle ci-dessus pour generer une recommandation exploitable sans inventer de donnees.",
                  "Pick an angle above to generate a usable recommendation without inventing data."
                )}
            </div>
          </SectionCard>

          <SectionCard
            title={t(locale, "Historique", "History")}
            description={t(
              locale,
              "Undo et redo du builder courant.",
              "Undo and redo for the current builder."
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="secondary" onClick={undoBuilder}>
                <Undo2 className="h-4 w-4" />
                {t(locale, "Annuler", "Undo")}
              </Button>
              <Button type="button" variant="secondary" onClick={redoBuilder}>
                <Redo2 className="h-4 w-4" />
                {t(locale, "Retablir", "Redo")}
              </Button>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-mist-300">
              {t(locale, "Progression du builder", "Builder completion")}: {completion}%
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
