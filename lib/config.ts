import type { AuthProvider } from "@/lib/auth/provider";

/**
 * Lecture centralisée de la configuration serveur.
 * Aucune variable n’est obligatoire : l’application reste pleinement
 * fonctionnelle en session anonyme + SQLite quand rien n’est défini.
 * Les modules qui dépendent d’un fournisseur doivent vérifier son drapeau
 * avant de s’en servir, pour ne jamais exposer un bouton mort.
 */

function read(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** URL Postgres. Absente → SQLite (développement et tests). */
export function databaseUrl(): string | null {
  return read("DATABASE_URL");
}

/** URL directe (sans pooler) pour les migrations. */
export function databaseUrlDirect(): string | null {
  return read("DATABASE_URL_DIRECT") ?? databaseUrl();
}

export function isPostgresEnabled(): boolean {
  return databaseUrl() !== null;
}

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
};

export function googleConfig(): GoogleConfig | null {
  const clientId = read("GOOGLE_CLIENT_ID");
  const clientSecret = read("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export type AppleConfig = {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
};

export function appleConfig(): AppleConfig | null {
  const clientId = read("APPLE_CLIENT_ID");
  const teamId = read("APPLE_TEAM_ID");
  const keyId = read("APPLE_KEY_ID");
  const privateKey = read("APPLE_PRIVATE_KEY");
  if (!clientId || !teamId || !keyId || !privateKey) return null;
  return { clientId, teamId, keyId, privateKey };
}

export function isProviderConfigured(provider: AuthProvider): boolean {
  return provider === "google" ? googleConfig() !== null : appleConfig() !== null;
}

/** Fournisseurs réellement configurés, dans l’ordre d’affichage des boutons. */
export function enabledAuthProviders(): AuthProvider[] {
  const providers: AuthProvider[] = [];
  if (googleConfig()) providers.push("google");
  if (appleConfig()) providers.push("apple");
  return providers;
}

/** Secret de signature des cookies OAuth (`state`, `nonce`). */
export function authCookieSecret(): string | null {
  return read("APP_SESSION_SECRET");
}
