"use client";

import { motion } from "motion/react";
import {
  ArrowRightIcon,
  HeartIcon,
  ShareIcon,
  SparklesIcon,
  XIcon,
} from "@/components/icons";

/** Contenu générique : idées, plats ou films partagent la même célébration. */
export type CelebrationData = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  gradient: readonly [string, string];
  kicker?: string;
  heading?: string;
  ctaLabel?: string;
  duoTab?: "matches" | "souvenirs" | "choices";
  /** Texte prêt à partager pour proposer le rendez-vous. */
  shareText?: string;
  /** Élément à préremplir dans le Date Builder. */
  builder?: { slot: "activity" | "food" | "movie"; id: string } | null;
};

type Props = {
  data: CelebrationData;
  onClose: () => void;
  onOpenDuo: () => void;
  onShare?: () => void;
  onAddToSoiree?: () => void;
};

export function MatchCelebration({
  data,
  onClose,
  onOpenDuo,
  onShare,
  onAddToSoiree,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md"
      role="alertdialog"
      aria-modal="true"
      aria-label="Nouveau match avec votre partenaire"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="frame-gold relative w-full max-w-sm overflow-hidden rounded-[28px] border border-gold/30 bg-ink-900 p-6 text-center shadow-[0_40px_100px_-30px_rgba(122,17,32,0.55)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la notification"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full border border-gold/20 bg-ink-800/70 text-cream/55 transition hover:border-gold/40 hover:text-cream"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose/20 via-ember/10 to-transparent" />

        <div className="relative">
          <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-gold/35 bg-gold/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
            <SparklesIcon className="h-3 w-3" />
            {data.kicker ?? "Match à deux"}
          </div>

          <div className="relative mx-auto mt-5 grid h-24 w-24 place-items-center">
            <span
              aria-hidden
              className="absolute inset-0 rounded-[26px] opacity-80 blur-xl"
              style={{
                backgroundImage: `linear-gradient(145deg, ${data.gradient[0]}, ${data.gradient[1]})`,
              }}
            />
            <div
              className="relative grid h-24 w-24 place-items-center rounded-[26px] text-[46px] ring-1 ring-gold/30"
              style={{
                backgroundImage: `linear-gradient(145deg, ${data.gradient[0]}, ${data.gradient[1]})`,
              }}
            >
              {data.emoji}
            </div>
            <span
              aria-hidden
              className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full border border-gold/50 bg-gradient-to-br from-ember to-rose text-cream shadow-lg"
            >
              <HeartIcon className="h-5 w-5" />
            </span>
            <span
              aria-hidden
              className="absolute -left-3 -top-2 grid h-7 w-7 place-items-center rounded-full border border-gold/50 bg-gradient-to-br from-rose to-[#3d0a12] text-gold shadow-lg"
            >
              <HeartIcon className="h-4 w-4" />
            </span>
          </div>

          <h2 className="balance mt-5 font-display text-[28px] leading-tight text-cream">
            {data.heading ?? "Vous aimez la même idée"}
          </h2>
          <p className="mt-1 font-display text-[22px] leading-tight text-rose-soft">
            {data.title}
          </p>
          <p className="mx-auto mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-cream/55">
            {data.subtitle}
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={onAddToSoiree ?? onShare ?? onOpenDuo}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-4 py-2.5 text-[12.5px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110"
            >
              {onAddToSoiree ? (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  Ajouter à notre soirée
                </>
              ) : onShare ? (
                <>
                  <ShareIcon className="h-4 w-4" />
                  Proposer ce rendez-vous
                </>
              ) : (
                <>
                  {data.ctaLabel ?? "Voir notre duo"}
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gold/20 bg-ink-800/60 px-4 py-2 text-[12px] font-medium text-cream/75 transition hover:border-gold/40 hover:text-cream"
            >
              Continuer à swiper
            </button>
            <div className="flex items-center justify-center gap-4 pt-1">
              {onAddToSoiree && onShare ? (
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex items-center gap-1 text-[10.5px] text-cream/45 transition hover:text-cream/75"
                >
                  <ShareIcon className="h-3 w-3" />
                  Partager
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenDuo}
                className="inline-flex items-center gap-1 text-[10.5px] text-cream/45 transition hover:text-cream/75"
              >
                Voir notre duo
                <ArrowRightIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
