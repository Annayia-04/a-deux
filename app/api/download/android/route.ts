import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redirige vers l'APK hébergé (Vercel Blob). L'URL vit dans
 * `ANDROID_APK_URL` pour pouvoir publier une nouvelle version sans
 * redéployer le code.
 */
export async function GET(): Promise<NextResponse> {
  const url = process.env.ANDROID_APK_URL?.trim();
  if (!url || !url.startsWith("https://")) {
    return NextResponse.json(
      { error: "L’application Android n’est pas disponible pour le moment." },
      { status: 404 },
    );
  }
  const response = NextResponse.redirect(url, 302);
  response.headers.set("cache-control", "no-store, max-age=0");
  return response;
}
