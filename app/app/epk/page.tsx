import { PlayCircle, RadioTower, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { epkData } from "@/lib/mock-data";
import { getLocalePreference } from "@/lib/preferences";
import { formatCompactNumber } from "@/lib/utils";

export default async function EpkPage() {
  const locale = await getLocalePreference();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="EPK"
        title={t(
          locale,
          "Garde l'histoire et les assets du groupe prêts pour la tournée",
          "Keep your band story and assets tour-ready"
        )}
        description={t(
          locale,
          "Génère une bio propre, une liste des membres, les réseaux, les liens Spotify, les vidéos YouTube, les stats de streaming, les assets presse et les éléments EPK téléchargeables.",
          "Generate a clean band bio, member list, socials, Spotify links, YouTube highlights, streaming stats, press assets, and downloadable EPK materials."
        )}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Bio du groupe", "Band bio")}
          </p>
          <p className="mt-4 text-sm leading-8 text-mist-200">{epkData.bio}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {epkData.members.map((member) => (
              <Badge key={member}>{member}</Badge>
            ))}
          </div>
        </Card>
        <div className="grid gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <RadioTower className="h-5 w-5 text-coral-300" />
              <div>
                <p className="text-sm text-mist-300">Spotify listeners</p>
                <p className="text-sm text-mist-300">
                  {t(locale, "Auditeurs Spotify", "Spotify listeners")}
                </p>
                <p className="text-3xl font-semibold text-mist-50">
                  {formatCompactNumber(epkData.spotifyMonthlyListeners)}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <PlayCircle className="h-5 w-5 text-coral-300" />
              <div>
                <p className="text-sm text-mist-300">
                  {t(locale, "Vues YouTube", "YouTube views")}
                </p>
                <p className="text-3xl font-semibold text-mist-50">
                  {formatCompactNumber(epkData.youtubeViews)}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-coral-300" />
              <div>
                <p className="text-sm text-mist-300">
                  {t(locale, "Marchés principaux", "Top markets")}
                </p>
                <p className="text-lg text-mist-50">{epkData.topMarkets.join(" • ")}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Liens sociaux et streaming", "Social and streaming links")}
          </p>
          <div className="mt-5 space-y-3">
            {epkData.socials.map((social) => (
              <div
                key={social}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-mist-200"
              >
                {social}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Assets téléchargeables", "Downloadable assets")}
          </p>
          <div className="mt-5 space-y-3">
            {epkData.assets.map((asset) => (
              <div
                key={asset}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-mist-200"
              >
                {asset}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
