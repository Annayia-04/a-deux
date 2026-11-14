/**
 * Origine publique utilisée pour construire l'URI de redirection OAuth.
 * Derrière un reverse proxy, `x-forwarded-proto`/`x-forwarded-host` font foi.
 * `APP_ORIGIN` permet de forcer une valeur (utile quand le serveur tourne sur
 * un autre port que celui déclaré chez Google).
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // valeur invalide : on retombe sur la requête
    }
  }

  const url = new URL(request.url);
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();

  const proto = forwardedProto || url.protocol.replace(":", "");
  const host = forwardedHost || request.headers.get("host") || url.host;
  return `${proto}://${host}`;
}
