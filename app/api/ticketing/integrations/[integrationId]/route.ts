import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { deleteTicketingIntegration } from "@/lib/server/ticketing-store";

function canManageTicketing(role: string, isBandosAdmin: boolean) {
  return isBandosAdmin || role === "owner" || role === "admin";
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ integrationId: string }> }
) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageTicketing(session.role, session.isBandosAdmin)) {
    return NextResponse.json(
      { error: "Only owners and admins can remove ticketing providers." },
      { status: 403 }
    );
  }

  const { integrationId } = await context.params;
  const deleted = await deleteTicketingIntegration(
    session.workspaceId,
    integrationId
  );

  if (!deleted) {
    return NextResponse.json(
      { error: "This ticketing integration no longer exists." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
