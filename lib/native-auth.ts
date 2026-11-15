"use client";

import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { api, ApiError } from "@/lib/api-client";

const NATIVE_AUTH_URL = "fr.adeux.app://auth";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Démarre Google. Dans l'application native, la page s'ouvre dans le
 * navigateur système : Google refuse les WebViews embarquées. Le retour se fait
 * par le deep link `fr.adeux.app://auth`, avec un code à usage unique.
 */
export async function startGoogleSignIn(): Promise<void> {
  const path = "/api/auth/google?native=1";
  if (!isNativeApp()) {
    window.location.href = path;
    return;
  }
  const url = new URL(path, window.location.origin).toString();
  await Browser.open({ url });
}

/**
 * Écoute le retour du navigateur système et échange le code contre la session
 * de la WebView. Sans effet dans un navigateur classique.
 */
export function useNativeAuthListener({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
}): void {
  const callbacks = useRef({ onSuccess, onError });
  callbacks.current = { onSuccess, onError };

  useEffect(() => {
    if (!isNativeApp()) return;

    let disposed = false;
    let remove: (() => void) | null = null;

    void App.addListener("appUrlOpen", ({ url }) => {
      if (!url.startsWith(NATIVE_AUTH_URL)) return;

      void (async () => {
        await Browser.close().catch(() => undefined);
        if (disposed) return;

        let code: string | null = null;
        let error: string | null = null;
        try {
          const parsed = new URL(url);
          code = parsed.searchParams.get("code");
          error = parsed.searchParams.get("error");
        } catch {
          error = "erreur";
        }

        if (!code) {
          callbacks.current.onError(
            error === "refus"
              ? "Connexion annulée."
              : "La connexion Google a échoué. Réessayez.",
          );
          return;
        }

        try {
          await api.exchangeNativeAuth(code);
          callbacks.current.onSuccess();
        } catch (caught) {
          callbacks.current.onError(
            caught instanceof ApiError
              ? caught.message
              : "Impossible de finaliser la connexion.",
          );
        }
      })();
    }).then((listener) => {
      if (disposed) void listener.remove();
      else remove = () => void listener.remove();
    });

    return () => {
      disposed = true;
      remove?.();
    };
  }, []);
}
