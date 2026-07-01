import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getLocalePreference } from "@/lib/preferences";
import { createWorkspaceAccessUser } from "@/lib/server/workspace-store";
import { buildTeamInviteEmail, sendTransactionalEmail } from "@/lib/server/email";

function canManageTeam(role: string) {
  return role === "owner" || role === "admin";
}

export async function POST(request: Request) {
  const [session, locale] = await Promise.all([
    getSessionUser(),
    getLocalePreference()
  ]);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageTeam(session.role)) {
    return NextResponse.json(
      { error: "Only owners and admins can manage team access." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        email?: string;
        password?: string;
        role?: "owner" | "admin" | "member" | "viewer";
        title?: string;
      }
    | null;

  if (!body?.name?.trim() || !body?.email?.trim() || !body?.password?.trim()) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 }
    );
  }

  if (body.password.trim().length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 }
    );
  }

  try {
    const user = await createWorkspaceAccessUser({
      workspaceId: session.workspaceId,
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role ?? "member",
      title: body.title ?? "Team member"
    });

    let emailSent = false;

    try {
      const inviteEmail = buildTeamInviteEmail({
        recipientName: user.name,
        workspaceName: session.workspace,
        email: user.email,
        temporaryPassword: body.password,
        locale
      });

      await sendTransactionalEmail({
        to: user.email,
        subject: inviteEmail.subject,
        html: inviteEmail.html,
        text: inviteEmail.text
      });
      emailSent = true;
    } catch (error) {
      console.warn("BandOS team invite email failed:", error);
    }

    return NextResponse.json({ user, emailSent });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_IN_USE") {
      return NextResponse.json(
        { error: "This email already exists in BandOS." },
        { status: 409 }
      );
    }

    throw error;
  }
}
