import { NextResponse } from "next/server";

import { handleTicketingWebhook } from "@/lib/server/ticketing-store";
import type { TicketingProvider } from "@/lib/ticketing/types";

function isProvider(value: string): value is TicketingProvider {
  return value === "weezevent";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;

  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = await handleTicketingWebhook({
    provider,
    body,
    headers: request.headers
  });

  return NextResponse.json({ success: true, parsed });
}
