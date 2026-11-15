import type { MetadataRoute } from "next";

/**
 * Manifeste PWA : installation depuis Safari (iOS) et Chrome (Android,
 * desktop). Les icônes sont locales, aucune requête externe n'est nécessaire.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "À deux — Idées de rendez-vous",
    short_name: "À deux",
    description:
      "Des idées de rendez-vous à swiper, filtrées selon vos envies, et un espace à deux pour choisir ensemble.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a090c",
    theme_color: "#0a090c",
    lang: "fr",
    dir: "ltr",
    categories: ["lifestyle", "social"],
    /*
     * Raccourci de l'icône installée (appui long sur l'icône).
     * « Mon duo » ouvre directement l'espace à deux. Le ping instantané est
     * réservé au widget et à la tuile Réglages rapides Android, qui n'ouvrent
     * pas l'application.
     */
    shortcuts: [
      {
        name: "Mon duo",
        short_name: "Duo",
        description: "Ouvrir votre espace à deux : matchs, souvenirs et envies.",
        url: "/?duo=1",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
