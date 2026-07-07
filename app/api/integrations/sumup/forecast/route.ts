import { NextResponse } from "next/server";

import { getSumUpMerchSalesHistory } from "@/lib/integrations/sumup";

export async function GET() {
  try {
    const sales = await getSumUpMerchSalesHistory();

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
