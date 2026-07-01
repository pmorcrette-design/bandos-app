"use client";

import { useEffect, useState } from "react";

import { PremiumEpkDocument } from "@/components/epk/premium-epk-document";
import type { Locale } from "@/lib/i18n";
import type { EpkProfile } from "@/lib/workspace-data";

export function EpkPrintShell({
  locale,
  profile,
  workspaceName,
  workspaceLogo,
  autoprint
}: {
  locale: Locale;
  profile: EpkProfile;
  workspaceName: string;
  workspaceLogo: string;
  autoprint: boolean;
}) {
  const [hasTriggeredPrint, setHasTriggeredPrint] = useState(false);

  useEffect(() => {
    if (!autoprint || hasTriggeredPrint) {
      return;
    }

    let cancelled = false;
    const printTimer = window.setTimeout(async () => {
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch {
        // ignore font readiness failures
      }

      if (cancelled) {
        return;
      }

      setHasTriggeredPrint(true);
      window.print();
    }, 220);

    const handleAfterPrint = () => {
      try {
        window.close();
      } catch {
        // keep the tab open if the browser blocks closing
      }
    };

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      cancelled = true;
      window.clearTimeout(printTimer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [autoprint, hasTriggeredPrint]);

  return (
    <div className="min-h-screen bg-[#0f1011] px-4 py-4 sm:px-6 sm:py-6">
      <PremiumEpkDocument
        locale={locale}
        profile={profile}
        workspaceName={workspaceName}
        workspaceLogo={workspaceLogo}
        printMode
      />
    </div>
  );
}
