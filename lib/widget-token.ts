import { isValidSessionToken } from "@/lib/session-token";

/**
 * Lecture du jeton d'appareil envoyé par le widget natif.
 * Le jeton ne circule que dans un en-tête `Authorization: Bearer …`
 * (ou `X-Widget-Token`), jamais dans l'URL : il ne doit pas finir dans les
 * journaux d'accès ou l'historique.
 */
export function readWidgetToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    if (match && isValidSessionToken(match[1]!)) return match[1]!;
    return null;
  }

  const header = request.headers.get("x-widget-token");
  if (header && isValidSessionToken(header.trim())) return header.trim();
  return null;
}
