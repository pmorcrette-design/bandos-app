"use client";

import { useEffect, useState } from "react";

import { EpkBuilderRenderer } from "@/components/epk/epk-builder-renderer";
import type { EpkBuilderState } from "@/lib/epk-builder";
import type { Locale } from "@/lib/i18n";
import type { EpkProfile, ImportedShowFolder, UploadedDocumentEntry } from "@/lib/workspace-data";

export function EpkPrintShell({
  locale,
  profile,
  builder,
  workspaceName,
  workspaceLogo,
  importedShowFolders,
  uploadedDocuments,
  autoprint
}: {
  locale: Locale;
  profile: EpkProfile;
  builder: EpkBuilderState;
  workspaceName: string;
  workspaceLogo: string;
  importedShowFolders: ImportedShowFolder[];
  uploadedDocuments: UploadedDocumentEntry[];
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
    <div
      data-epk-print-root="true"
      className="min-h-screen bg-[#0f1011] px-4 py-4 sm:px-6 sm:py-6"
    >
      <EpkBuilderRenderer
        locale={locale}
        profile={profile}
        builder={builder}
        workspaceName={workspaceName}
        workspaceLogo={workspaceLogo}
        importedShowFolders={importedShowFolders}
        uploadedDocuments={uploadedDocuments}
        mode="print"
      />
    </div>
  );
}
