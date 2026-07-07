"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";

import { BandosLogo } from "@/components/brand/bandos-logo";
import { WorkspaceLogo } from "@/components/shared/workspace-logo";
import { Badge } from "@/components/ui/badge";
import { t, type Locale } from "@/lib/i18n";
import { getNavigationItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";

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
  const mobileSidebarOpen = useBandosUIStore((state) => state.mobileSidebarOpen);
  const toggleMobileSidebar = useBandosUIStore((state) => state.toggleMobileSidebar);

  useEffect(() => {
    toggleMobileSidebar(false);
  }, [pathname, toggleMobileSidebar]);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen]);

  function renderSidebarBody(showHeader = false) {
    return (
      <>
        {showHeader ? (
          <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
            <BandosLogo compact />
            <button
              type="button"
              aria-label={t(locale, "Fermer le menu", "Close menu")}
              onClick={() => toggleMobileSidebar(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-mist-200 transition hover:bg-white/10 hover:text-mist-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <BandosLogo />
        )}
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {t(locale, "Espace", "Workspace")}
              </p>
              <p className="mt-2 break-words text-lg font-medium text-mist-50">
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
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1 pb-6">
          <nav className="space-y-1.5">
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
                  <span className="flex min-w-0 items-center gap-3">
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="ml-3 text-[11px] uppercase tracking-[0.2em] text-mist-300/70">
                    {item.shortcut}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/8 bg-gradient-to-br from-white/[0.05] to-coral-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
              <Sparkles className="h-5 w-5 text-coral-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-mist-50">BandOS Pulse</p>
              <p className="text-sm text-mist-300">
                {t(
                  locale,
                  "Le workspace reste synchronisé automatiquement.",
                  "Your workspace stays synced automatically."
                )}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition lg:hidden",
          mobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => toggleMobileSidebar(false)}
        aria-hidden={!mobileSidebarOpen}
      />
      <aside
        className={cn(
          "fixed inset-y-3 left-3 z-50 flex w-[min(320px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[30px] border border-white/8 bg-[#07090b]/95 p-4 shadow-shell backdrop-blur-2xl transition duration-200 lg:hidden",
          mobileSidebarOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-[108%] opacity-0"
        )}
      >
        {renderSidebarBody(true)}
      </aside>
      <aside
        data-shell-sidebar="true"
        className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[272px] shrink-0 overflow-hidden rounded-[30px] border border-white/8 bg-black/30 p-5 shadow-shell backdrop-blur-2xl lg:flex lg:flex-col"
      >
        {renderSidebarBody()}
      </aside>
    </>
  );
}
