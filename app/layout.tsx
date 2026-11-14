import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { parseTheme, THEME_COOKIE } from "@/lib/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "À deux — Trouvez votre prochain rendez-vous",
  description:
    "Choisissez votre budget, l'ambiance et le lieu, puis swipez pour trouver l'idée de rendez-vous qui vous ressemble. Sans compte, sans données personnelles.",
  applicationName: "À deux",
  manifest: "/manifest.webmanifest",
  authors: [{ name: "À deux" }],
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "À deux",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    title: "À deux — Trouvez votre prochain rendez-vous",
    description:
      "Des idées de rendez-vous à swiper, filtrées selon vos envies. Sans compte, sans données personnelles.",
    type: "website",
    locale: "fr_FR",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a090c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const theme = parseTheme(store.get(THEME_COOKIE)?.value);

  return (
    <html lang="fr" data-theme={theme}>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
