"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Command, Search } from "lucide-react";

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
  const navigationItems = getNavigationItems(locale);

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/8 bg-black/25 px-4 py-4 shadow-card backdrop-blur-2xl sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <WorkspaceLogo
              src={workspaceLogo}
              alt={`${workspaceName} logo`}
              size="md"
              className="hidden sm:block"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                {workspaceName}
              </p>
              <p className="mt-1 text-lg font-medium text-mist-50">
                {t(locale, "Bon retour", "Welcome back")}, {userName}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] lg:flex lg:flex-wrap lg:items-center lg:justify-end">
            <div className="flex items-center gap-3">
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
              <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-mist-300">
                <Command className="mr-1 inline h-3 w-3" />K
              </span>
            </button>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-1">
              <Link
                href="/app/settings"
                className={buttonStyles({ variant: "secondary" })}
              >
                {t(locale, "Réglages", "Settings")}
              </Link>
              <form action={signOutAction}>
                <Button variant="ghost" type="submit">
                  {t(locale, "Se déconnecter", "Sign out")}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:hidden">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm transition",
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
