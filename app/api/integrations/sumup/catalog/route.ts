import { NextResponse } from "next/server";

import { getSumUpCatalogImportItems } from "@/lib/integrations/sumup";

export async function GET() {
  try {
    const items = await getSumUpCatalogImportItems();

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
