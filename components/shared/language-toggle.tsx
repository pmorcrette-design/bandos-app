"use client";

import { Languages } from "lucide-react";
import { usePathname } from "next/navigation";

import { setLocalePreferenceAction } from "@/app/actions";
import { cn } from "@/lib/utils";

export function LanguageToggle({
  locale,
  className
}: {
  locale: "fr" | "en";
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1",
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl text-mist-300">
        <Languages className="h-4 w-4" />
      </div>
      {(["fr", "en"] as const).map((code) => {
        const isActive = locale === code;

        return (
          <form key={code} action={setLocalePreferenceAction}>
            <input type="hidden" name="locale" value={code} />
            <input type="hidden" name="returnTo" value={pathname} />
            <button
              type="submit"
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] transition",
                isActive
                  ? "bg-coral-500 text-white"
                  : "text-mist-300 hover:text-mist-50"
              )}
            >
              {code}
            </button>
          </form>
        );
      })}
    </div>
  );
}
