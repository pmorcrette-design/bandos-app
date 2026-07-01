import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import {
  getShowTicketingWorkspace,
  linkTicketingEventToShow,
  unlinkTicketingShowEvent
} from "@/lib/server/ticketing-store";
import type { ProviderExternalEvent } from "@/lib/ticketing/types";

function canManageTicketing(role: string, isBandosAdmin: boolean) {
  return isBandosAdmin || role === "owner" || role === "admin";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ showId: string }> }
) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { showId } = await context.params;
  const ticketing = await getShowTicketingWorkspace(session.workspaceId, showId);

  return NextResponse.json(
    ticketing,
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ showId: string }> }
) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageTicketing(session.role, session.isBandosAdmin)) {
    return NextResponse.json(
      { error: "Only owners and admins can link ticketing events." },
      { status: 403 }
    );
  }

  const { showId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | {
        integrationId?: string;
        externalEventId?: string;
        externalEvent?: ProviderExternalEvent | null;
      }
    | null;

  if (!body?.integrationId || !body.externalEventId) {
    return NextResponse.json(
      { error: "Integration id and external event id are required." },
      { status: 400 }
    );
  }

  try {
    const event = await linkTicketingEventToShow({
      workspaceId: session.workspaceId,
      showId,
      integrationId: body.integrationId,
      externalEventId: body.externalEventId,
      externalEvent: body.externalEvent ?? null
    });

    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to link ticketing event."
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ showId: string }> }
) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageTicketing(session.role, session.isBandosAdmin)) {
    return NextResponse.json(
      { error: "Only owners and admins can unlink ticketing events." },
      { status: 403 }
    );
  }

  const { showId } = await context.params;
  const removed = await unlinkTicketingShowEvent(session.workspaceId, showId);

  if (!removed) {
    return NextResponse.json(
      { error: "No ticketing event is linked to this show." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
