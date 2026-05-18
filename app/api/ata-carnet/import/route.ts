import { NextResponse } from "next/server";

import { parseAtaCarnetCsv } from "@/lib/ata-carnet/csv";
import { getSessionUser } from "@/lib/auth/session";
import { replaceAtaCarnetItems } from "@/lib/server/workspace-store";

export async function POST(request: Request) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsedItems = parseAtaCarnetCsv(buffer);
  const items = await replaceAtaCarnetItems({
    workspaceId: session.workspaceId,
    items: parsedItems
  });

  return NextResponse.json({ items });
}
