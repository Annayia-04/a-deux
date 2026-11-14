"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker uniquement en production : en développement,
 * Next recharge les chunks en continu et le cache fausserait le diagnostic.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Pas de service worker (HTTP non sécurisé, navigation privée) :
        // l'application reste pleinement utilisable en ligne.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
