import { redirect } from "next/navigation";

import { EpkPrintShell } from "@/components/epk/epk-print-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getLocalePreference } from "@/lib/preferences";
import { getWorkspaceUIRecord } from "@/lib/server/workspace-ui-store";

export default async function EpkPrintPage({
  searchParams
}: {
  searchParams: Promise<{ autoprint?: string }>;
}) {
  const [session, locale, params] = await Promise.all([
    getSessionUser(),
    getLocalePreference(),
    searchParams
  ]);

  if (!session) {
    redirect("/auth/sign-in");
  }

  const record = await getWorkspaceUIRecord(session.workspaceId);

  return (
    <EpkPrintShell
      locale={locale}
      profile={record.snapshot.epkProfile}
      workspaceName={session.workspace}
      workspaceLogo={session.logo}
      autoprint={params.autoprint === "1"}
    />
  );
}
