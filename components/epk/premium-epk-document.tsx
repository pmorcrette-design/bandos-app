import { Globe2, Mail, Phone } from "lucide-react";

import { t, type Locale } from "@/lib/i18n";
import { cn, formatCompactNumber } from "@/lib/utils";
import type { EpkProfile } from "@/lib/workspace-data";

type PremiumEpkDocumentProps = {
  locale: Locale;
  profile: EpkProfile;
  workspaceName: string;
  workspaceLogo: string;
  printMode?: boolean;
};

type ResolvedEpkProfile = ReturnType<typeof resolveEpkProfile>;

const accentColor = "#f4af2a";

function formatMetric(value: number | null) {
  if (value === null || value <= 0) {
    return "—";
  }

  const compact = formatCompactNumber(value).toUpperCase();
  return compact.endsWith("+") ? compact : `${compact}+`;
}

function normalizeLink(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getSocialRows(profile: EpkProfile) {
  return [
    { label: "Instagram", value: profile.instagramUrl.trim() },
    { label: "Facebook", value: profile.facebookUrl.trim() },
    { label: "Spotify", value: profile.spotifyUrl.trim() },
    { label: "YouTube", value: profile.youtubeUrl.trim() },
    { label: "TikTok", value: profile.tiktokUrl.trim() }
  ].filter((entry) => entry.value);
}

export function resolveEpkProfile(
  profile: EpkProfile,
  fallback: {
    workspaceName: string;
    workspaceLogo: string;
  }
) {
  const bandName = profile.bandName.trim() || fallback.workspaceName;
  const genre = profile.genre.trim();
  const origin = profile.origin.trim();
  const foundedYear = profile.foundedYear.trim() || "";
  const displayLogo = profile.logoUrl?.trim() || fallback.workspaceLogo;
  const socialRows = getSocialRows(profile);
  const members = profile.members;
  const sharedStageWith = profile.sharedStageWith;
  const releases = profile.releases;
  const pressQuotes = profile.pressQuotes;
  const assetList = profile.assetList;

  return {
    bandName,
    genre,
    origin,
    foundedYear,
    displayLogo,
    bio: profile.bio.trim(),
    members,
    sharedStageWith,
    releases,
    pressQuotes,
    assetList,
    supportTitle: profile.supportTitle.trim(),
    supportSubtitle: profile.supportSubtitle.trim(),
    contactPhone: profile.contactPhone.trim(),
    contactEmail: profile.contactEmail.trim(),
    website: profile.website.trim(),
    socialRows,
    heroImageUrl: profile.heroImageUrl?.trim() || null,
    liveImageUrl: profile.liveImageUrl?.trim() || null,
    detailImageUrl: profile.detailImageUrl?.trim() || null,
    closingImageUrl: profile.closingImageUrl?.trim() || null,
    supportImageUrl: profile.supportImageUrl?.trim() || null,
    instagramFollowers: profile.instagramFollowers,
    facebookFollowers: profile.facebookFollowers,
    streamCount: profile.streamCount,
    youtubeViews: profile.youtubeViews,
    spotifyMonthlyListeners: profile.spotifyMonthlyListeners,
    spotifyUrl: profile.spotifyUrl.trim()
  };
}

function VisualTile({
  src,
  alt,
  label,
  className,
  contain = false,
  priorityLogo
}: {
  src: string | null;
  alt: string;
  label: string;
  className?: string;
  contain?: boolean;
  priorityLogo?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#0e0e0f]",
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn(
            "h-full w-full",
            contain ? "object-contain p-8" : "object-cover"
          )}
        />
      ) : priorityLogo ? (
        <img
          src={priorityLogo}
          alt={alt}
          className={cn(
            "h-full w-full opacity-90",
            contain ? "object-contain p-8" : "object-contain p-10"
          )}
        />
      ) : (
        <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_top,_rgba(244,175,42,0.16),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0))] p-6">
          <p className="max-w-[18rem] text-sm uppercase tracking-[0.28em] text-white/45">
            {label}
          </p>
        </div>
      )}
    </div>
  );
}

function MetricGrid({
  profile
}: {
  profile: ResolvedEpkProfile;
}) {
  const metricItems = [
    { value: formatMetric(profile.instagramFollowers), label: "Instagram" },
    { value: formatMetric(profile.facebookFollowers), label: "Facebook" },
    { value: formatMetric(profile.streamCount), label: "Streams" },
    { value: formatMetric(profile.youtubeViews), label: "YouTube views" }
  ];

  return (
    <div
      className="grid h-full grid-cols-2 gap-px bg-black/10 text-black"
      style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
    >
      {metricItems.map((item) => (
        <div key={item.label} className="bg-[#f4af2a] px-9 py-8">
          <p className="text-4xl font-semibold tracking-tight">{item.value}</p>
          <p className="mt-3 text-sm uppercase tracking-[0.24em]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function InfoSection({
  title,
  lines
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-2xl font-semibold uppercase tracking-[0.08em] text-black">
        {title}
      </p>
      <div className="space-y-1 text-[1.05rem] uppercase leading-7 tracking-[0.03em] text-black/92">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function QuoteBlock({
  source,
  quote
}: {
  source: string;
  quote: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-2xl font-semibold uppercase tracking-[0.08em] text-black">
        {source}
      </p>
      <p className="text-[1.05rem] leading-8 text-black/92">“{quote}”</p>
    </div>
  );
}

export function PremiumEpkDocument({
  locale,
  profile,
  workspaceName,
  workspaceLogo,
  printMode = false
}: PremiumEpkDocumentProps) {
  const resolved = resolveEpkProfile(profile, { workspaceName, workspaceLogo });
  const contactRows = [
    {
      icon: Phone,
      value: resolved.contactPhone
    },
    {
      icon: Mail,
      value: resolved.contactEmail
    },
    {
      icon: Globe2,
      value: resolved.website.replace(/^https?:\/\//, "")
    }
  ].filter((entry) => entry.value);

  const bioHeading =
    resolved.bandName.replace(/\s+/g, "").toUpperCase() || resolved.bandName.toUpperCase();
  const foundedLine = [resolved.origin, resolved.foundedYear ? `Since ${resolved.foundedYear}` : ""]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      data-epk-print-root="true"
      className={cn(
        "space-y-6",
        printMode ? "mx-auto w-[297mm]" : "mx-auto w-full max-w-[1280px]"
      )}
    >
      <section
        data-epk-print-page="true"
        className="relative aspect-[297/210] overflow-hidden rounded-[36px] border border-white/10 bg-[#121212] text-white shadow-card"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_12%_0%,rgba(244,175,42,0.18),transparent_28%)]" />
        <div className="absolute -right-[18%] top-[12%] h-[42%] w-[42%] rounded-full border border-white/10 opacity-35" />
        <div className="relative grid h-full grid-rows-[auto_1fr_auto] p-12">
          <div className="max-w-[72%] space-y-7">
            <h1
              className="max-w-[12ch] text-[clamp(3.8rem,8vw,6.4rem)] font-semibold uppercase leading-[0.9] tracking-[-0.06em]"
              style={{ color: accentColor }}
            >
              {resolved.bandName}
            </h1>
            <div className="space-y-2">
              <p className="text-3xl font-semibold uppercase tracking-[-0.03em] text-white">
                {resolved.genre}
              </p>
              {foundedLine ? (
                <p className="text-sm uppercase tracking-[0.32em] text-white/58">
                  {foundedLine}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-10 grid grid-cols-[1.18fr_1fr] gap-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
            <VisualTile
              src={resolved.heroImageUrl}
              alt={`${resolved.bandName} cover`}
              label={t(locale, "Ajoute la photo cover de ton groupe", "Upload your main band photo")}
              priorityLogo={resolved.displayLogo}
            />
            <div className="grid grid-rows-[1fr_auto]">
              <MetricGrid profile={resolved} />
              <div className="flex items-end justify-start bg-[#121212] px-10 py-8">
                <p className="text-6xl font-semibold uppercase tracking-[-0.05em] text-white">
                  Press Kit
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-end justify-between gap-6">
            <div className="space-y-3">
              {contactRows.length ? (
                contactRows.map(({ icon: Icon, value }) => (
                  <div
                    key={value}
                    className="flex items-center gap-3 text-sm uppercase tracking-[0.28em] text-white/78"
                  >
                    <Icon className="h-4 w-4 text-[#f4af2a]" />
                    <span>{value}</span>
                  </div>
                ))
              ) : null}
            </div>
            <div className="flex h-28 w-44 items-center justify-end">
              <img
                src={resolved.displayLogo}
                alt={`${resolved.bandName} logo`}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        data-epk-print-page="true"
        className="overflow-hidden rounded-[36px] border border-white/10 bg-[#121212] text-white shadow-card"
      >
        <div className="grid aspect-[297/210] grid-rows-[0.97fr_0.9fr_0.72fr]">
          <div className="grid grid-cols-[1.25fr_1fr]">
            <VisualTile
              src={resolved.liveImageUrl}
              alt={`${resolved.bandName} live`}
              label={t(locale, "Ajoute une photo live principale", "Upload a main live shot")}
              priorityLogo={resolved.displayLogo}
            />
            <div className="space-y-10 bg-[#f4af2a] px-10 py-10">
              <InfoSection
                title="Line Up"
                lines={resolved.members.map((member) =>
                  [member.name, member.role].filter(Boolean).join(" - ")
                )}
              />
              <InfoSection title="Shared Stage With" lines={resolved.sharedStageWith} />
              <InfoSection
                title="Releases"
                lines={resolved.releases.map((release) =>
                  [release.year, release.title, release.format]
                    .filter(Boolean)
                    .join(" - ")
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-8 bg-[#f4af2a] px-10 py-10">
              <p className="text-4xl font-semibold uppercase tracking-[-0.04em] text-black">
                Press Review
              </p>
              {resolved.pressQuotes.slice(0, 3).map((quote) => (
                <QuoteBlock key={quote.id} source={quote.source} quote={quote.quote} />
              ))}
            </div>
            <VisualTile
              src={resolved.detailImageUrl}
              alt={`${resolved.bandName} detail`}
              label={t(locale, "Ajoute une seconde photo live", "Upload a second live photo")}
              priorityLogo={resolved.displayLogo}
            />
          </div>

          <div className="flex flex-col justify-between bg-[#121212] px-10 pb-10 pt-7 text-center">
            <div className="space-y-5">
              <p className="text-[4.35rem] font-semibold uppercase leading-[0.92] tracking-[-0.08em] text-white">
                {bioHeading}
              </p>
              <p className="mx-auto max-w-[90%] text-[1.15rem] leading-9 text-[#f4af2a]">
                {resolved.bio}
              </p>
            </div>
            <div className="flex items-end justify-between gap-6 pt-7">
              <div className="space-y-2 text-left">
                <p className="text-sm uppercase tracking-[0.28em] text-white/55">
                  Press assets
                </p>
                <div className="space-y-1 text-sm uppercase tracking-[0.18em] text-white/82">
                  {resolved.assetList.slice(0, 4).map((asset) => (
                    <p key={asset}>{asset}</p>
                  ))}
                </div>
              </div>
              <div className="flex h-24 w-36 items-center justify-end">
                <img
                  src={resolved.displayLogo}
                  alt={`${resolved.bandName} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        data-epk-print-page="true"
        className="overflow-hidden rounded-[36px] border border-white/10 bg-[#121212] text-white shadow-card"
      >
        <div className="grid aspect-[297/210] grid-rows-[0.95fr_0.95fr_1fr_auto]">
          <div className="grid grid-cols-[1.25fr_1fr]">
            <VisualTile
              src={resolved.detailImageUrl}
              alt={`${resolved.bandName} portrait`}
              label={t(locale, "Ajoute une photo portrait", "Upload a portrait shot")}
              priorityLogo={resolved.displayLogo}
            />
            <div className="flex flex-col justify-between bg-[#f4af2a] px-10 py-10 text-black">
              <div className="space-y-4">
                <p className="text-3xl font-semibold uppercase tracking-[0.08em]">
                  {resolved.supportTitle}
                </p>
                <p className="text-[1.15rem] leading-8">{resolved.supportSubtitle}</p>
              </div>
              <div className="flex h-40 items-center justify-center rounded-[28px] border border-black/10 bg-black/5 p-6">
                {resolved.supportImageUrl ? (
                  <img
                    src={resolved.supportImageUrl}
                    alt={`${resolved.bandName} support visual`}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <p className="max-w-[16rem] text-center text-sm uppercase tracking-[0.28em] text-black/55">
                    {t(
                      locale,
                      "Ajoute un visuel support, partenaire ou association",
                      "Upload a support, partner, or campaign visual"
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[0.92fr_1.08fr]">
            <div className="flex flex-col justify-between bg-[#f4af2a] px-10 py-10 text-black">
              <div className="flex h-52 items-center justify-center">
                <img
                  src={resolved.displayLogo}
                  alt={`${resolved.bandName} mark`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="space-y-3">
                <p className="text-3xl font-semibold uppercase tracking-[0.08em]">
                  {resolved.origin}
                </p>
                {resolved.foundedYear ? (
                  <p className="text-xl uppercase tracking-[0.18em]">
                    {resolved.foundedYear}
                  </p>
                ) : null}
              </div>
            </div>
            <VisualTile
              src={resolved.closingImageUrl || resolved.heroImageUrl}
              alt={`${resolved.bandName} closing visual`}
              label={t(locale, "Ajoute une photo de scène finale", "Upload a final live photo")}
              priorityLogo={resolved.displayLogo}
            />
          </div>

          <VisualTile
            src={resolved.closingImageUrl || resolved.liveImageUrl || resolved.heroImageUrl}
            alt={`${resolved.bandName} stage`}
            label={t(locale, "Ajoute une photo pleine largeur pour la dernière page", "Upload a full width final image")}
            priorityLogo={resolved.displayLogo}
            className="border-y border-white/10"
          />

          <div className="grid grid-cols-[auto_1fr] gap-8 bg-[#121212] px-10 py-7">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.28em] text-white/55">
                Socials
              </p>
              <div className="space-y-1 text-sm uppercase tracking-[0.18em] text-white/82">
                {resolved.socialRows.length ? (
                  resolved.socialRows.slice(0, 5).map((row) => (
                    <p key={row.label}>
                      {row.label} • {row.value.replace(/^https?:\/\//, "")}
                    </p>
                  ))
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.28em] text-white/55">
                Streaming
              </p>
              <div className="space-y-1 text-sm uppercase tracking-[0.18em] text-white/82">
                <p>Spotify listeners • {formatMetric(resolved.spotifyMonthlyListeners)}</p>
                {resolved.spotifyUrl ? (
                  <p>{normalizeLink(resolved.spotifyUrl).replace(/^https?:\/\//, "")}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
