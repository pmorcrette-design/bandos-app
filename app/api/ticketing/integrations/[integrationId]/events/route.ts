import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { listProviderExternalEvents } from "@/lib/server/ticketing-store";

function canManageTicketing(role: string, isBandosAdmin: boolean) {
  return isBandosAdmin || role === "owner" || role === "admin";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ integrationId: string }> }
) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageTicketing(session.role, session.isBandosAdmin)) {
    return NextResponse.json(
      { error: "Only owners and admins can browse provider events." },
      { status: 403 }
    );
  }

  const { integrationId } = await context.params;

  try {
    const events = await listProviderExternalEvents({
      workspaceId: session.workspaceId,
      integrationId
    });

    return NextResponse.json(
      { events },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load provider events."
      },
      { status: 400 }
    );
  }
}
