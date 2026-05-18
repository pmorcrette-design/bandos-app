import { DocumentsView } from "@/components/documents/documents-view";
import { PageHeader } from "@/components/shared/page-header";
import { t } from "@/lib/i18n";
import { getLocalePreference } from "@/lib/preferences";
import { getSessionUser } from "@/lib/auth/session";
import { listAtaCarnetItems } from "@/lib/server/workspace-store";

export default async function DocumentsPage() {
  const [locale, session] = await Promise.all([
    getLocalePreference(),
    getSessionUser()
  ]);
  const ataItems =
    session?.workspaceId
      ? await listAtaCarnetItems(session.workspaceId)
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Documents", "Documents")}
        title={t(
          locale,
          "Centralise les documents et le Carnet ATA du groupe",
          "Centralize the band's documents and ATA carnet"
        )}
        description={t(
          locale,
          "Importe les PDF, contrats, riders, factures, passeports, documents de route et la liste de matos ATA, puis regénère un CSV propre depuis la même table.",
          "Upload PDFs, contracts, riders, invoices, passports, route docs, and ATA equipment lists, then regenerate a clean CSV from the same table."
        )}
      />
      <DocumentsView locale={locale} initialAtaItems={ataItems} />
    </div>
  );
}
