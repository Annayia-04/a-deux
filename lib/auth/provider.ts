/**
 * Fournisseurs d’identité supportés. Type volontairement séparé du code
 * serveur : il est importable depuis un composant client pour l’affichage
 * des boutons, sans embarquer de secret.
 */
export const AUTH_PROVIDERS = ["google", "apple"] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const AUTH_PROVIDER_LABELS: Record<AuthProvider, string> = {
  google: "Google",
  apple: "Apple",
};
