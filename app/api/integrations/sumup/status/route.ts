import { NextResponse } from "next/server";

import { getSumUpConnectionStatus } from "@/lib/integrations/sumup";

export async function GET() {
  const status = await getSumUpConnectionStatus();
  return NextResponse.json(status);
}
