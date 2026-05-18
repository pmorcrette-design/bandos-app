"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import { BandosLogo } from "@/components/brand/bandos-logo";
import { WorkspaceLogo } from "@/components/shared/workspace-logo";
import { Badge } from "@/components/ui/badge";
import { t, type Locale } from "@/lib/i18n";
import { getNavigationItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({
  locale,
  workspaceName,
  workspaceLogo
}: {
  locale: Locale;
  workspaceName: string;
  workspaceLogo: string;
}) {
  const pathname = usePathname();
  const navigationItems = getNavigationItems(locale);

  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[272px] shrink-0 flex-col rounded-[30px] border border-white/8 bg-black/30 p-5 shadow-shell backdrop-blur-2xl lg:flex">
      <BandosLogo />
      <div className="mt-8 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Espace", "Workspace")}
            </p>
            <p className="mt-2 text-lg font-medium text-mist-50">
              {workspaceName}
            </p>
          </div>
          <WorkspaceLogo
            src={workspaceLogo}
            alt={`${workspaceName} logo`}
            size="sm"
          />
        </div>
        <Badge tone="accent" className="mt-4">
          {t(locale, "Workspace tournée", "Touring workspace")}
        </Badge>
      </div>
      <nav className="mt-6 space-y-1.5">
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
                isActive
                  ? "border border-coral-500/20 bg-coral-500/10 text-mist-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "text-mist-300 hover:bg-white/[0.04] hover:text-mist-50"
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-mist-300/70">
                {item.shortcut}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-[24px] border border-white/8 bg-gradient-to-br from-white/[0.05] to-coral-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
            <Sparkles className="h-5 w-5 text-coral-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-mist-50">BandOS Pulse</p>
            <p className="text-sm text-mist-300">
              {t(locale, "6 confirmations encore ouvertes", "6 confirmations still open")}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
