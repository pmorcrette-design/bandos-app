import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  clearBaseSessionCookies,
  setBaseSessionCookies
} from "@/lib/auth/cookies";
import { authenticateWorkspaceUser } from "@/lib/server/workspace-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string;
        password?: string;
      }
    | null;

  if (!body?.email?.trim() || !body?.password?.trim()) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const session = await authenticateWorkspaceUser(body.email, body.password);
  const cookieStore = await cookies();

  if (!session) {
    clearBaseSessionCookies(cookieStore);
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  setBaseSessionCookies(cookieStore, session);

  return NextResponse.json({
    success: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role
    },
    workspace: {
      id: session.workspace.id,
      name: session.workspace.name,
      currency: session.workspace.currency,
      locale: session.workspace.locale
    }
  });
}
