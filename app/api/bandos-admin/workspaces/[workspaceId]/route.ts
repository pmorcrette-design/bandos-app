import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { deleteWorkspaceTicketingData } from "@/lib/server/ticketing-store";
import { deleteWorkspaceUIRecord } from "@/lib/server/workspace-ui-store";
import {
  deleteWorkspaceClientAccount,
  updateWorkspaceSubscriptionSettings,
  type WorkspaceSubscriptionPlan
} from "@/lib/server/workspace-store";

const allowedPlans: WorkspaceSubscriptionPlan[] = ["starter", "touring", "label"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getSessionUser();

  if (!session?.isBandosAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { workspaceId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { subscriptionPlan?: string; trialDays?: number }
    | null;

  if (!body || !allowedPlans.includes(body.subscriptionPlan as WorkspaceSubscriptionPlan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const trialDays = Math.max(0, Math.floor(Number(body.trialDays ?? 0)));

  try {
    const workspace = await updateWorkspaceSubscriptionSettings({
      workspaceId,
      subscriptionPlan: body.subscriptionPlan as WorkspaceSubscriptionPlan,
      trialDays
    });

    return NextResponse.json({ workspace });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update workspace"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getSessionUser();

  if (!session?.isBandosAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { workspaceId } = await context.params;

  try {
    await deleteWorkspaceClientAccount(workspaceId);
    await deleteWorkspaceUIRecord(workspaceId);
    await deleteWorkspaceTicketingData(workspaceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to delete workspace"
      },
      { status: 400 }
    );
  }
}
