import { EpkWorkspaceView } from "@/components/epk/epk-workspace-view";
import { getSessionUser } from "@/lib/auth/session";
import { getLocalePreference } from "@/lib/preferences";

export default async function EpkPage() {
  const [locale, session] = await Promise.all([
    getLocalePreference(),
    getSessionUser()
  ]);

  return (
    <EpkWorkspaceView
      locale={locale}
      workspaceName={session?.workspace ?? "BandOS Workspace"}
      workspaceLogo={session?.logo ?? "/bandos-mark.svg"}
    />
  );
}
