import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import {
  listTicketingIntegrations,
  upsertTicketingIntegration
} from "@/lib/server/ticketing-store";
import type {
  TicketingCredentialInput,
  TicketingProvider
} from "@/lib/ticketing/types";

function canManageTicketing(role: string, isBandosAdmin: boolean) {
  return isBandosAdmin || role === "owner" || role === "admin";
}

function isProvider(value: string): value is TicketingProvider {
  return value === "ticket-tailor" || value === "eventbrite";
}

export async function GET() {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const integrations = await listTicketingIntegrations(session.workspaceId);

  return NextResponse.json(
    { integrations },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function POST(request: Request) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageTicketing(session.role, session.isBandosAdmin)) {
    return NextResponse.json(
      { error: "Only owners and admins can connect ticketing providers." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        integrationId?: string | null;
        provider?: string;
        label?: string;
        credentials?: TicketingCredentialInput;
      }
    | null;

  if (!body || !isProvider(String(body.provider ?? ""))) {
    return NextResponse.json(
      { error: "A valid ticketing provider is required." },
      { status: 400 }
    );
  }

  const provider = body.provider as TicketingProvider;
  const credentials = body.credentials ?? {};

  if (
    provider === "ticket-tailor" &&
    !credentials.apiKey?.trim()
  ) {
    return NextResponse.json(
      { error: "Ticket Tailor requires an API key." },
      { status: 400 }
    );
  }

  if (
    provider === "eventbrite" &&
    !credentials.privateToken?.trim()
  ) {
    return NextResponse.json(
      { error: "Eventbrite requires a private token." },
      { status: 400 }
    );
  }

  const integration = await upsertTicketingIntegration({
    workspaceId: session.workspaceId,
    provider,
    label: body.label?.trim() || "",
    credentials,
    integrationId: body.integrationId ?? null
  });

  return NextResponse.json({ integration });
}
