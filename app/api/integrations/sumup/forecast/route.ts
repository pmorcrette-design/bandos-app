import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getSumUpMerchSalesHistory } from "@/lib/integrations/sumup";

export async function GET() {
  try {
    const session = await getSessionUser();

    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const sales = await getSumUpMerchSalesHistory(session.workspaceId);

    return NextResponse.json({
      ok: true,
      sales,
      count: sales.length,
      syncedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load SumUp merch forecast data"
      },
      { status: 500 }
    );
  }
}
