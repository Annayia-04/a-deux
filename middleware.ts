import { NextResponse, type NextRequest } from "next/server";

/**
 * CSP à nonce : Next.js applique automatiquement le nonce aux scripts qu'il
 * génère. `strict-dynamic` évite d'avoir à maintenir une liste d'hôtes.
 * Le style inline reste autorisé (motion + styles calculés).
 */
export function middleware(request: NextRequest): NextResponse {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== "production";

  // `upgrade-insecure-requests` casserait les assets servis en HTTP local
  // (notamment via une IP de réseau) : on ne l'active que derrière HTTPS.
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const isHttps = forwardedProto
    ? forwardedProto === "https"
    : request.nextUrl.protocol === "https:";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://upload.wikimedia.org",
    "font-src 'self'",
    "connect-src 'self'",
    // PWA : le service worker et le manifeste sont servis depuis le même origine.
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isHttps ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
