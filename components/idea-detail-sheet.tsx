"use client";

import { useEffect, type ReactElement } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import {
  BoltIcon,
  ClockIcon,
  MapPinIcon,
  ShareIcon,
  SparklesIcon,
  WalletIcon,
  XIcon,
} from "@/components/icons";
import {
  ENERGY_LABEL,
  SETTING_LABEL,
  THEME_META,
  TIME_LABEL,
} from "@/lib/preferences";
import type { Idea } from "@/lib/types";

/**
 * Fiche d'une activité depuis la liste des matchs : on peut enfin relire
 * l'idée en entier sans la retrouver dans le deck.
 */
export function IdeaDetailSheet({
  idea,
  onClose,
  onShare,
  shareLabel = "Proposer ce rendez-vous",
}: {
  idea: Idea | null;
  onClose: () => void;
  onShare: (idea: Idea) => void;
  shareLabel?: string;
}) {
  useEffect(() => {
    if (!idea) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idea, onClose]);

  const theme = idea ? THEME_META[idea.themes[0] ?? "detente"] : null;

  return (
    <AnimatePresence>
      {idea && theme ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[66] flex items-end justify-center bg-ink-950/80 backdrop-blur-sm sm:items-center sm:p-4"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="idea-detail-title"
            initial={{ y: "100%", opacity: 0.7 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] border border-gold/25 bg-ink-900 shadow-[0_-24px_70px_-24px_rgba(0,0,0,0.95)] sm:rounded-[26px]"
          >
            <div
              className="relative h-[236px] shrink-0 overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(145deg, ${theme.gradient[0]} 0%, ${theme.gradient[1]} 100%)`,
              }}
            >
              <div aria-hidden className="grain absolute inset-0 opacity-15" />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink-950/45 to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-900 to-transparent"
              />

              <div className="absolute inset-y-2 left-1/2 aspect-[3/4] -translate-x-1/2 overflow-hidden rounded-t-full rounded-b-[18px] border border-gold/45 bg-ink-950/70 p-1 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.95)]">
                <div className="relative h-full w-full overflow-hidden rounded-t-full rounded-b-[14px]">
                  <Image
                    src={theme.illustration}
                    alt=""
                    fill
                    sizes="220px"
                    unoptimized
                    aria-hidden
                    className="object-cover"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/25"
                  />
                </div>
              </div>

              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                {idea.themes.slice(0, 2).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-ink-950/60 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-cream/90 ring-1 ring-gold/35 backdrop-blur-md"
                  >
                    {THEME_META[item].label}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer la fiche"
                className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-gold/25 bg-ink-950/70 text-cream/70 backdrop-blur-md transition hover:border-gold/50 hover:text-cream"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-3">
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="idea-detail-title"
                  className="font-display text-[26px] leading-[1.05] text-cream"
                >
                  {idea.title}
                </h2>
                <span className="mt-1 shrink-0 rounded-full bg-ink-800/80 px-2.5 py-1 text-[10px] text-cream/65 ring-1 ring-inset ring-gold/20">
                  {idea.budget === 0 ? "Gratuit" : `≈ ${idea.budget} €`}
                </span>
              </div>

              <p className="mt-1 text-[12.5px] text-rose-soft/90">
                {idea.tagline}
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-cream/70">
                {idea.description}
              </p>

              <ul
                aria-label="Détails de l’idée"
                className="mt-4 grid grid-cols-2 gap-1.5"
              >
                <MetaRow icon={ClockIcon} label={idea.duration} />
                <MetaRow
                  icon={WalletIcon}
                  label={idea.budget === 0 ? "Gratuit" : `≈ ${idea.budget} €`}
                />
                <MetaRow
                  icon={MapPinIcon}
                  label={SETTING_LABEL[idea.setting]}
                />
                <MetaRow
                  icon={BoltIcon}
                  label={`${TIME_LABEL[idea.time]} · ${ENERGY_LABEL[idea.energy]}`}
                />
              </ul>

              <div className="mt-4 rounded-xl border border-gold/20 bg-gold/[0.07] px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.16em] text-gold/80">
                  <SparklesIcon className="h-3 w-3" />
                  Le petit plus
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-gold/90">
                  {idea.tip}
                </p>
              </div>
            </div>

            <div className="shrink-0 border-t border-gold/15 bg-ink-900/95 px-5 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                onClick={() => onShare(idea)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-3 text-[13px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110"
              >
                <ShareIcon className="h-4 w-4" />
                {shareLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MetaRow({
  icon: Icon,
  label,
}: {
  icon: (props: { className?: string }) => ReactElement;
  label: string;
}) {
  return (
    <li className="flex min-w-0 items-center gap-1.5 rounded-lg bg-ink-800/70 px-2 py-1.5 ring-1 ring-inset ring-gold/15">
      <Icon className="h-3.5 w-3.5 shrink-0 text-ash" />
      <span className="truncate text-[10.5px] text-cream/75">{label}</span>
    </li>
  );
}
