"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Command, Menu, Search } from "lucide-react";

import { signOutAction } from "@/app/actions";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { WorkspaceLogo } from "@/components/shared/workspace-logo";
import { Button, buttonStyles } from "@/components/ui/button";
import { t, type Locale } from "@/lib/i18n";
import { getNavigationItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";

export function Topbar({
  locale,
  userName,
  workspaceName,
  workspaceLogo
}: {
  locale: Locale;
  userName: string;
  workspaceName: string;
  workspaceLogo: string;
}) {
  const pathname = usePathname();
  const toggleCommandPalette = useBandosUIStore(
    (state) => state.toggleCommandPalette
  );
  const toggleMobileSidebar = useBandosUIStore(
    (state) => state.toggleMobileSidebar
  );
  const navigationItems = getNavigationItems(locale);

  return (
    <div className="space-y-4" data-shell-topbar="true">
      <div className="rounded-[24px] border border-white/8 bg-black/25 px-3 py-3 shadow-card backdrop-blur-2xl sm:rounded-[28px] sm:px-5 sm:py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              type="button"
              aria-label={t(locale, "Ouvrir la navigation", "Open navigation")}
              onClick={() => toggleMobileSidebar(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-mist-200 transition hover:bg-white/10 hover:text-mist-50 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <WorkspaceLogo
              src={workspaceLogo}
              alt={`${workspaceName} logo`}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate text-xs uppercase tracking-[0.24em] text-mist-300">
                {workspaceName}
              </p>
              <p className="mt-1 truncate text-base font-medium text-mist-50 sm:text-lg">
                {t(locale, "Bon retour", "Welcome back")}, {userName}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] lg:flex lg:flex-wrap lg:items-center lg:justify-end">
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageToggle locale={locale} />
              <button
                type="button"
                aria-label={t(locale, "Notifications", "Notifications")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-mist-200 transition hover:bg-white/10 hover:text-mist-50"
              >
                <Bell className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => toggleCommandPalette(true)}
              className="flex h-11 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-mist-300 transition hover:bg-white/10 hover:text-mist-50 sm:min-w-[220px] lg:w-auto"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">
                {t(locale, "Recherche rapide", "Quick search")}
              </span>
              <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-mist-300 sm:inline-flex sm:items-center">
                <Command className="mr-1 inline h-3 w-3" />K
              </span>
            </button>
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-center lg:col-span-1">
              <Link
                href="/app/settings"
                className={buttonStyles({ variant: "secondary", className: "w-full sm:w-auto" })}
              >
                {t(locale, "Réglages", "Settings")}
              </Link>
              <form action={signOutAction} className="w-full sm:w-auto">
                <Button variant="ghost" type="submit" className="w-full sm:w-auto">
                  {t(locale, "Se déconnecter", "Sign out")}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-2xl border px-4 py-3 text-sm transition",
              (item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href))
                ? "border-coral-500/20 bg-coral-500/10 text-mist-50"
                : "border-white/10 bg-white/5 text-mist-200 hover:bg-white/10"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
