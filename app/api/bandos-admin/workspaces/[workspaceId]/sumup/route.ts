import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import {
  deleteWorkspaceSumUpConfig,
  getWorkspaceSumUpAdminPreview,
  upsertWorkspaceSumUpConfig
} from "@/lib/server/workspace-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getSessionUser();

  if (!session?.isBandosAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { workspaceId } = await context.params;
  const sumup = await getWorkspaceSumUpAdminPreview(workspaceId);

  return NextResponse.json({ sumup });
}

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
    | {
        apiKey?: string;
        merchantCode?: string;
        readerId?: string;
      }
    | null;

  try {
    const sumup = await upsertWorkspaceSumUpConfig({
      workspaceId,
      apiKey: body?.apiKey,
      merchantCode: body?.merchantCode,
      readerId: body?.readerId
    });

    return NextResponse.json({ sumup });
  } catch (error) {
    if (error instanceof Error && error.message === "SUMUP_CONFIG_INCOMPLETE") {
      return NextResponse.json(
        {
          error: "API key and merchant code are required to save this SumUp connection."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save the SumUp configuration."
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
  const sumup = await deleteWorkspaceSumUpConfig(workspaceId);

  return NextResponse.json({ sumup });
}
