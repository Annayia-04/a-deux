import "server-only";

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import {
  deletePushDevicesByTokens,
  listPartnerPushTokens,
} from "@/lib/db";

/**
 * Notifications push via Firebase Cloud Messaging.
 *
 * Tant que `FIREBASE_SERVICE_ACCOUNT` n'est pas renseigné, l'envoi est
 * silencieusement ignoré : les pings restent visibles dans l'application.
 */

const APP_NAME = "a-deux";
const MAX_BATCH = 500;
const INVALID_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return null;
    }
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\n/g, "\n"),
    };
  } catch {
    console.error("[push] FIREBASE_SERVICE_ACCOUNT n’est pas un JSON valide.");
    return null;
  }
}

function firebaseApp(): App | null {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;

  const account = serviceAccount();
  if (!account) return null;

  return initializeApp({ credential: cert(account) }, APP_NAME);
}

export function isPushConfigured(): boolean {
  return serviceAccount() !== null;
}

export async function sendPushToTokens(
  tokens: string[],
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
  },
): Promise<void> {
  if (tokens.length === 0) return;

  const app = firebaseApp();
  if (!app) return;

  const messaging = getMessaging(app);
  const invalid: string[] = [];

  for (let start = 0; start < tokens.length; start += MAX_BATCH) {
    const batch = tokens.slice(start, start + MAX_BATCH);
    try {
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
        android: {
          priority: "high",
          notification: {
            channelId: "a_deux_ping",
            icon: "ic_stat_ping",
            color: "#9E192D",
            sound: "default",
          },
        },
      });

      result.responses.forEach((response, index) => {
        if (response.success) return;
        const code = response.error?.code;
        if (code && INVALID_CODES.has(code)) invalid.push(batch[index]!);
      });
    } catch (error) {
      // Aucun jeton dans les logs.
      console.error("[push] envoi FCM impossible :", error);
    }
  }

  await deletePushDevicesByTokens(invalid).catch(() => undefined);
}

/** Prévient l'autre membre qu'une pensée vient d'arriver. */
export async function notifyPartnerOfTap(
  coupleId: string,
  fromSession: string,
): Promise<void> {
  try {
    const tokens = await listPartnerPushTokens(coupleId, fromSession);
    await sendPushToTokens(tokens, {
      title: "Une pensée pour toi",
      body: "Votre partenaire vous a envoyé un petit ping.",
      data: { type: "tap", url: "/?duo=1" },
    });
  } catch (error) {
    console.error("[push] notification du ping impossible :", error);
  }
}
