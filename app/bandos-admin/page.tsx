import Link from "next/link";
import { redirect } from "next/navigation";

import { BandosAdminView } from "@/components/admin/bandos-admin-view";
import { BandosLogo } from "@/components/brand/bandos-logo";
import { PageHeader } from "@/components/shared/page-header";
import { buttonStyles } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { getLocalePreference } from "@/lib/preferences";
import {
  listBandosPlatformAdminAccounts,
  listWorkspaceSummariesForBandosAdmin
} from "@/lib/server/workspace-store";

export default async function BandosAdminPage() {
  const [session, locale] = await Promise.all([
    getSessionUser(),
    getLocalePreference()
  ]);

  if (!session) {
    redirect("/auth/sign-in");
  }

  if (!session.isBandosAdmin) {
    redirect("/app");
  }

  const [workspaces, adminUsers] = await Promise.all([
    listWorkspaceSummariesForBandosAdmin(),
    listBandosPlatformAdminAccounts()
  ]);

  return (
    <main className="min-h-screen bg-[#050608] px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[32px] border border-white/8 bg-black/30 p-6 shadow-shell backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <BandosLogo />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-coral-300">
                BandOS Control Center
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Espace interne réservé aux admins BandOS.",
                  "Internal area reserved for BandOS admins."
                )}
              </p>
            </div>
          </div>
          <Link href="/app" className={buttonStyles({ variant: "secondary" })}>
            {t(locale, "Retour à l'app", "Back to app")}
          </Link>
        </div>

        <div className="space-y-6">
          <PageHeader
            eyebrow="BandOS Admin"
            title={t(
              locale,
              "Gestion des comptes clients",
              "Client account management"
            )}
            description={t(
              locale,
              "Centre de contrôle interne: comptes clients, abonnements, essais et suppression de workspaces.",
              "Internal control center: client accounts, subscriptions, trials, and workspace deletion."
            )}
          />
          <BandosAdminView
            initialWorkspaces={workspaces}
            initialAdminUsers={adminUsers}
            locale={locale}
          />
        </div>
      </div>
    </main>
  );
}
