export type EpkBuilderDeviceMode = "desktop" | "tablet" | "mobile";

export type EpkBuilderTemplate =
  | "minimal"
  | "metal"
  | "hardcore"
  | "booking"
  | "light";

export type EpkBuilderBlockType =
  | "header"
  | "hero"
  | "stats"
  | "bio"
  | "members"
  | "releases"
  | "quotes"
  | "gallery"
  | "shows"
  | "downloads"
  | "contact"
  | "support"
  | "callout"
  | "divider"
  | "spacer";

export type EpkBuilderPageType =
  | "home"
  | "epk"
  | "live"
  | "media"
  | "discography"
  | "merch"
  | "contact"
  | "downloads"
  | "custom";

export type EpkBuilderLayout = "contained" | "full" | "split";
export type EpkBuilderAlign = "left" | "center";
export type EpkBuilderHeight = "sm" | "md" | "lg";

export type EpkBuilderBackground = {
  mode: "gradient" | "image" | "solid";
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  imageUrl: string | null;
  overlayOpacity: number;
};

export type EpkBuilderBlock = {
  id: string;
  type: EpkBuilderBlockType;
  title: string;
  subtitle: string;
  body: string;
  visible: boolean;
  locked: boolean;
  favorite: boolean;
  layout: EpkBuilderLayout;
  align: EpkBuilderAlign;
  height: EpkBuilderHeight;
  accent: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  ctaHref: string;
  statsStyle: "grid" | "inline";
  itemsLimit: number | null;
  desktopOnly: boolean;
  mobileHidden: boolean;
};

export type EpkBuilderPage = {
  id: string;
  title: string;
  slug: string;
  pageType: EpkBuilderPageType;
  description: string;
  background: EpkBuilderBackground;
  blocks: EpkBuilderBlock[];
};

export type EpkBuilderState = {
  selectedPageId: string;
  selectedBlockId: string | null;
  deviceMode: EpkBuilderDeviceMode;
  template: EpkBuilderTemplate;
  published: boolean;
  publishedSlug: string;
  favoriteBlockTypes: EpkBuilderBlockType[];
  recentBlockTypes: EpkBuilderBlockType[];
  pages: EpkBuilderPage[];
};

export type EpkBuilderBlockCatalogEntry = {
  type: EpkBuilderBlockType;
  title: string;
  description: string;
  category: "Structure" | "Texte" | "Media" | "Live" | "Contact";
};

export const epkBuilderBlockCatalog: EpkBuilderBlockCatalogEntry[] = [
  {
    type: "header",
    title: "Header",
    description: "Navigation de l’EPK et lien contact.",
    category: "Structure"
  },
  {
    type: "hero",
    title: "Hero",
    description: "Visuel principal, branding et CTA.",
    category: "Structure"
  },
  {
    type: "stats",
    title: "Stats",
    description: "Streaming, reseaux, traction.",
    category: "Texte"
  },
  {
    type: "bio",
    title: "Bio",
    description: "Storytelling et positionnement.",
    category: "Texte"
  },
  {
    type: "members",
    title: "Members",
    description: "Line-up officiel.",
    category: "Texte"
  },
  {
    type: "releases",
    title: "Discography",
    description: "Albums, EP et singles.",
    category: "Texte"
  },
  {
    type: "quotes",
    title: "Press Quotes",
    description: "Reviews, coverage et citations.",
    category: "Texte"
  },
  {
    type: "gallery",
    title: "Gallery",
    description: "Photos promo et live.",
    category: "Media"
  },
  {
    type: "shows",
    title: "Upcoming Shows",
    description: "Dates a venir synchronisees depuis BandOS.",
    category: "Live"
  },
  {
    type: "downloads",
    title: "Downloads",
    description: "Assets, logos, riders et docs.",
    category: "Contact"
  },
  {
    type: "contact",
    title: "Contact",
    description: "Booking, management, socials.",
    category: "Contact"
  },
  {
    type: "support",
    title: "Support",
    description: "Campagne, partenaire ou angle promo.",
    category: "Media"
  },
  {
    type: "callout",
    title: "Callout",
    description: "Bloc editorial libre a fort impact.",
    category: "Texte"
  },
  {
    type: "divider",
    title: "Divider",
    description: "Separation visuelle fine.",
    category: "Structure"
  },
  {
    type: "spacer",
    title: "Spacer",
    description: "Respiration et rythme vertical.",
    category: "Structure"
  }
];

function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeTemplate(value?: string | null): EpkBuilderTemplate {
  switch (value) {
    case "minimal":
    case "metal":
    case "hardcore":
    case "booking":
    case "light":
      return value;
    default:
      return "metal";
  }
}

function normalizePageType(value?: string | null): EpkBuilderPageType {
  switch (value) {
    case "home":
    case "epk":
    case "live":
    case "media":
    case "discography":
    case "merch":
    case "contact":
    case "downloads":
    case "custom":
      return value;
    default:
      return "custom";
  }
}

function normalizeBlockType(value?: string | null): EpkBuilderBlockType {
  switch (value) {
    case "header":
    case "hero":
    case "stats":
    case "bio":
    case "members":
    case "releases":
    case "quotes":
    case "gallery":
    case "shows":
    case "downloads":
    case "contact":
    case "support":
    case "callout":
    case "divider":
    case "spacer":
      return value;
    default:
      return "bio";
  }
}

export function normalizeEpkBuilderBackground(
  background?: Partial<EpkBuilderBackground> | null
): EpkBuilderBackground {
  return {
    mode:
      background?.mode === "solid" ||
      background?.mode === "image" ||
      background?.mode === "gradient"
        ? background.mode
        : "gradient",
    primaryColor: background?.primaryColor?.trim() || "#0a0b0d",
    secondaryColor: background?.secondaryColor?.trim() || "#23120f",
    textColor: background?.textColor?.trim() || "#f5f2ee",
    imageUrl: background?.imageUrl?.trim() || null,
    overlayOpacity:
      typeof background?.overlayOpacity === "number"
        ? Math.min(0.96, Math.max(0, background.overlayOpacity))
        : 0.42
  };
}

function getBlockPreset(type: EpkBuilderBlockType): Omit<EpkBuilderBlock, "id"> {
  switch (type) {
    case "header":
      return {
        type,
        title: "Navigation",
        subtitle: "Liens rapides",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "full",
        align: "left",
        height: "sm",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "Contact",
        ctaHref: "#contact",
        statsStyle: "inline",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
    case "hero":
      return {
        type,
        title: "Run your band like a real touring operation.",
        subtitle: "Headline, support, festival or label-ready EPK.",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "split",
        align: "left",
        height: "lg",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "Booking",
        ctaHref: "#contact",
        statsStyle: "grid",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
    case "stats":
      return {
        type,
        title: "Metrics",
        subtitle: "Streaming, socials and traction",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "contained",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "grid",
        itemsLimit: 4,
        desktopOnly: false,
        mobileHidden: false
      };
    case "bio":
      return {
        type,
        title: "Bio",
        subtitle: "Positioning and story",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "split",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
    case "members":
      return {
        type,
        title: "Line-up",
        subtitle: "Official members",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "contained",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
    case "releases":
      return {
        type,
        title: "Discography",
        subtitle: "Latest releases",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "contained",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
    case "quotes":
      return {
        type,
        title: "Press",
        subtitle: "Selected coverage and reviews",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "contained",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: 3,
        desktopOnly: false,
        mobileHidden: false
      };
    case "gallery":
      return {
        type,
        title: "Media",
        subtitle: "Live and promo visuals",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "full",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: 4,
        desktopOnly: false,
        mobileHidden: false
      };
    case "shows":
      return {
        type,
        title: "Live",
        subtitle: "Upcoming dates",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "contained",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: 6,
        desktopOnly: false,
        mobileHidden: false
      };
    case "downloads":
      return {
        type,
        title: "Downloads",
        subtitle: "Assets and documents",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "contained",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
    case "contact":
      return {
        type,
        title: "Contact",
        subtitle: "Booking, management and socials",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "contained",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "Email",
        ctaHref: "mailto:",
        statsStyle: "inline",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
    case "support":
      return {
        type,
        title: "Campaign",
        subtitle: "Partner or support message",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "split",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
    case "callout":
      return {
        type,
        title: "Callout",
        subtitle: "Custom highlighted section",
        body: "Use this block for a booking angle, a release push or a key announcement.",
        visible: true,
        locked: false,
        favorite: false,
        layout: "contained",
        align: "left",
        height: "md",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
    case "divider":
      return {
        type,
        title: "",
        subtitle: "",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "full",
        align: "left",
        height: "sm",
        accent: "#f25a4c",
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
    case "spacer":
      return {
        type,
        title: "",
        subtitle: "",
        body: "",
        visible: true,
        locked: false,
        favorite: false,
        layout: "full",
        align: "left",
        height: "md",
        accent: null,
        imageUrl: null,
        ctaLabel: "",
        ctaHref: "",
        statsStyle: "inline",
        itemsLimit: null,
        desktopOnly: false,
        mobileHidden: false
      };
  }
}

export function createEpkBuilderBlock(
  type: EpkBuilderBlockType,
  overrides?: Partial<EpkBuilderBlock>
): EpkBuilderBlock {
  return normalizeEpkBuilderBlock({
    id:
      overrides?.id ||
      `epk-block-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    ...overrides
  });
}

export function normalizeEpkBuilderBlock(
  block: Partial<EpkBuilderBlock> & Pick<EpkBuilderBlock, "id">
): EpkBuilderBlock {
  const type = normalizeBlockType(block.type);
  const preset = getBlockPreset(type);

  return {
    ...preset,
    id: block.id,
    type,
    title: block.title?.trim() ?? preset.title,
    subtitle: block.subtitle?.trim() ?? preset.subtitle,
    body: block.body?.trim() ?? preset.body,
    visible: block.visible ?? preset.visible,
    locked: block.locked ?? preset.locked,
    favorite: block.favorite ?? preset.favorite,
    layout:
      block.layout === "contained" || block.layout === "full" || block.layout === "split"
        ? block.layout
        : preset.layout,
    align:
      block.align === "left" || block.align === "center" ? block.align : preset.align,
    height:
      block.height === "sm" || block.height === "md" || block.height === "lg"
        ? block.height
        : preset.height,
    accent: block.accent?.trim() || preset.accent,
    imageUrl: block.imageUrl?.trim() || null,
    ctaLabel: block.ctaLabel?.trim() ?? preset.ctaLabel,
    ctaHref: block.ctaHref?.trim() ?? preset.ctaHref,
    statsStyle:
      block.statsStyle === "grid" || block.statsStyle === "inline"
        ? block.statsStyle
        : preset.statsStyle,
    itemsLimit:
      typeof block.itemsLimit === "number" && block.itemsLimit > 0
        ? Math.floor(block.itemsLimit)
        : preset.itemsLimit,
    desktopOnly: block.desktopOnly ?? preset.desktopOnly,
    mobileHidden: block.mobileHidden ?? preset.mobileHidden
  };
}

function buildDefaultPages(): EpkBuilderPage[] {
  return [
    {
      id: "epk-page-home",
      title: "Accueil",
      slug: "",
      pageType: "home",
      description: "Landing hero and live snapshot.",
      background: normalizeEpkBuilderBackground({
        mode: "gradient",
        primaryColor: "#08090b",
        secondaryColor: "#2b1511",
        textColor: "#f5f2ee",
        overlayOpacity: 0.45
      }),
      blocks: [
        createEpkBuilderBlock("header", { id: "epk-block-header-home" }),
        createEpkBuilderBlock("hero", { id: "epk-block-hero-home" }),
        createEpkBuilderBlock("stats", { id: "epk-block-stats-home" }),
        createEpkBuilderBlock("shows", { id: "epk-block-shows-home" })
      ]
    },
    {
      id: "epk-page-epk",
      title: "EPK",
      slug: "epk",
      pageType: "epk",
      description: "Story, press and positioning.",
      background: normalizeEpkBuilderBackground({
        mode: "gradient",
        primaryColor: "#09090b",
        secondaryColor: "#16181f",
        textColor: "#f5f2ee",
        overlayOpacity: 0.4
      }),
      blocks: [
        createEpkBuilderBlock("bio", { id: "epk-block-bio" }),
        createEpkBuilderBlock("members", { id: "epk-block-members" }),
        createEpkBuilderBlock("quotes", { id: "epk-block-quotes" })
      ]
    },
    {
      id: "epk-page-live",
      title: "Live",
      slug: "live",
      pageType: "live",
      description: "Live visuals and upcoming dates.",
      background: normalizeEpkBuilderBackground({
        mode: "gradient",
        primaryColor: "#07090b",
        secondaryColor: "#1b1713",
        textColor: "#f5f2ee",
        overlayOpacity: 0.45
      }),
      blocks: [
        createEpkBuilderBlock("gallery", { id: "epk-block-gallery-live" }),
        createEpkBuilderBlock("shows", { id: "epk-block-live-shows" }),
        createEpkBuilderBlock("callout", { id: "epk-block-live-callout" })
      ]
    },
    {
      id: "epk-page-media",
      title: "Media",
      slug: "media",
      pageType: "media",
      description: "Photos, videos and campaign material.",
      background: normalizeEpkBuilderBackground({
        mode: "gradient",
        primaryColor: "#090a0d",
        secondaryColor: "#10151c",
        textColor: "#f5f2ee",
        overlayOpacity: 0.4
      }),
      blocks: [
        createEpkBuilderBlock("gallery", { id: "epk-block-gallery-media" }),
        createEpkBuilderBlock("support", { id: "epk-block-support-media" }),
        createEpkBuilderBlock("downloads", { id: "epk-block-downloads-media" })
      ]
    },
    {
      id: "epk-page-discography",
      title: "Discographie",
      slug: "discography",
      pageType: "discography",
      description: "Releases and stats.",
      background: normalizeEpkBuilderBackground({
        mode: "gradient",
        primaryColor: "#0a0a0c",
        secondaryColor: "#19131b",
        textColor: "#f5f2ee",
        overlayOpacity: 0.42
      }),
      blocks: [
        createEpkBuilderBlock("releases", { id: "epk-block-releases" }),
        createEpkBuilderBlock("stats", { id: "epk-block-discography-stats" })
      ]
    },
    {
      id: "epk-page-contact",
      title: "Contact",
      slug: "contact",
      pageType: "contact",
      description: "Booking and downloads.",
      background: normalizeEpkBuilderBackground({
        mode: "gradient",
        primaryColor: "#09090b",
        secondaryColor: "#23120f",
        textColor: "#f5f2ee",
        overlayOpacity: 0.45
      }),
      blocks: [
        createEpkBuilderBlock("contact", { id: "epk-block-contact" }),
        createEpkBuilderBlock("downloads", { id: "epk-block-downloads" })
      ]
    }
  ];
}

export function createBlankEpkBuilderPage(title: string): EpkBuilderPage {
  const normalizedTitle = title.trim() || "Nouvelle page";

  return {
    id: `epk-page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: normalizedTitle,
    slug: slugifyValue(normalizedTitle),
    pageType: "custom",
    description: "",
    background: normalizeEpkBuilderBackground(),
    blocks: [createEpkBuilderBlock("hero"), createEpkBuilderBlock("contact")]
  };
}

export function buildDefaultEpkBuilder(): EpkBuilderState {
  const pages = buildDefaultPages();

  return {
    selectedPageId: pages[0]?.id ?? "epk-page-home",
    selectedBlockId: pages[0]?.blocks[0]?.id ?? null,
    deviceMode: "desktop",
    template: "metal",
    published: false,
    publishedSlug: "mon-epk",
    favoriteBlockTypes: ["hero", "gallery", "contact"],
    recentBlockTypes: ["hero", "stats", "bio"],
    pages
  };
}

export function normalizeEpkBuilderPage(
  page: Partial<EpkBuilderPage> & Pick<EpkBuilderPage, "id">
): EpkBuilderPage {
  const defaults = buildDefaultPages();
  const fallback = defaults.find((entry) => entry.id === page.id) ?? defaults[0]!;
  const pageType = normalizePageType(page.pageType ?? fallback.pageType);

  return {
    id: page.id,
    title: page.title?.trim() || fallback.title,
    slug:
      typeof page.slug === "string"
        ? slugifyValue(page.slug) || (pageType === "home" ? "" : slugifyValue(fallback.title))
        : fallback.slug,
    pageType,
    description: page.description?.trim() || fallback.description,
    background: normalizeEpkBuilderBackground(page.background ?? fallback.background),
    blocks:
      page.blocks?.map((block) => normalizeEpkBuilderBlock(block)).filter(Boolean) ??
      fallback.blocks
  };
}

export function normalizeEpkBuilder(
  builder?: Partial<EpkBuilderState> | null
): EpkBuilderState {
  const fallback = buildDefaultEpkBuilder();
  const pages =
    builder?.pages?.length
      ? builder.pages.map((page) => normalizeEpkBuilderPage(page)).filter(Boolean)
      : fallback.pages;
  const selectedPageId =
    builder?.selectedPageId && pages.some((page) => page.id === builder.selectedPageId)
      ? builder.selectedPageId
      : pages[0]?.id ?? fallback.selectedPageId;
  const selectedPage =
    pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? fallback.pages[0]!;
  const selectedBlockId =
    builder?.selectedBlockId &&
    selectedPage.blocks.some((block) => block.id === builder.selectedBlockId)
      ? builder.selectedBlockId
      : selectedPage.blocks[0]?.id ?? null;

  return {
    selectedPageId,
    selectedBlockId,
    deviceMode:
      builder?.deviceMode === "desktop" ||
      builder?.deviceMode === "tablet" ||
      builder?.deviceMode === "mobile"
        ? builder.deviceMode
        : fallback.deviceMode,
    template: normalizeTemplate(builder?.template),
    published: builder?.published ?? fallback.published,
    publishedSlug: slugifyValue(builder?.publishedSlug ?? fallback.publishedSlug) || "mon-epk",
    favoriteBlockTypes:
      builder?.favoriteBlockTypes
        ?.map((type) => normalizeBlockType(type))
        .filter((type, index, items) => items.indexOf(type) === index) ??
      fallback.favoriteBlockTypes,
    recentBlockTypes:
      builder?.recentBlockTypes
        ?.map((type) => normalizeBlockType(type))
        .filter((type, index, items) => items.indexOf(type) === index)
        .slice(0, 10) ?? fallback.recentBlockTypes,
    pages
  };
}

export function createPublishedEpkSlug(value: string) {
  return slugifyValue(value) || "mon-epk";
}
