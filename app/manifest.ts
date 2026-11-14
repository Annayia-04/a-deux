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
    background_color: "#08050c",
    theme_color: "#08050c",
    lang: "fr",
    dir: "ltr",
    categories: ["lifestyle", "social"],
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
