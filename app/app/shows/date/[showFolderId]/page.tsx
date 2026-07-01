import { ShowWorkspaceView } from "@/components/shows/show-workspace-view";
import { getSessionUser } from "@/lib/auth/session";
import { getCurrencyPreference, getLocalePreference } from "@/lib/preferences";

export default async function ImportedShowWorkspacePage({
  params
}: {
  params: Promise<{ showFolderId: string }>;
}) {
  const { showFolderId } = await params;
  const [session, currencyPreference, locale] = await Promise.all([
    getSessionUser(),
    getCurrencyPreference(),
    getLocalePreference()
  ]);

  return (
    <ShowWorkspaceView
      showFolderId={showFolderId}
      currency={currencyPreference}
      locale={locale}
      workspaceName={session?.workspace ?? "BandOS Workspace"}
      workspaceLogo={session?.logo ?? "/bandos-mark.svg"}
      canManageTicketing={
        Boolean(session?.isBandosAdmin) ||
        session?.role === "owner" ||
        session?.role === "admin"
      }
    />
  );
}
