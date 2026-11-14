"use client";

import { motion } from "motion/react";
import { ArrowRightIcon, HeartIcon, SparklesIcon, XIcon } from "@/components/icons";

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
};

type Props = {
  data: CelebrationData;
  onClose: () => void;
  onOpenDuo: () => void;
};

export function MatchCelebration({ data, onClose, onOpenDuo }: Props) {
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
        className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-rose/25 bg-ink-900 p-6 text-center shadow-[0_40px_100px_-30px_rgba(255,107,149,0.35)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la notification"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-cream/50 transition hover:text-cream"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose/15 to-transparent" />

        <div className="relative">
          <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-rose/30 bg-rose/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-soft">
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
              className="relative grid h-24 w-24 place-items-center rounded-[26px] text-[46px] ring-1 ring-white/20"
              style={{
                backgroundImage: `linear-gradient(145deg, ${data.gradient[0]}, ${data.gradient[1]})`,
              }}
            >
              {data.emoji}
            </div>
            <span
              aria-hidden
              className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-rose to-[#ff8f6b] text-ink-950 shadow-lg"
            >
              <HeartIcon className="h-5 w-5" />
            </span>
            <span
              aria-hidden
              className="absolute -left-3 -top-2 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-rose to-[#7c5cff] text-ink-950 shadow-lg"
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
          <p className="mx-auto mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-cream/50">
            {data.subtitle}
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={onOpenDuo}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose to-[#ff8f6b] px-4 py-2.5 text-[12.5px] font-semibold text-ink-950 transition hover:brightness-105"
            >
              {data.ctaLabel ?? "Voir notre duo"}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[11.5px] text-cream/50 transition hover:bg-white/5 hover:text-cream/80"
            >
              Continuer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
