import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import {
  getWorkspaceUIRecord,
  replaceWorkspaceUIRecord
} from "@/lib/server/workspace-ui-store";
import {
  normalizeWorkspaceData,
  type BandosWorkspaceData
} from "@/lib/workspace-data";

export async function GET() {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const record = await getWorkspaceUIRecord(session.workspaceId);

  return NextResponse.json(record, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function PUT(request: Request) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        snapshot?: Partial<BandosWorkspaceData>;
        baseUpdatedAt?: string | null;
      }
    | null;

  if (!body?.snapshot) {
    return NextResponse.json(
      { error: "A workspace snapshot is required." },
      { status: 400 }
    );
  }

  const record = await replaceWorkspaceUIRecord({
    workspaceId: session.workspaceId,
    snapshot: normalizeWorkspaceData(body.snapshot),
    baseUpdatedAt: body.baseUpdatedAt ?? null
  }).catch((error) => {
    if (error instanceof Error && error.message === "STALE_WORKSPACE_UI_SNAPSHOT") {
      return null;
    }

    throw error;
  });

  if (!record) {
    return NextResponse.json(
      { error: "Workspace data is out of date. Refresh required." },
      { status: 409 }
    );
  }

  return NextResponse.json(record, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
