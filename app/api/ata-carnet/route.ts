import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { replaceAtaCarnetItems } from "@/lib/server/workspace-store";

export async function PUT(request: Request) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        items?: Array<{
          id: string;
          pieces?: number;
          packaging?: string;
          designation?: string;
          weight?: number;
          weightUnit?: string;
          valueExVat?: number;
          origin?: string;
          serialNumber?: string;
          notes?: string;
          createdAt?: string;
          updatedAt?: string;
        }>;
      }
    | null;

  if (!body?.items) {
    return NextResponse.json(
      { error: "ATA items payload is required." },
      { status: 400 }
    );
  }

  const items = await replaceAtaCarnetItems({
    workspaceId: session.workspaceId,
    items: body.items
  });

  return NextResponse.json({ items });
}
