import "server-only";

import {
  countActiveWidgetDevices,
  createWidgetDevice,
  getWidgetDevice,
  revokeWidgetDevice,
  touchWidgetDevice,
} from "@/lib/db";
import { HttpError } from "@/lib/http";
import { generateSessionToken, hashToken, isValidSessionToken } from "@/lib/session-token";
import { sendTapForSession } from "@/lib/taps";
import type { TapSnapshot } from "@/lib/types";

/** Un même téléphone peut réinstaller l'app : on garde une marge raisonnable. */
export const MAX_WIDGET_DEVICES = 5;

/**
 * Associe un appareil (widget natif) à la session canonique.
 * Le jeton n'est renvoyé qu'une seule fois, en clair ; seul son hash est
 * stocké. Il ne permet que d'envoyer un petit ping.
 */
export async function pairWidgetForSession(
  sessionId: string,
  label: string | null,
): Promise<string> {
  if ((await countActiveWidgetDevices(sessionId)) >= MAX_WIDGET_DEVICES) {
    throw new HttpError(
      409,
      "Trop d’appareils sont déjà associés. Retirez-en un avant d’en ajouter un autre.",
    );
  }

  const { token, hash } = generateSessionToken();
  await createWidgetDevice(hash, sessionId, label);
  return token;
}

/** Envoi d'un ping depuis un widget, sans cookie ni session navigateur. */
export type WidgetDevice = { sessionId: string; tokenHash: string };

/**
 * Vérifie le jeton avant toute limitation de débit : un jeton inconnu doit
 * toujours recevoir 401, jamais 429, et ne doit pas consommer de quota.
 */
export async function resolveWidgetDevice(
  token: string,
): Promise<WidgetDevice> {
  if (!isValidSessionToken(token)) {
    throw new HttpError(401, "Widget non reconnu. Réassociez-le depuis l’application.");
  }

  const tokenHash = hashToken(token);
  const device = await getWidgetDevice(tokenHash);
  if (!device) {
    throw new HttpError(401, "Widget non reconnu. Réassociez-le depuis l’application.");
  }

  return { sessionId: device.sessionId, tokenHash };
}

export async function sendWidgetPingForDevice(
  device: WidgetDevice,
): Promise<TapSnapshot> {
  const tap = await sendTapForSession(device.sessionId);
  await touchWidgetDevice(device.tokenHash);
  return tap;
}

/** Révoque un appareil ; la session et le duo restent intacts. */
export async function revokeWidgetForSession(
  sessionId: string,
  token: string,
): Promise<boolean> {
  if (!isValidSessionToken(token)) return false;
  return revokeWidgetDevice(hashToken(token), sessionId);
}
