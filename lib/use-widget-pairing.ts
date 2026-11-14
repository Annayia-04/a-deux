"use client";

import { useEffect, useRef } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { api } from "@/lib/api-client";

/**
 * Pont vers le widget natif Android.
 *
 * En navigateur (PWA), ce module ne fait rien : `Capacitor.isNativePlatform()`
 * est faux et le plugin n'est jamais appelé. Dans l'app Capacitor, on associe
 * l'appareil une seule fois, puis on confie le jeton au stockage natif : le
 * widget peut ensuite envoyer un petit ping sans ouvrir l'application.
 */
type WidgetBridgePlugin = {
  getPingToken(): Promise<{ token: string | null }>;
  savePingToken(options: {
    token: string;
    endpoint: string;
    label?: string;
  }): Promise<void>;
  clearPingToken(): Promise<void>;
};

const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

function deviceLabel(): string {
  const platform = Capacitor.getPlatform();
  if (platform === "android") return "Android";
  if (platform === "ios") return "iPhone";
  return "Appareil";
}

export function useWidgetPairing({ enabled }: { enabled: boolean }): void {
  const handled = useRef(false);

  useEffect(() => {
    if (!enabled || handled.current) return;
    if (!Capacitor.isNativePlatform()) return;

    handled.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const existing = await WidgetBridge.getPingToken();
        if (existing.token) {
          // Le jeton peut avoir été révoqué, ou la base réinitialisée : on le
          // vérifie avant de le conserver, sinon le widget resterait muet.
          const state = await api.verifyWidgetToken(existing.token);
          if (state === "valid") {
            // On rafraîchit seulement l'URL du serveur, utile si l'app a été
            // recompilée avec un autre domaine.
            await WidgetBridge.savePingToken({
              token: existing.token,
              endpoint: window.location.origin,
              label: deviceLabel(),
            });
            return;
          }
          if (state === "unknown") return;
          await WidgetBridge.clearPingToken();
        }

        const { token } = await api.pairWidget(deviceLabel());
        if (cancelled) return;
        await WidgetBridge.savePingToken({
          token,
          endpoint: window.location.origin,
          label: deviceLabel(),
        });
      } catch {
        // Le widget est un confort : un échec d'association ne doit jamais
        // gêner l'application. On retentera au prochain lancement.
        handled.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
