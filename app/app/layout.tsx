import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { CommandPalette } from "@/components/app-shell/command-palette";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { getSessionUser } from "@/lib/auth/session";
import { getLocalePreference } from "@/lib/preferences";

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

  return (
    <div className="mx-auto flex min-h-screen max-w-[1560px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
      <Sidebar
        locale={locale}
        workspaceName={session.workspace}
        workspaceLogo={session.logo}
      />
      <div className="min-w-0 flex-1 space-y-6">
        <Topbar
          locale={locale}
          userName={session.name}
          workspaceName={session.workspace}
          workspaceLogo={session.logo}
        />
        <main className="space-y-6 pb-8">{children}</main>
      </div>
      <CommandPalette locale={locale} />
    </div>
  );
}
