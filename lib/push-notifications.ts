"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { api } from "@/lib/api-client";

const CHANNEL_ID = "a_deux_ping";

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

function platform(): "android" | "ios" | "web" {
  const value = Capacitor.getPlatform();
  if (value === "android") return "android";
  if (value === "ios") return "ios";
  return "web";
}

export function isPushSupported(): boolean {
  return Capacitor.isNativePlatform();
}

async function ensureChannel(): Promise<void> {
  if (platform() !== "android") return;
  await PushNotifications.createChannel({
    id: CHANNEL_ID,
    name: "Pensées",
    description: "Les petits pings de votre partenaire.",
    importance: 4,
    visibility: 1,
    vibration: true,
  }).catch(() => undefined);
}

export async function pushPermission(): Promise<PushPermission> {
  if (!isPushSupported()) return "unsupported";
  const status = await PushNotifications.checkPermissions();
  if (status.receive === "granted") return "granted";
  if (status.receive === "denied") return "denied";
  return "prompt";
}

/** Demande l'autorisation puis enregistre le jeton FCM. */
export async function enablePushNotifications(): Promise<PushPermission> {
  if (!isPushSupported()) return "unsupported";

  const current = await pushPermission();
  if (current === "denied") return "denied";

  if (current === "prompt") {
    const requested = await PushNotifications.requestPermissions();
    if (requested.receive !== "granted") {
      return requested.receive === "denied" ? "denied" : "prompt";
    }
  }

  await ensureChannel();
  await PushNotifications.register();
  return "granted";
}

/**
 * Branche les écouteurs FCM une seule fois. Si l'autorisation est déjà
 * accordée et qu'une session existe, rafraîchit le jeton au démarrage.
 */
export function usePushNotifications({
  enabled,
  onError,
}: {
  enabled: boolean;
  onError: (message: string) => void;
}): void {
  const callbacks = useRef({ enabled, onError });
  callbacks.current = { enabled, onError };

  // Session créée après l'ouverture : on enregistre le jeton si l'autorisation
  // est déjà accordée (le premier prompt reste déclenché par la carte).
  useEffect(() => {
    if (!enabled || !isPushSupported()) return;
    let cancelled = false;
    void (async () => {
      const permission = await pushPermission();
      if (cancelled || permission !== "granted") return;
      await ensureChannel();
      await PushNotifications.register().catch(() => undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!isPushSupported()) return;

    let disposed = false;
    const removers: (() => void)[] = [];

    void (async () => {
      await ensureChannel();

      const registration = await PushNotifications.addListener(
        "registration",
        ({ value }) => {
          if (!callbacks.current.enabled) return;
          void api
            .registerPushDevice(value, platform())
            .catch(() =>
              callbacks.current.onError(
                "Impossible d’enregistrer les notifications sur ce téléphone.",
              ),
            );
        },
      );
      removers.push(() => void registration.remove());

      const registrationError = await PushNotifications.addListener(
        "registrationError",
        () => {
          callbacks.current.onError(
            "Les notifications ne sont pas disponibles sur cette version.",
          );
        },
      );
      removers.push(() => void registrationError.remove());

      const action = await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (event) => {
          const url = event.notification.data?.url;
          window.location.href =
            typeof url === "string" && url.startsWith("/") ? url : "/?duo=1";
        },
      );
      removers.push(() => void action.remove());

      if (disposed) return;

      // Autorisation déjà donnée : on rafraîchit le jeton sans prompt.
      const permission = await pushPermission();
      if (permission === "granted" && callbacks.current.enabled) {
        await PushNotifications.register().catch(() => undefined);
      }
    })();

    return () => {
      disposed = true;
      for (const remove of removers) remove();
    };
  }, []);
}
