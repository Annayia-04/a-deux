"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { api } from "@/lib/api-client";

/**
 * Pont vers le stockage natif du widget et de la tuile « Petit ping ».
 * En navigateur, rien n'est appelé : `Capacitor.isNativePlatform()` est faux.
 */
export type WidgetBridgePlugin = {
  getPingToken(): Promise<{ token: string | null }>;
  savePingToken(options: {
    token: string;
    endpoint: string;
    label?: string;
  }): Promise<void>;
  clearPingToken(): Promise<void>;
};

export const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

export function isNativeWidgetPlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function widgetDeviceLabel(): string {
  const platform = Capacitor.getPlatform();
  if (platform === "android") return "Android";
  if (platform === "ios") return "iPhone";
  return "Appareil";
}

export type PairOutcome = "paired" | "existing" | "unknown";

/**
 * Associe l'appareil, ou rafraîchit l'URL du serveur si le jeton est encore
 * valide. Un jeton révoqué est remplacé automatiquement.
 */
export async function pairWidgetDevice(): Promise<PairOutcome> {
  if (!isNativeWidgetPlatform()) {
    throw new Error("Widget disponible uniquement dans l’application native.");
  }

  const existing = await WidgetBridge.getPingToken();
  if (existing.token) {
    const validity = await api.verifyWidgetToken(existing.token);
    if (validity === "valid") {
      await WidgetBridge.savePingToken({
        token: existing.token,
        endpoint: window.location.origin,
        label: widgetDeviceLabel(),
      });
      return "existing";
    }
    if (validity === "unknown") return "unknown";
    await WidgetBridge.clearPingToken();
  }

  const { token } = await api.pairWidget(widgetDeviceLabel());
  await WidgetBridge.savePingToken({
    token,
    endpoint: window.location.origin,
    label: widgetDeviceLabel(),
  });
  return "paired";
}
