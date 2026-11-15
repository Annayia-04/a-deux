import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { DownloadIcon, LockIcon, SparklesIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Application Android — À deux",
  description:
    "Installer À deux sur Android avec le widget et la tuile « Petit ping ».",
};

export default function TelechargerPage() {
  return (
    <main className="mx-auto flex min-h-screen min-h-dvh w-full max-w-2xl flex-col px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[max(2.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
      <Brand />

      <section className="grimoire ornament-corners relative mt-8 overflow-hidden rounded-[28px] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/85">
          <SparklesIcon className="h-3.5 w-3.5" />
          Application Android
        </p>
        <h1 className="balance mt-3 font-display text-[34px] leading-[1.02] text-cream sm:text-[42px]">
          À deux, dans votre poche.
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-cream/60">
          Le widget et la tuile « Petit ping » envoient une pensée sans ouvrir
          l’application. La connexion Google s’ouvre dans votre navigateur, puis
          revient automatiquement dans l’app.
        </p>

        <a
          href="/api/download/android"
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-3 text-[13.5px] font-semibold text-cream shadow-[0_16px_34px_-16px_rgba(158,25,45,0.95)] transition hover:border-gold/70 hover:brightness-110"
        >
          <DownloadIcon className="h-4 w-4" />
          Télécharger l’APK Android
        </a>
        <p className="mt-2 text-[10.5px] text-ash">
          Environ 5 Mo · Android 7 ou plus · hors Play Store
        </p>

        <ol className="mt-6 space-y-3 text-[12.5px] leading-relaxed text-cream/70">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/10 text-[11px] font-semibold text-gold">
              1
            </span>
            Télécharge le fichier, puis ouvre-le depuis les notifications ou
            l’application Fichiers.
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/10 text-[11px] font-semibold text-gold">
              2
            </span>
            Autorise « Installer des applications inconnues » pour Chrome ou
            Fichiers, puis installe.
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/10 text-[11px] font-semibold text-gold">
              3
            </span>
            Ouvre l’app, connecte-toi avec Google et crée ton duo. Le widget
            s’associe dès que le duo est complet.
          </li>
        </ol>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-gold/15 bg-ink-850/60 px-3 py-2.5 text-[11px] leading-relaxed text-ash">
          <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/60" />
          <span>
            L’APK est servi en HTTPS depuis ce site. Les données restent
            protégées par votre session et votre duo ; aucune donnée n’est
            partagée avec un tiers.
          </span>
        </div>
      </section>

      <a
        href="/"
        className="mt-6 self-center text-[12px] text-cream/45 transition hover:text-cream/70"
      >
        ← Retour à l’application
      </a>
    </main>
  );
}
