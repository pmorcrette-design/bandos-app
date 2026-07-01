import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";

export default async function ShowDaySheetPrintPage({
  params,
  searchParams
}: {
  params: Promise<{ showFolderId: string }>;
  searchParams: Promise<{ autoprint?: string }>;
}) {
  const [{ showFolderId }, resolvedSearchParams, session] = await Promise.all([
    params,
    searchParams,
    getSessionUser()
  ]);

  if (!session) {
    redirect("/auth/sign-in");
  }

  const nextAutoprint = resolvedSearchParams.autoprint === "1" ? "&autoprint=1" : "";

  redirect(`/app/shows/date/${encodeURIComponent(showFolderId)}?print=1${nextAutoprint}`);
}
