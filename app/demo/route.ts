import { NextResponse } from "next/server";

import {
  getDemoOwnerAccount,
  getDemoWorkspace
} from "@/lib/server/workspace-store";

export async function GET(request: Request) {
  const [demoUser, demoWorkspace] = await Promise.all([
    getDemoOwnerAccount(),
    getDemoWorkspace()
  ]);

  const response = NextResponse.redirect(new URL("/app", request.url));

  if (!demoUser || !demoWorkspace) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=demo_unavailable", request.url));
  }

  const cookieConfig = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: false
  };

  response.cookies.set("bandos_session", "1", cookieConfig);
  response.cookies.set("bandos_user_id", demoUser.id, cookieConfig);
  response.cookies.set("bandos_name", demoUser.name, cookieConfig);
  response.cookies.set("bandos_email", demoUser.email, cookieConfig);
  response.cookies.set("bandos_role", demoUser.role, cookieConfig);
  response.cookies.set("bandos_workspace_id", demoWorkspace.id, cookieConfig);
  response.cookies.set("bandos_workspace", demoWorkspace.name, cookieConfig);
  response.cookies.set("bandos_logo", demoWorkspace.logoUrl, cookieConfig);
  response.cookies.set("bandos_currency", demoWorkspace.currency, cookieConfig);
  response.cookies.set("bandos_locale", demoWorkspace.locale, cookieConfig);
  response.cookies.set("bandos_genre", demoWorkspace.genre, cookieConfig);
  response.cookies.set("bandos_country", demoWorkspace.country, cookieConfig);
  response.cookies.set("bandos_onboarded", demoWorkspace.onboarded ? "1" : "0", cookieConfig);
  response.cookies.set("bandos_first_tour", "Northbound Ruin 2026", cookieConfig);

  return response;
}
