import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuration du wrapper natif.
 *
 * L'application est rendue par Next (SSR + routes API) : la WebView charge
 * donc une URL serveur, elle ne peut pas embarquer un export statique.
 *
 * - Production : `CAPACITOR_SERVER_URL=https://votre-domaine` avant
 *   `npx cap sync android` (HTTPS obligatoire pour Google et les cookies).
 * - Émulateur Android local : sans variable, on vise `10.0.2.2:3000`, qui
 *   correspond au `localhost` de la machine hôte.
 * - Téléphone réel en local : passer l'IP LAN, par exemple
 *   `CAPACITOR_SERVER_URL=http://192.168.1.203:3000 npx cap sync android`.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const resolvedUrl = serverUrl || "http://10.0.2.2:3000";
const isHttps = resolvedUrl.startsWith("https://");

if (!serverUrl) {
  console.warn(
    "[capacitor] CAPACITOR_SERVER_URL absent : repli sur http://10.0.2.2:3000 (émulateur).",
  );
}

const config: CapacitorConfig = {
  appId: "fr.adeux.app",
  appName: "À deux",
  webDir: "public",
  backgroundColor: "#08050c",
  server: {
    url: resolvedUrl,
    cleartext: !isHttps,
    androidScheme: isHttps ? "https" : "http",
  },
  android: {
    allowMixedContent: !isHttps,
  },
};

export default config;
