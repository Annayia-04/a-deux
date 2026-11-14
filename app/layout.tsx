import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "À deux — Trouvez votre prochain rendez-vous",
  description:
    "Choisissez votre budget, l'ambiance et le lieu, puis swipez pour trouver l'idée de rendez-vous qui vous ressemble. Sans compte, sans données personnelles.",
  applicationName: "À deux",
  authors: [{ name: "À deux" }],
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
  themeColor: "#08050c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
