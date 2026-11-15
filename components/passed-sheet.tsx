"use client";

import { AnimatePresence, motion } from "motion/react";
import { XIcon } from "@/components/icons";
import { SETTING_LABEL } from "@/lib/preferences";
import type { Idea } from "@/lib/types";

export function PassedSheet({
  open,
  loading,
  ideas,
  error,
  onClose,
  onOpenFilters,
}: {
  open: boolean;
  loading: boolean;
  ideas: Idea[];
  error: string | null;
  onClose: () => void;
  onOpenFilters: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[64] flex items-end justify-center bg-ink-950/75 backdrop-blur-sm sm:items-center sm:p-4"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="passed-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 330, damping: 34 }}
            className="flex max-h-[75dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] border border-gold/25 bg-ink-900 shadow-2xl sm:rounded-[26px]"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-4">
              <div>
                <h2
                  id="passed-title"
                  className="font-display text-[24px] leading-tight text-cream"
                >
                  Idées passées
                </h2>
                <p className="mt-0.5 text-[11px] text-cream/50">
                  Celles que vous avez laissées filer.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer les idées passées"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/20 bg-ink-800/70 text-cream/60 transition hover:border-gold/40 hover:text-cream"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {loading ? (
                <p className="py-8 text-center text-[12px] text-ash">
                  Chargement…
                </p>
              ) : error ? (
                <p
                  role="alert"
                  className="my-4 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[12px] text-rose-soft"
                >
                  {error}
                </p>
              ) : ideas.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[12.5px] leading-relaxed text-cream/55">
                    Aucune idée passée pour l’instant. Toutes vos cartes sont
                    encore à découvrir.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenFilters}
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-2 text-[12px] font-medium text-gold transition hover:border-gold/55"
                  >
                    Élargir mes filtres
                  </button>
                </div>
              ) : (
                <ul className="mt-1 space-y-2">
                  {ideas.map((idea) => (
                    <li
                      key={idea.id}
                      className="grimoire flex items-center gap-3 rounded-2xl p-3"
                    >
                      <span
                        aria-hidden
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-800/80 text-[20px] ring-1 ring-gold/15"
                      >
                        {idea.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[15.5px] leading-tight text-cream/85">
                          {idea.title}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-ash">
                          {idea.duration} · {SETTING_LABEL[idea.setting]} ·{" "}
                          {idea.budget === 0 ? "Gratuit" : `${idea.budget} €`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
