import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getWorkspaceTicketingSummaries } from "@/lib/server/ticketing-store";

export async function GET() {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const summaries = await getWorkspaceTicketingSummaries(session.workspaceId);

  return NextResponse.json(
    { summaries },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
