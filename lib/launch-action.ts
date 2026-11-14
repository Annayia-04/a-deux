/**
 * Actions de lancement depuis l'écran d'accueil (raccourcis du manifeste PWA).
 *
 * Les raccourcis ouvrent l'application avec un paramètre `?ping=1` ou
 * `?duo=1`. Le paramètre est retiré de l'URL dès sa lecture pour qu'un
 * rechargement ne rejoue pas l'action (et ne renvoie pas un ping).
 */

export type LaunchAction = "ping" | "duo" | null;

const ACTION_PARAMS = ["ping", "duo"] as const;

export function readLaunchAction(search: string): LaunchAction {
  const params = new URLSearchParams(search);
  if (params.get("ping") === "1") return "ping";
  if (params.get("duo") === "1") return "duo";
  return null;
}

/** Requête nettoyée, sans les paramètres d'action (chaîne vide si plus rien). */
export function stripLaunchParams(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of ACTION_PARAMS) params.delete(key);
  return params.toString();
}
