"use client";

import { useEffect, useState } from "react";

import { DaySheetPrintDocument } from "@/components/shows/day-sheet-print-document";
import type { Locale } from "@/lib/i18n";
import type { SupportedCurrency } from "@/lib/utils";
import type { ImportedShowFolder, UploadedDocumentEntry } from "@/lib/workspace-data";

type ShowDaySheetPrintShellProps = {
  autoprint: boolean;
  show: ImportedShowFolder;
  locale: Locale;
  currency: SupportedCurrency;
  workspaceName: string;
  workspaceLogo: string;
  soundEngineerName: string | null;
  showDocuments: UploadedDocumentEntry[];
  ticketingMetrics: {
    grossRevenue: number;
    netRevenue: number;
    fees: number;
    ticketsSold: number;
    capacitySoldPercentage: number | null;
    averageTicketPrice: number | null;
    guestlistCount: number;
    refundCount: number;
  } | null;
  ticketingSourceCurrency: SupportedCurrency;
};

async function waitForDocumentImages() {
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>("[data-show-print-root='true'] img")
  );

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          const finalize = () => resolve();
          image.addEventListener("load", finalize, { once: true });
          image.addEventListener("error", finalize, { once: true });
        })
    )
  );
}

export function ShowDaySheetPrintShell({
  autoprint,
  show,
  locale,
  currency,
  workspaceName,
  workspaceLogo,
  soundEngineerName,
  showDocuments,
  ticketingMetrics,
  ticketingSourceCurrency
}: ShowDaySheetPrintShellProps) {
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

      await waitForDocumentImages();

      if (cancelled) {
        return;
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      if (cancelled) {
        return;
      }

      window.focus();
      setHasTriggeredPrint(true);
      window.print();
    }, 260);

    const handleAfterPrint = () => {
      try {
        window.close();
      } catch {
        // keep tab open when browser blocks closing
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
      <DaySheetPrintDocument
        show={show}
        locale={locale}
        currency={currency}
        workspaceName={workspaceName}
        workspaceLogo={workspaceLogo}
        soundEngineerName={soundEngineerName}
        showDocuments={showDocuments}
        ticketingMetrics={ticketingMetrics}
        ticketingSourceCurrency={ticketingSourceCurrency}
      />
    </div>
  );
}
