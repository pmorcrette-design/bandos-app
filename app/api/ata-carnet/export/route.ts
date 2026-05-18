import { NextResponse } from "next/server";

import { buildAtaCarnetCsv } from "@/lib/ata-carnet/csv";
import { getSessionUser } from "@/lib/auth/session";
import { listAtaCarnetItems } from "@/lib/server/workspace-store";

export async function GET() {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const items = await listAtaCarnetItems(session.workspaceId);
  const csv = buildAtaCarnetCsv(items);
  const slug = session.workspace
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug || "bandos"}-ata-carnet.csv"`
    }
  });
}
