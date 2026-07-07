"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Command, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { t, type Locale } from "@/lib/i18n";
import { getNavigationItems } from "@/lib/navigation";
import { useBandosUIStore } from "@/store/ui-store";

export function CommandPalette({
  locale
}: {
  locale: Locale;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isOpen = useBandosUIStore((state) => state.commandPaletteOpen);
  const toggleCommandPalette = useBandosUIStore(
    (state) => state.toggleCommandPalette
  );
  const navigationItems = useMemo(() => getNavigationItems(locale), [locale]);
  const quickActions = useMemo(
    () => [
      {
        label: t(locale, "Créer une nouvelle tournée", "Create a new tour"),
        href: "/app/tours",
        description: t(
          locale,
          "Ouvrir le planificateur de tournée",
          "Jump into the tour builder"
        )
      },
      {
        label: t(locale, "Ouvrir le CRM booking", "Open booking CRM"),
        href: "/app/booking-crm",
        description: t(
          locale,
          "Consulter les salles et promoteurs",
          "Review venues and promoter pipeline"
        )
      },
      {
        label: t(
          locale,
          "Vérifier les documents de voyage",
          "Check border documents"
        ),
        href: "/app/tours",
        description: t(
          locale,
          "Contrôler l'état des documents de voyage",
          "Review travel-document readiness"
        )
      }
    ],
    [locale]
  );

  const results = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    const items = [
      ...navigationItems.map((item) => ({
        label: item.label,
        href: item.href,
        description: `${t(locale, "Raccourci", "Shortcut")} ${item.shortcut}`
      })),
      ...quickActions
    ];

    if (!search) {
      return items;
    }

    return items.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(search)
    );
  }, [deferredQuery, locale, navigationItems, quickActions]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const isPaletteShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (isPaletteShortcut) {
        event.preventDefault();
        toggleCommandPalette();
      }

      if (event.key === "Escape" && isOpen) {
        toggleCommandPalette(false);
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [isOpen, toggleCommandPalette]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-3 py-12 backdrop-blur-sm sm:px-4 sm:py-24">
      <div className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/10 bg-graphite-950 shadow-shell sm:rounded-[30px]">
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4 sm:px-5">
          <Search className="h-5 w-5 text-mist-300" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(
              locale,
              "Rechercher des tournées, modules et actions...",
              "Search routes, modules, and actions..."
            )}
            className="h-10 flex-1 bg-transparent text-sm text-mist-50 outline-none placeholder:text-mist-300/70"
          />
          <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-mist-300 sm:inline-flex sm:items-center">
            <Command className="mr-1 inline h-3 w-3" />K
          </span>
        </div>
        <div className="max-h-[min(72vh,420px)] overflow-y-auto p-3">
          {results.length ? (
            results.map((result) => (
              <button
                key={`${result.href}-${result.label}`}
                type="button"
                onClick={() => {
                  toggleCommandPalette(false);
                  startTransition(() => {
                    router.push(result.href);
                  });
                }}
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-white/5"
              >
                <div>
                  <p className="text-sm font-medium text-mist-50">
                    {result.label}
                  </p>
                  <p className="mt-1 text-sm text-mist-300">
                    {result.description}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-mist-300">
                  {t(locale, "Ouvrir", "Open")}
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
              <p className="text-sm font-medium text-mist-50">
                {t(locale, "Aucun résultat", "No results found")}
              </p>
              <p className="mt-2 text-sm text-mist-300">
                {t(
                  locale,
                  "Essaie de chercher concerts, finance, tâches ou documents.",
                  "Try searching for shows, finance, tasks, or border docs."
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
