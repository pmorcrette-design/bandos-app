import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import {
  deleteWorkspaceAccessUser,
  updateWorkspaceAccessUser
} from "@/lib/server/workspace-store";

function canManageTeam(role: string) {
  return role === "owner" || role === "admin";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageTeam(session.role)) {
    return NextResponse.json(
      { error: "Only owners and admins can manage team access." },
      { status: 403 }
    );
  }

  const { userId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        email?: string;
        password?: string;
        role?: "owner" | "admin" | "member" | "viewer";
        title?: string;
      }
    | null;

  if (body?.password?.trim() && body.password.trim().length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 }
    );
  }

  try {
    const user = await updateWorkspaceAccessUser({
      workspaceId: session.workspaceId,
      userId,
      name: body?.name,
      email: body?.email,
      password: body?.password,
      role: body?.role,
      title: body?.title
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMAIL_ALREADY_IN_USE") {
        return NextResponse.json(
          { error: "This email already exists in BandOS." },
          { status: 409 }
        );
      }

      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json(
          { error: "This team access no longer exists." },
          { status: 404 }
        );
      }
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageTeam(session.role)) {
    return NextResponse.json(
      { error: "Only owners and admins can manage team access." },
      { status: 403 }
    );
  }

  const { userId } = await context.params;

  if (userId === session.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own active login here." },
      { status: 400 }
    );
  }

  try {
    await deleteWorkspaceAccessUser({
      workspaceId: session.workspaceId,
      userId
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "LAST_OWNER") {
        return NextResponse.json(
          { error: "Keep at least one owner on the workspace." },
          { status: 400 }
        );
      }

      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json(
          { error: "This team access no longer exists." },
          { status: 404 }
        );
      }
    }

    throw error;
  }
}
