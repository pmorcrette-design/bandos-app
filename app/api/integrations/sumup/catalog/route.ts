import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getSumUpCatalogImportItems } from "@/lib/integrations/sumup";

export async function GET() {
  try {
    const session = await getSessionUser();

    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const items = await getSumUpCatalogImportItems(session.workspaceId);

    return NextResponse.json({
      ok: true,
      items,
      count: items.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to import SumUp catalog"
      },
      { status: 500 }
    );
  }
}
