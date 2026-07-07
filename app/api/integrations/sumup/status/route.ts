import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getSumUpConnectionStatus } from "@/lib/integrations/sumup";

export async function GET() {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getSumUpConnectionStatus(session.workspaceId);
  return NextResponse.json(status);
}
