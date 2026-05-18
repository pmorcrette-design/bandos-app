import { getSessionUser } from "@/lib/auth/session";
import { TeamRosterView } from "@/components/team/team-roster-view";
import { TeamAccessManager } from "@/components/team/team-access-manager";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getLocalePreference } from "@/lib/preferences";
import { listWorkspaceAccessUsers } from "@/lib/server/workspace-store";

export default async function TeamPage() {
  const [locale, session] = await Promise.all([
    getLocalePreference(),
    getSessionUser()
  ]);
  const accessUsers =
    session?.workspaceId
      ? await listWorkspaceAccessUsers(session.workspaceId)
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Équipe", "Team")}
        title={t(
          locale,
          "Gère l'équipe, les accès et les assignations par date",
          "Manage team, logins, and per-show assignments"
        )}
        description={t(
          locale,
          "Le roster du workspace sert aux rôles opérationnels, et les accès email / mot de passe permettent à chaque membre ou crew d'entrer dans BandOS avec son propre compte.",
          "The workspace roster powers operational roles, and email / password access lets every band or crew member enter BandOS with their own account."
        )}
      />

      <TeamAccessManager
        locale={locale}
        initialUsers={accessUsers}
        currentUserId={session?.userId ?? ""}
      />
      <TeamRosterView locale={locale} />
    </div>
  );
}
