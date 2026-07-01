import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getLocalePreference } from "@/lib/preferences";
import {
  buildBandosAdminInviteEmail,
  sendTransactionalEmail
} from "@/lib/server/email";
import {
  createBandosPlatformAdminAccount,
  listBandosPlatformAdminAccounts
} from "@/lib/server/workspace-store";

export async function GET() {
  const session = await getSessionUser();

  if (!session?.isBandosAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await listBandosPlatformAdminAccounts();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const [session, locale] = await Promise.all([
    getSessionUser(),
    getLocalePreference()
  ]);

  if (!session?.isBandosAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        email?: string;
        password?: string;
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
    const user = await createBandosPlatformAdminAccount({
      name: body.name,
      email: body.email,
      password: body.password,
      title: body.title ?? "BandOS platform admin"
    });

    let emailSent = false;

    try {
      const inviteEmail = buildBandosAdminInviteEmail({
        recipientName: user.name,
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
      console.warn("BandOS admin invite email failed:", error);
    }

    return NextResponse.json({ user, emailSent });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_IN_USE") {
      return NextResponse.json(
        { error: "This email already exists in BandOS." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create admin account." },
      { status: 400 }
    );
  }
}
