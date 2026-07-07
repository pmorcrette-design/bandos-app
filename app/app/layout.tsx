import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { CommandPalette } from "@/components/app-shell/command-palette";
import { WorkspaceUIProvider } from "@/components/providers/workspace-ui-provider";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { getSessionUser } from "@/lib/auth/session";
import { getLocalePreference } from "@/lib/preferences";
import { getWorkspaceUIRecord } from "@/lib/server/workspace-ui-store";

export default async function WorkspaceLayout({
  children
}: {
  children: ReactNode;
}) {
  const session = await getSessionUser();
  const locale = await getLocalePreference();

  if (!session) {
    redirect("/auth/sign-in");
  }

  const workspaceUIRecord = await getWorkspaceUIRecord(session.workspaceId);

  return (
    <WorkspaceUIProvider
      key={session.workspaceId}
      workspaceId={session.workspaceId}
      initialRecord={workspaceUIRecord}
      allowLegacyMigration={session.isDemoWorkspace}
    >
      <div
        data-workspace-layout="true"
        className="mx-auto flex min-h-screen max-w-[1560px] flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:flex-row lg:gap-6 lg:px-8"
      >
        <Sidebar
          locale={locale}
          workspaceName={session.workspace}
          workspaceLogo={session.logo}
        />
        <div className="min-w-0 flex-1 space-y-4 lg:space-y-6" data-workspace-content="true">
          <Topbar
            locale={locale}
            userName={session.name}
            workspaceName={session.workspace}
            workspaceLogo={session.logo}
          />
          <main className="space-y-4 pb-8 lg:space-y-6" data-workspace-main="true">
            {children}
          </main>
        </div>
        <CommandPalette locale={locale} />
      </div>
    </WorkspaceUIProvider>
  );
}
