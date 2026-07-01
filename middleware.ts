import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const hasSession = Boolean(request.cookies.get("bandos_session")?.value);
  const onboarded = request.cookies.get("bandos_onboarded")?.value === "1";

  if (
    (request.method === "GET" || request.method === "HEAD") &&
    host === "www.bandos.online"
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.host = "bandos.online";
    redirectUrl.protocol = "https:";
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (pathname.startsWith("/app")) {
    if (!hasSession) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }

    if (!onboarded) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  if (pathname.startsWith("/bandos-admin")) {
    if (!hasSession) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }
  }

  if (pathname.startsWith("/onboarding")) {
    if (!hasSession) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }

    if (onboarded) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
  }

  if (pathname.startsWith("/auth") && hasSession && onboarded) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|favicon.svg).*)"]
};
