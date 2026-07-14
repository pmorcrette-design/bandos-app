"use client";

import Link from "next/link";

import {
  createPublishedEpkSlug,
  type EpkBuilderBlock,
  type EpkBuilderBlockType,
  type EpkBuilderDeviceMode,
  type EpkBuilderPage,
  type EpkBuilderState
} from "@/lib/epk-builder";
import { t, type Locale } from "@/lib/i18n";
import { cn, formatCompactNumber } from "@/lib/utils";
import type {
  EpkProfile,
  ImportedShowFolder,
  UploadedDocumentEntry
} from "@/lib/workspace-data";

type EpkBuilderRendererProps = {
  locale: Locale;
  profile: EpkProfile;
  builder: EpkBuilderState;
  workspaceName: string;
  workspaceLogo: string;
  importedShowFolders?: ImportedShowFolder[];
  uploadedDocuments?: UploadedDocumentEntry[];
  mode?: "editor" | "published" | "print";
  previewDeviceMode?: EpkBuilderDeviceMode;
  activePageId?: string | null;
  activePageSlug?: string | null;
  selectedBlockId?: string | null;
  siteSlug?: string;
  onSelectPage?: (pageId: string) => void;
  onSelectBlock?: (pageId: string, blockId: string) => void;
  onMoveBlock?: (
    pageId: string,
    draggedBlockId: string,
    targetBlockId: string,
    placement?: "before" | "after"
  ) => void;
};

type ThemeConfig = {
  shell: string;
  page: string;
  card: string;
  border: string;
  accent: string;
  subtle: string;
  textSubtle: string;
};

type PageColorTokens = {
  text: string;
  muted: string;
  soft: string;
  faint: string;
  dim: string;
};

const themeMap: Record<EpkBuilderState["template"], ThemeConfig> = {
  metal: {
    shell: "bg-[#050608] text-white",
    page: "border-white/10 bg-[#0a0c0f]",
    card: "border-white/10 bg-white/[0.045]",
    border: "border-white/10",
    accent: "#f25a4c",
    subtle: "from-[#111418] to-[#0a0c0f]",
    textSubtle: "text-white/64"
  },
  hardcore: {
    shell: "bg-[#060507] text-white",
    page: "border-white/10 bg-[#0a090c]",
    card: "border-white/10 bg-white/[0.04]",
    border: "border-white/10",
    accent: "#ff7a59",
    subtle: "from-[#171012] to-[#09090b]",
    textSubtle: "text-white/66"
  },
  booking: {
    shell: "bg-[#07090c] text-white",
    page: "border-white/10 bg-[#0d1117]",
    card: "border-white/10 bg-[#121720]/90",
    border: "border-white/10",
    accent: "#f25a4c",
    subtle: "from-[#15202b] to-[#0b1017]",
    textSubtle: "text-white/64"
  },
  minimal: {
    shell: "bg-[#070809] text-white",
    page: "border-white/10 bg-[#0b0d10]",
    card: "border-white/10 bg-white/[0.035]",
    border: "border-white/10",
    accent: "#f25a4c",
    subtle: "from-[#111214] to-[#0b0d10]",
    textSubtle: "text-white/62"
  },
  light: {
    shell: "bg-[#f5f1eb] text-[#0e0f10]",
    page: "border-black/10 bg-white",
    card: "border-black/10 bg-[#f7f4ef]",
    border: "border-black/10",
    accent: "#d55849",
    subtle: "from-[#f6f0e8] to-white",
    textSubtle: "text-black/56"
  }
};

function formatShowDate(value: string, locale: Locale) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(timestamp));
}

function resolveBandName(profile: EpkProfile, workspaceName: string) {
  return profile.bandName.trim() || workspaceName;
}

function resolveLogo(profile: EpkProfile, workspaceLogo: string) {
  return profile.logoUrl?.trim() || workspaceLogo;
}

function resolveStats(profile: EpkProfile) {
  return [
    {
      label: "Instagram",
      value: profile.instagramFollowers
    },
    {
      label: "Spotify",
      value: profile.spotifyMonthlyListeners
    },
    {
      label: "Streams",
      value: profile.streamCount
    },
    {
      label: "YouTube",
      value: profile.youtubeViews
    }
  ].filter((item) => typeof item.value === "number" && item.value > 0) as Array<{
    label: string;
    value: number;
  }>;
}

function resolveGalleryImages(profile: EpkProfile) {
  return [
    profile.heroImageUrl,
    profile.liveImageUrl,
    profile.detailImageUrl,
    profile.closingImageUrl,
    profile.supportImageUrl
  ].filter(Boolean) as string[];
}

function resolveSocialRows(profile: EpkProfile) {
  return [
    { label: "Instagram", href: profile.instagramUrl.trim() },
    { label: "Facebook", href: profile.facebookUrl.trim() },
    { label: "Spotify", href: profile.spotifyUrl.trim() },
    { label: "YouTube", href: profile.youtubeUrl.trim() },
    { label: "TikTok", href: profile.tiktokUrl.trim() }
  ].filter((item) => item.href);
}

function optionalText(value?: string | null) {
  const normalizedValue = value?.trim() ?? "";
  return normalizedValue.length ? normalizedValue : null;
}

function resolveUpcomingShows(shows: ImportedShowFolder[]) {
  return shows
    .filter((show) => Boolean(show.date.trim()))
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
    .slice(0, 8);
}

function resolveDownloads(
  profile: EpkProfile,
  uploadedDocuments: UploadedDocumentEntry[]
) {
  const documentRows = uploadedDocuments.map((entry) => ({
    id: entry.id,
    label: entry.name,
    href: entry.previewUrl,
    meta: entry.category
  }));
  const assetRows = profile.assetList.map((asset, index) => ({
    id: `asset-${index}`,
    label: asset,
    href: null as string | null,
    meta: "Asset"
  }));

  return [...documentRows, ...assetRows];
}

function backgroundStyle(page: EpkBuilderPage) {
  if (page.background.mode === "solid") {
    return {
      backgroundColor: page.background.primaryColor
    };
  }

  if (page.background.mode === "image" && page.background.imageUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(0,0,0,${page.background.overlayOpacity}), rgba(0,0,0,0.78)), url(${page.background.imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    };
  }

  return {
    backgroundImage: `radial-gradient(circle at top left, rgba(242,90,76,${Math.max(
      0.12,
      page.background.overlayOpacity / 2
    )}), transparent 28%), linear-gradient(135deg, ${page.background.primaryColor}, ${page.background.secondaryColor})`
  };
}

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  const normalizedValue = value?.trim() ?? "";
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalizedValue) ? normalizedValue : fallback;
}

function colorWithAlpha(hex: string, alpha: number) {
  const safeHex = normalizeHexColor(hex, "#f5f2ee").replace("#", "");
  const expandedHex =
    safeHex.length === 3
      ? safeHex
          .split("")
          .map((token) => `${token}${token}`)
          .join("")
      : safeHex;

  const red = Number.parseInt(expandedHex.slice(0, 2), 16);
  const green = Number.parseInt(expandedHex.slice(2, 4), 16);
  const blue = Number.parseInt(expandedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function resolvePageColors(page: EpkBuilderPage, theme: ThemeConfig): PageColorTokens {
  const fallbackTextColor = theme.page.includes("bg-white") ? "#111111" : "#f5f2ee";
  const text = normalizeHexColor(page.background.textColor, fallbackTextColor);

  return {
    text,
    muted: colorWithAlpha(text, 0.86),
    soft: colorWithAlpha(text, 0.72),
    faint: colorWithAlpha(text, 0.58),
    dim: colorWithAlpha(text, 0.42)
  };
}

function buildPageHref(siteSlug: string, page: EpkBuilderPage) {
  const slug = createPublishedEpkSlug(siteSlug);
  return page.slug ? `/epk/${slug}/${page.slug}` : `/epk/${slug}`;
}

function renderMetricValue(value: number) {
  return formatCompactNumber(value).toUpperCase();
}

function blockSpacing(height: EpkBuilderBlock["height"]) {
  switch (height) {
    case "sm":
      return "py-5";
    case "lg":
      return "py-12";
    default:
      return "py-8";
  }
}

function sectionTitle(
  theme: ThemeConfig,
  block: EpkBuilderBlock,
  locale: Locale,
  pageColors: PageColorTokens
) {
  if (!block.title && !block.subtitle) {
    return null;
  }

  return (
    <div className="mb-6 space-y-2">
      {block.title ? (
        <h2 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">
          {block.title}
        </h2>
      ) : null}
      {block.subtitle ? (
        <p className="max-w-3xl text-sm leading-7 sm:text-base" style={{ color: pageColors.soft }}>
          {block.subtitle}
        </p>
      ) : null}
      {!block.title && !block.subtitle ? (
        <span className="sr-only">{t(locale, "Bloc EPK", "EPK block")}</span>
      ) : null}
    </div>
  );
}

function HeaderBlock({
  locale,
  theme,
  pageColors,
  bandName,
  logo,
  pages,
  page,
  mode,
  siteSlug,
  onSelectPage
}: {
  locale: Locale;
  theme: ThemeConfig;
  pageColors: PageColorTokens;
  bandName: string;
  logo: string;
  pages: EpkBuilderPage[];
  page: EpkBuilderPage;
  mode: "editor" | "published" | "print";
  siteSlug: string;
  onSelectPage?: (pageId: string) => void;
}) {
  const resolvedBandName = optionalText(bandName) || t(locale, "Nom du groupe", "Band name");

  return (
    <div className="flex flex-col gap-5 rounded-[32px] border border-white/10 bg-black/20 px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white">
          <img src={logo} alt={resolvedBandName} className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.34em]" style={{ color: pageColors.faint }}>
            {t(locale, "BandOS EPK", "BandOS EPK")}
          </p>
          <p className="text-lg font-semibold tracking-tight">{resolvedBandName}</p>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2">
        {pages.map((entry) => {
          const active = page.id === entry.id;
          const classes = cn(
            "inline-flex items-center rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.22em] transition",
            active
              ? "border-transparent bg-white text-black"
              : "border-white/12 bg-white/[0.04] hover:bg-white/[0.09]"
          );

          if (mode === "published") {
            return (
              <Link
                key={entry.id}
                href={buildPageHref(siteSlug, entry)}
                className={classes}
                style={active ? undefined : { color: pageColors.soft }}
              >
                {entry.title}
              </Link>
            );
          }

          return (
            <button
              key={entry.id}
              type="button"
              className={classes}
              style={active ? undefined : { color: pageColors.soft }}
              onClick={() => onSelectPage?.(entry.id)}
            >
              {entry.title}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function EpkBlockWrapper({
  children,
  pageId,
  block,
  mode,
  theme,
  selected,
  onSelectBlock,
  onMoveBlock
}: {
  children: React.ReactNode;
  pageId: string;
  block: EpkBuilderBlock;
  mode: "editor" | "published" | "print";
  theme: ThemeConfig;
  selected: boolean;
  onSelectBlock?: (pageId: string, blockId: string) => void;
  onMoveBlock?: (
    pageId: string,
    draggedBlockId: string,
    targetBlockId: string,
    placement?: "before" | "after"
  ) => void;
}) {
  const interactive = mode === "editor";

  return (
    <div
      draggable={interactive && !block.locked}
      onDragStart={(event) => {
        if (!interactive) {
          return;
        }

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(
          "application/json",
          JSON.stringify({ pageId, blockId: block.id })
        );
      }}
      onDragOver={(event) => {
        if (interactive) {
          event.preventDefault();
        }
      }}
      onDrop={(event) => {
        if (!interactive) {
          return;
        }

        event.preventDefault();

        try {
          const rawPayload = event.dataTransfer.getData("application/json");
          const payload = JSON.parse(rawPayload) as {
            pageId: string;
            blockId: string;
          };
          const rect = event.currentTarget.getBoundingClientRect();
          const placement =
            event.clientY >= rect.top + rect.height / 2 ? "after" : "before";

          if (payload.blockId && payload.blockId !== block.id && payload.pageId === pageId) {
            onMoveBlock?.(pageId, payload.blockId, block.id, placement);
          }
        } catch {
          // noop
        }
      }}
      onClick={() => onSelectBlock?.(pageId, block.id)}
      className={cn(
        "group relative rounded-[28px] border transition",
        block.visible ? theme.border : "border-dashed border-white/20 opacity-55",
        selected && interactive
          ? "border-coral-400/70 ring-1 ring-coral-400/40"
          : "",
        interactive ? "cursor-pointer" : "cursor-default"
      )}
    >
      {interactive ? (
        <div className="pointer-events-none absolute right-4 top-4 z-10 flex gap-2 opacity-0 transition group-hover:opacity-100">
          {block.locked ? (
            <span className="rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Lock
            </span>
          ) : null}
          {!block.visible ? (
            <span className="rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Hidden
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function BlockRenderer({
  locale,
  profile,
  page,
  block,
  theme,
  workspaceName,
  workspaceLogo,
  importedShowFolders,
  uploadedDocuments,
  mode,
  previewDeviceMode,
  pageId,
  siteSlug,
  pages,
  selected,
  onSelectPage,
  onSelectBlock,
  onMoveBlock
}: {
  locale: Locale;
  profile: EpkProfile;
  page: EpkBuilderPage;
  block: EpkBuilderBlock;
  theme: ThemeConfig;
  workspaceName: string;
  workspaceLogo: string;
  importedShowFolders: ImportedShowFolder[];
  uploadedDocuments: UploadedDocumentEntry[];
  mode: "editor" | "published" | "print";
  previewDeviceMode?: EpkBuilderDeviceMode;
  pageId: string;
  siteSlug: string;
  pages: EpkBuilderPage[];
  selected: boolean;
  onSelectPage?: (pageId: string) => void;
  onSelectBlock?: (pageId: string, blockId: string) => void;
  onMoveBlock?: (pageId: string, draggedBlockId: string, targetBlockId: string) => void;
}) {
  const bandName = resolveBandName(profile, workspaceName);
  const logo = resolveLogo(profile, workspaceLogo);
  const stats = resolveStats(profile);
  const galleryImages = resolveGalleryImages(profile);
  const socials = resolveSocialRows(profile);
  const shows = resolveUpcomingShows(importedShowFolders).slice(0, block.itemsLimit ?? 8);
  const downloads = resolveDownloads(profile, uploadedDocuments);
  const effectiveAccent = block.accent || theme.accent;
  const pageColors = resolvePageColors(page, theme);
  const galleryBlockImages = galleryImages.length
    ? galleryImages
    : [block.imageUrl].filter((image): image is string => Boolean(image));
  const heroGenre = optionalText(profile.genre);
  const heroBody = optionalText(block.title) || optionalText(profile.bio);
  const heroOrigin = optionalText(profile.origin);
  const heroFoundedYear = optionalText(profile.foundedYear);
  const heroEmail = optionalText(profile.contactEmail);
  const contactEmail = optionalText(profile.contactEmail);
  const contactPhone = optionalText(profile.contactPhone);
  const contactWebsite = optionalText(profile.website);
  const wrapperClassName = cn(
    "overflow-hidden",
    block.type === "divider" || block.type === "spacer" ? "border-transparent bg-transparent" : theme.card
  );

  if (mode === "editor" && block.desktopOnly && previewDeviceMode && previewDeviceMode !== "desktop") {
    return null;
  }

  if (mode === "editor" && block.mobileHidden && previewDeviceMode === "mobile") {
    return null;
  }

  return (
    <EpkBlockWrapper
      pageId={pageId}
      block={block}
      mode={mode}
      theme={theme}
      selected={selected}
      onSelectBlock={onSelectBlock}
      onMoveBlock={onMoveBlock}
    >
      {block.type === "header" ? (
        <div className={wrapperClassName}>
          <HeaderBlock
            locale={locale}
            theme={theme}
            pageColors={pageColors}
            bandName={bandName}
            logo={logo}
            pages={pages}
            page={page}
            mode={mode}
            siteSlug={siteSlug}
            onSelectPage={onSelectPage}
          />
        </div>
      ) : null}

      {block.type === "hero" ? (
        <section
          className={cn(
            wrapperClassName,
            "grid gap-8 p-6 sm:p-8 lg:p-10",
            block.layout === "split" ? "lg:grid-cols-[1.12fr_0.88fr]" : ""
          )}
        >
          <div className="flex flex-col justify-between gap-8">
            <div className="space-y-5">
              {heroGenre ? (
                <p className="text-[0.72rem] uppercase tracking-[0.36em]" style={{ color: pageColors.faint }}>
                  {heroGenre}
                </p>
              ) : null}
              <div className="space-y-4">
                <h1 className="max-w-[12ch] text-4xl font-semibold leading-[0.92] tracking-[-0.05em] sm:text-6xl">
                  {bandName}
                </h1>
                {heroBody ? (
                  <p className="max-w-2xl text-base leading-8" style={{ color: pageColors.soft }}>
                    {heroBody}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {block.ctaLabel ? (
                  <a
                    href={block.ctaHref || "#contact"}
                    className="inline-flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-card"
                    style={{ backgroundColor: effectiveAccent }}
                  >
                    {block.ctaLabel}
                  </a>
                ) : null}
                {profile.website.trim() ? (
                  <a
                    href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm"
                    style={{ color: pageColors.muted }}
                  >
                    {t(locale, "Visiter le site", "Visit website")}
                  </a>
                ) : null}
              </div>
            </div>
            {heroOrigin || heroFoundedYear || heroEmail ? (
              <div className="flex flex-wrap gap-5 text-sm" style={{ color: pageColors.faint }}>
                {heroOrigin ? <span>{heroOrigin}</span> : null}
                {heroFoundedYear ? <span>{heroFoundedYear}</span> : null}
                {heroEmail ? <span>{heroEmail}</span> : null}
              </div>
            ) : null}
          </div>
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0d]">
            {block.imageUrl || profile.heroImageUrl || profile.liveImageUrl ? (
              <img
                src={block.imageUrl || profile.heroImageUrl || profile.liveImageUrl || undefined}
                alt={bandName}
                className="h-full min-h-[360px] w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[360px] items-end bg-[radial-gradient(circle_at_top,_rgba(242,90,76,0.22),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-6">
                <p className="max-w-[16rem] text-sm uppercase tracking-[0.3em] text-white/42">
                  {t(locale, "Ajoute ton hero visuel", "Add your hero visual")}
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {block.type === "stats" ? (
        <section className={cn(wrapperClassName, "p-6 sm:p-8")}>
          {sectionTitle(theme, block, locale, pageColors)}
          <div
            className={cn(
              "grid gap-4",
              block.statsStyle === "inline"
                ? "sm:grid-cols-2 xl:grid-cols-4"
                : "sm:grid-cols-2 xl:grid-cols-4"
            )}
          >
            {stats.length ? (
              stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5"
                >
                  <p className="text-3xl font-semibold tracking-tight">
                    {renderMetricValue(item.value)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.26em]" style={{ color: pageColors.faint }}>
                    {item.label}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-black/15 px-5 py-6 text-sm text-white/62">
                {t(locale, "Ajoute des stats dans le panneau de droite.", "Add stats from the right-side panel.")}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {block.type === "bio" ? (
        <section
          className={cn(
            wrapperClassName,
            "grid gap-8 p-6 sm:p-8",
            block.layout === "split" ? "lg:grid-cols-[1fr_0.85fr]" : ""
          )}
        >
          <div>
            {sectionTitle(theme, block, locale, pageColors)}
            <div className="max-w-3xl space-y-4 text-sm leading-8 sm:text-base" style={{ color: pageColors.soft }}>
              {(block.body || profile.bio)
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
                ))}
            </div>
          </div>
          {block.layout === "split" ? (
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0c0f]">
              {block.imageUrl || profile.detailImageUrl || profile.liveImageUrl ? (
                <img
                  src={block.imageUrl || profile.detailImageUrl || profile.liveImageUrl || undefined}
                  alt={bandName}
                  className="h-full min-h-[320px] w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[320px] items-end bg-[radial-gradient(circle_at_top,_rgba(242,90,76,0.2),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-6 text-sm uppercase tracking-[0.28em] text-white/42">
                  {t(locale, "Ajoute un second visuel", "Add a secondary visual")}
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {block.type === "members" ? (
        <section className={cn(wrapperClassName, "p-6 sm:p-8")}>
          {sectionTitle(theme, block, locale, pageColors)}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {profile.members.length ? (
              profile.members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5"
                >
                  {member.name ? (
                    <p className="text-lg font-semibold tracking-tight">{member.name}</p>
                  ) : null}
                  {member.role ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.28em]" style={{ color: pageColors.faint }}>
                      {member.role}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-black/15 px-5 py-6 text-sm text-white/62">
                {t(locale, "Ajoute ton line-up dans le panneau de droite.", "Add your lineup from the right-side panel.")}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {block.type === "releases" ? (
        <section className={cn(wrapperClassName, "p-6 sm:p-8")}>
          {sectionTitle(theme, block, locale, pageColors)}
          <div className="space-y-4">
            {profile.releases.length ? (
              profile.releases.map((release) => (
                <div
                  key={release.id}
                  className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 px-5 py-5 sm:grid-cols-[120px_1fr_auto]"
                >
                  <div className="text-sm uppercase tracking-[0.24em]" style={{ color: pageColors.faint }}>
                    {release.year || "----"}
                  </div>
                  <div>
                    {release.title ? (
                      <p className="text-lg font-semibold">{release.title}</p>
                    ) : null}
                    {release.format ? (
                      <p className="mt-1 text-sm" style={{ color: pageColors.faint }}>{release.format}</p>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-black/15 px-5 py-6 text-sm text-white/62">
                {t(locale, "Ajoute au moins une release.", "Add at least one release.")}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {block.type === "quotes" ? (
        <section className={cn(wrapperClassName, "p-6 sm:p-8")}>
          {sectionTitle(theme, block, locale, pageColors)}
          <div className="grid gap-4 xl:grid-cols-3">
            {profile.pressQuotes.length ? (
              profile.pressQuotes.slice(0, block.itemsLimit ?? 3).map((quote) => (
                <div
                  key={quote.id}
                  className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5"
                >
                  {quote.quote ? (
                    <p className="text-sm leading-7" style={{ color: pageColors.muted }}>“{quote.quote}”</p>
                  ) : null}
                  {quote.source ? (
                    <p className="mt-4 text-xs uppercase tracking-[0.26em]" style={{ color: pageColors.faint }}>
                      {quote.source}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-black/15 px-5 py-6 text-sm text-white/62">
                {t(locale, "Ajoute des reviews et citations presse.", "Add reviews and press quotes.")}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {block.type === "gallery" ? (
        <section className={cn(wrapperClassName, "p-6 sm:p-8")}>
          {sectionTitle(theme, block, locale, pageColors)}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {galleryBlockImages.length ? (
              galleryBlockImages
                .slice(0, block.itemsLimit ?? 4)
                .map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20"
                  >
                    <img
                      src={image}
                      alt={`${bandName} media ${index + 1}`}
                      className="h-56 w-full object-cover"
                    />
                  </div>
                ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-black/15 px-5 py-6 text-sm text-white/62">
                {t(locale, "Ajoute des visuels promo ou live.", "Add promo or live visuals.")}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {block.type === "shows" ? (
        <section className={cn(wrapperClassName, "p-6 sm:p-8")}>
          {sectionTitle(theme, block, locale, pageColors)}
          <div className="space-y-3">
            {shows.length ? (
              shows.map((show) => (
                <div
                  key={show.id}
                  className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 px-5 py-5 sm:grid-cols-[190px_1fr_auto]"
                >
                  <div className="text-sm uppercase tracking-[0.22em]" style={{ color: pageColors.faint }}>
                    {formatShowDate(show.date, locale)}
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{show.venue}</p>
                    <p className="mt-1 text-sm" style={{ color: pageColors.faint }}>
                      {[show.city, show.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="text-sm" style={{ color: pageColors.faint }}>
                    {show.validated
                      ? t(locale, "Date validee", "Validated")
                      : t(locale, "A confirmer", "To confirm")}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-black/15 px-5 py-6 text-sm text-white/62">
                {t(locale, "Importe tes dates BandOS pour les afficher ici.", "Import your BandOS shows to display them here.")}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {block.type === "downloads" ? (
        <section className={cn(wrapperClassName, "p-6 sm:p-8")}>
          {sectionTitle(theme, block, locale, pageColors)}
          <div className="grid gap-4 sm:grid-cols-2">
            {downloads.length ? (
              downloads.slice(0, block.itemsLimit ?? downloads.length).map((item) => {
                const content = (
                  <>
                    <p className="text-base font-semibold">{item.label}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.26em]" style={{ color: pageColors.faint }}>
                      {item.meta}
                    </p>
                  </>
                );

                if (item.href) {
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5 transition hover:bg-black/30"
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5"
                  >
                    {content}
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-black/15 px-5 py-6 text-sm text-white/62">
                {t(locale, "Ajoute des assets et documents a telecharger.", "Add assets and downloadable documents.")}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {block.type === "contact" ? (
        <section className={cn(wrapperClassName, "p-6 sm:p-8")} id="contact">
          {sectionTitle(theme, block, locale, pageColors)}
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4 rounded-[24px] border border-white/10 bg-black/20 px-5 py-5">
              {contactEmail ? (
                <div>
                  <p className="text-sm uppercase tracking-[0.28em]" style={{ color: pageColors.faint }}>
                    {t(locale, "Email", "Email")}
                  </p>
                  <p className="mt-2 text-lg font-semibold">{contactEmail}</p>
                </div>
              ) : null}
              {contactPhone ? (
                <div>
                  <p className="text-sm uppercase tracking-[0.28em]" style={{ color: pageColors.faint }}>
                    {t(locale, "Telephone", "Phone")}
                  </p>
                  <p className="mt-2 text-lg font-semibold">{contactPhone}</p>
                </div>
              ) : null}
              {contactWebsite ? (
                <div>
                  <p className="text-sm uppercase tracking-[0.28em]" style={{ color: pageColors.faint }}>
                    {t(locale, "Site", "Website")}
                  </p>
                  <p className="mt-2 text-lg font-semibold">{contactWebsite}</p>
                </div>
              ) : null}
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5">
              <p className="text-sm uppercase tracking-[0.28em]" style={{ color: pageColors.faint }}>
                {t(locale, "Reseaux", "Socials")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {socials.length ? (
                  socials.map((social) => (
                    <a
                      key={social.label}
                      href={social.href.startsWith("http") ? social.href : `https://${social.href}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-[0.22em]"
                      style={{ color: pageColors.muted }}
                    >
                      {social.label}
                    </a>
                  ))
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {block.type === "support" ? (
        <section
          className={cn(
            wrapperClassName,
            "grid gap-8 p-6 sm:p-8",
            block.layout === "split" ? "lg:grid-cols-[0.95fr_1.05fr]" : ""
          )}
        >
          <div>
            {sectionTitle(
              theme,
              {
                ...block,
                title: block.title || profile.supportTitle,
                subtitle: block.subtitle || profile.supportSubtitle
              },
              locale,
              pageColors
            )}
            {block.body ? <p className="max-w-2xl text-sm leading-7" style={{ color: pageColors.soft }}>{block.body}</p> : null}
          </div>
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
            {block.imageUrl || profile.supportImageUrl ? (
              <img
                src={block.imageUrl || profile.supportImageUrl || undefined}
                alt={`${bandName} support`}
                className="h-full min-h-[280px] w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center px-6 text-center text-sm uppercase tracking-[0.28em] text-white/44">
                {t(locale, "Ajoute un visuel support ou partenaire", "Add a support or partner visual")}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {block.type === "callout" ? (
        <section className={cn(wrapperClassName, "p-6 sm:p-8")}>
          <div
            className="rounded-[28px] border px-6 py-8 sm:px-8"
            style={{
              borderColor: `${effectiveAccent}4a`,
              background: `linear-gradient(135deg, ${effectiveAccent}18, rgba(255,255,255,0.03))`
            }}
          >
            {sectionTitle(theme, block, locale, pageColors)}
            <p className="max-w-3xl text-sm leading-8" style={{ color: pageColors.muted }}>
              {block.body || t(locale, "Ajoute ici un argument booking, festival ou campagne.", "Add a booking, festival or campaign angle here.")}
            </p>
          </div>
        </section>
      ) : null}

      {block.type === "divider" ? (
        <div className="px-6 py-4 sm:px-8">
          <div className="h-px w-full bg-white/10" />
        </div>
      ) : null}

      {block.type === "spacer" ? (
        <div
          className={cn(
            "w-full",
            block.height === "sm"
              ? "h-6"
              : block.height === "lg"
                ? "h-20"
                : "h-12"
          )}
        />
      ) : null}
    </EpkBlockWrapper>
  );
}

export function EpkBuilderRenderer({
  locale,
  profile,
  builder,
  workspaceName,
  workspaceLogo,
  importedShowFolders = [],
  uploadedDocuments = [],
  mode = "editor",
  previewDeviceMode,
  activePageId,
  activePageSlug,
  selectedBlockId = null,
  siteSlug,
  onSelectPage,
  onSelectBlock,
  onMoveBlock
}: EpkBuilderRendererProps) {
  const theme = themeMap[builder.template];
  const normalizedSiteSlug =
    siteSlug || createPublishedEpkSlug(builder.publishedSlug || profile.bandName || workspaceName);
  const activePage =
    (activePageSlug
      ? builder.pages.find((page) => page.slug === activePageSlug)
      : null) ||
    (activePageId
      ? builder.pages.find((page) => page.id === activePageId)
      : null) ||
    builder.pages.find((page) => page.id === builder.selectedPageId) ||
    builder.pages[0] ||
    null;
  const pagesToRender =
    mode === "print" ? builder.pages : activePage ? [activePage] : [];

  return (
    <div className={cn("rounded-[36px]", theme.shell)}>
      {pagesToRender.map((page) => (
        <section
          key={page.id}
          data-epk-print-page={mode === "print" ? "true" : undefined}
          className={cn(
            "relative overflow-hidden rounded-[36px] border shadow-card",
            theme.page,
            mode === "print" ? "mx-auto mb-6 h-[210mm] w-full max-w-[297mm] print:mb-0" : ""
          )}
          style={{
            ...backgroundStyle(page),
            color: resolvePageColors(page, theme).text
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_20%)]" />
          <div className="relative space-y-5 p-4 sm:p-6 lg:p-8">
            {mode !== "print" ? (
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p
                    className="text-[0.72rem] uppercase tracking-[0.34em]"
                    style={{ color: resolvePageColors(page, theme).faint }}
                  >
                    {page.pageType}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                    {page.title}
                  </h2>
                  {page.description ? (
                    <p className="mt-2 text-sm" style={{ color: resolvePageColors(page, theme).soft }}>
                      {page.description}
                    </p>
                  ) : null}
                </div>
                {mode === "editor" ? (
                  <div
                    className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[0.68rem] uppercase tracking-[0.28em]"
                    style={{ color: resolvePageColors(page, theme).soft }}
                  >
                    {page.blocks.filter((block) => block.visible).length} visible
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={cn("space-y-4", blockSpacing("md"))}>
              {page.blocks.filter((block) => block.visible || mode === "editor").length ? (
                page.blocks
                  .filter((block) => block.visible || mode === "editor")
                  .map((block) => (
                    <BlockRenderer
                      key={block.id}
                      locale={locale}
                      profile={profile}
                      page={page}
                      block={block}
                      theme={theme}
                      workspaceName={workspaceName}
                      workspaceLogo={workspaceLogo}
                      importedShowFolders={importedShowFolders}
                      uploadedDocuments={uploadedDocuments}
                      mode={mode}
                      previewDeviceMode={previewDeviceMode}
                      pageId={page.id}
                      siteSlug={normalizedSiteSlug}
                      pages={builder.pages}
                      selected={selectedBlockId === block.id}
                      onSelectPage={onSelectPage}
                      onSelectBlock={onSelectBlock}
                      onMoveBlock={onMoveBlock}
                    />
                  ))
              ) : (
                <div className="rounded-[28px] border border-dashed border-white/12 bg-black/15 px-6 py-10 text-center text-sm text-white/60">
                  {t(locale, "Cette page est vide. Ajoute un bloc depuis la bibliotheque.", "This page is empty. Add a block from the library.")}
                </div>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
