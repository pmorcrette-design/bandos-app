import { Bell, CreditCard, Palette, Shield, Workflow } from "lucide-react";

import { SumUpConnectionCard } from "@/components/integrations/sumup-connection-card";
import { CurrencyPreferenceCard } from "@/components/settings/currency-preference-card";
import { LanguagePreferenceCard } from "@/components/settings/language-preference-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { getSumUpConnectionStatus } from "@/lib/integrations/sumup";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

const settingCards = [
  {
    titleFr: "Workspace",
    titleEn: "Workspace",
    bodyFr: "WIDESPREAD DISEASE • plan tournée",
    bodyEn: "WIDESPREAD DISEASE • touring plan",
    icon: Workflow
  },
  {
    titleFr: "Permissions",
    titleEn: "Permissions",
    bodyFr: "owner, admin, member, viewer",
    bodyEn: "owner, admin, member, viewer",
    icon: Shield
  },
  {
    titleFr: "Facturation",
    titleEn: "Billing",
    bodyFr: "abonnement mensuel",
    bodyEn: "monthly billing",
    icon: CreditCard
  },
  {
    titleFr: "Thème",
    titleEn: "Theme",
    bodyFr: "interface dark premium",
    bodyEn: "premium dark interface",
    icon: Palette
  }
] as const;

export default async function SettingsPage() {
  const currencyPreference = await getCurrencyPreference();
  const locale = await getLocalePreference();
  const sumupStatus = await getSumUpConnectionStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Réglages", "Settings")}
        title={t(
          locale,
          "Préférences, intégrations et contrôle du workspace",
          "Preferences, integrations, and workspace control"
        )}
        description={t(
          locale,
          "Tout ce qui règle le fonctionnement du workspace sans transformer les settings en panneau technique illisible.",
          "Everything that shapes the workspace without turning settings into a noisy admin dump."
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {settingCards.map(({ titleFr, titleEn, bodyFr, bodyEn, icon: Icon }) => (
          <Card key={titleEn}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Icon className="h-5 w-5 text-coral-300" />
              </div>
              <div>
                <p className="text-sm text-mist-300">{locale === "fr" ? titleFr : titleEn}</p>
                <p className="text-lg text-mist-50">{locale === "fr" ? bodyFr : bodyEn}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <CurrencyPreferenceCard currency={currencyPreference} locale={locale} />
          <LanguagePreferenceCard locale={locale} />
          <Card>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-coral-300" />
              <p className="text-lg font-medium text-mist-50">
                {t(locale, "Profil de notifications", "Notification profile")}
              </p>
            </div>
            <div className="mt-5 space-y-3">
              {[
                t(locale, "Blocages documents et transport", "Document and transport blockers"),
                t(locale, "Digest quotidien des tâches", "Daily task digest"),
                t(locale, "Mises à jour confirmations de dates", "Show confirmation updates"),
                t(locale, "Résumé hebdo finance et merch", "Weekly finance and merch recap")
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                >
                  <span className="text-sm text-mist-200">{item}</span>
                  <Badge tone="success">{t(locale, "Activé", "Enabled")}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <SumUpConnectionCard locale={locale} status={sumupStatus} />
          <Card>
            <p className="text-lg font-medium text-mist-50">
              {t(locale, "Contrôles workspace", "Workspace controls")}
            </p>
            <div className="mt-5 grid gap-3">
              {[
                t(locale, "Profil groupe, logo et identité", "Band profile, logo, and identity"),
                t(locale, "Structure documentaire par défaut", "Default document structure"),
                t(locale, "Templates show-day et exports advance", "Show-day templates and advance exports"),
                t(locale, "Permissions par rôle", "Role permissions"),
                t(locale, "Intégrations mail, drive et calendrier", "Mail, drive, and calendar integrations")
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm text-mist-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
