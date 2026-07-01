import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { listWorkspaceSummariesForBandosAdmin } from "@/lib/server/workspace-store";

export async function GET() {
  const session = await getSessionUser();

  if (!session?.isBandosAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workspaces = await listWorkspaceSummariesForBandosAdmin();

  return NextResponse.json({ workspaces });
}
