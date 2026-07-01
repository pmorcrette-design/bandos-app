export async function GET(request: Request) {
  return Response.redirect(new URL("/auth/sign-in", request.url), 307);
}
