"use client";

import { AnimatePresence, motion } from "motion/react";
import { XIcon } from "@/components/icons";
import type { ChoiceCategory } from "@/lib/types";

const TAGS: Record<
  ChoiceCategory,
  { tag: string; label: string }[]
> = {
  food: [
    { tag: "italien", label: "Italien" },
    { tag: "asiatique", label: "Asiatique" },
    { tag: "gourmand", label: "Gourmand" },
    { tag: "sain", label: "Healthy" },
    { tag: "vegetarien", label: "Végétarien" },
    { tag: "fromage", label: "Fromage" },
    { tag: "convivial", label: "Convivial" },
  ],
  movie: [
    { tag: "comedie", label: "Comédie" },
    { tag: "thriller", label: "Thriller" },
    { tag: "romantique", label: "Romance" },
    { tag: "science-fiction", label: "Science-fiction" },
    { tag: "drame", label: "Drame" },
    { tag: "horreur", label: "Horreur" },
    { tag: "classique", label: "Classique" },
    { tag: "musique", label: "Musique" },
  ],
};

/** Filtre rapide des decks Food et Film par tag de catalogue. */
export function ChoiceFiltersSheet({
  open,
  category,
  selected,
  onSelect,
  onClose,
}: {
  open: boolean;
  category: ChoiceCategory;
  selected: string | null;
  onSelect: (tag: string | null) => void;
  onClose: () => void;
}) {
  const options = TAGS[category];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-end justify-center bg-ink-950/75 backdrop-blur-sm sm:items-center sm:p-4"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="choice-filters-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="w-full max-w-lg overflow-hidden rounded-t-[26px] border border-gold/25 bg-ink-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[26px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-gold/80">
                  {category === "food" ? "Food" : "Film"}
                </p>
                <h2
                  id="choice-filters-title"
                  className="mt-1 font-display text-[24px] leading-tight text-cream"
                >
                  Affiner les cartes
                </h2>
                <p className="mt-0.5 text-[11px] text-cream/50">
                  {category === "food"
                    ? "Une envie, un style de plat."
                    : "Un genre pour ce soir."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer les filtres"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/20 bg-ink-800/70 text-cream/60 transition hover:border-gold/40 hover:text-cream"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSelect(null)}
                aria-pressed={selected === null}
                className={`min-h-10 rounded-full border px-3 py-1.5 text-[11.5px] transition ${
                  selected === null
                    ? "border-gold/60 bg-rose/20 text-cream"
                    : "border-gold/15 bg-ink-800/50 text-cream/65 hover:border-gold/35"
                }`}
              >
                Tous
              </button>
              {options.map((option) => {
                const active = selected === option.tag;
                return (
                  <button
                    key={option.tag}
                    type="button"
                    onClick={() => onSelect(option.tag)}
                    aria-pressed={active}
                    className={`min-h-10 rounded-full border px-3 py-1.5 text-[11.5px] transition ${
                      active
                        ? "border-gold/60 bg-rose/20 text-cream"
                        : "border-gold/15 bg-ink-800/50 text-cream/65 hover:border-gold/35"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-3 text-[13px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110"
            >
              Voir les cartes
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
