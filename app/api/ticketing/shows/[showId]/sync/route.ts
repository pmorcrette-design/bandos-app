import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { syncTicketingShowEvent } from "@/lib/server/ticketing-store";

function canManageTicketing(role: string, isBandosAdmin: boolean) {
  return isBandosAdmin || role === "owner" || role === "admin";
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ showId: string }> }
) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageTicketing(session.role, session.isBandosAdmin)) {
    return NextResponse.json(
      { error: "Only owners and admins can sync ticketing data." },
      { status: 403 }
    );
  }

  const { showId } = await context.params;

  try {
    const payload = await syncTicketingShowEvent(session.workspaceId, showId);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to sync ticketing event."
      },
      { status: 400 }
    );
  }
}
