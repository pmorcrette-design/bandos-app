import { notFound } from "next/navigation";

import { EpkBuilderRenderer } from "@/components/epk/epk-builder-renderer";
import { getWorkspaceById } from "@/lib/server/workspace-store";
import { getPublishedWorkspaceEpkRecordBySlug } from "@/lib/server/workspace-ui-store";

export default async function PublishedEpkPage({
  params
}: {
  params: Promise<{ siteSlug: string; pageSlug?: string[] }>;
}) {
  const { siteSlug, pageSlug = [] } = await params;
  const publishedRecord = await getPublishedWorkspaceEpkRecordBySlug(siteSlug);

  if (!publishedRecord) {
    notFound();
  }

  const workspace = await getWorkspaceById(publishedRecord.workspaceId);

  if (!workspace) {
    notFound();
  }

  const activePageSlug = pageSlug[0] ?? null;

  if (
    activePageSlug &&
    !publishedRecord.snapshot.epkBuilder.pages.some((page) => page.slug === activePageSlug)
  ) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#070809] px-4 py-4 sm:px-6 sm:py-6">
      <EpkBuilderRenderer
        locale={workspace.locale}
        profile={publishedRecord.snapshot.epkProfile}
        builder={publishedRecord.snapshot.epkBuilder}
        workspaceName={workspace.name}
        workspaceLogo={workspace.logoUrl}
        importedShowFolders={publishedRecord.snapshot.importedShowFolders}
        uploadedDocuments={publishedRecord.snapshot.uploadedDocuments}
        mode="published"
        activePageSlug={activePageSlug}
        siteSlug={publishedRecord.snapshot.epkBuilder.publishedSlug}
      />
    </div>
  );
}
