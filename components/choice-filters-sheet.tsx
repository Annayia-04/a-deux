"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon } from "@/components/icons";
import {
  FOOD_MODE_META,
  MOVIE_PLATFORM_LABEL,
  budgetLabel,
} from "@/lib/choices";
import type { ChoiceCategory, FoodMode, MoviePlatform } from "@/lib/types";
import type { ChoiceFilterState } from "@/lib/choice-filters";

const GENRES: Record<ChoiceCategory, { tag: string; label: string }[]> = {
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
    { tag: "action", label: "Action" },
    { tag: "aventure", label: "Aventure" },
    { tag: "animation", label: "Animation" },
    { tag: "famille", label: "Famille" },
    { tag: "polar", label: "Polar" },
    { tag: "fantastique", label: "Fantastique" },
    { tag: "mystere", label: "Mystère" },
    { tag: "documentaire", label: "Documentaire" },
    { tag: "classique", label: "Classique" },
    { tag: "musique", label: "Musique" },
  ],
};

/** Filtres avancés Food (mode, budget, envie) et Film (lieu, durée, genre, plateforme). */
export function ChoiceFiltersSheet({
  open,
  category,
  filters,
  onApply,
  onClose,
}: {
  open: boolean;
  category: ChoiceCategory;
  filters: ChoiceFilterState;
  onApply: (filters: ChoiceFilterState) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ChoiceFilterState>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [filters, open]);

  function toggle<K extends keyof ChoiceFilterState>(
    key: K,
    value: ChoiceFilterState[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: current[key] === value ? undefined : value,
    }));
  }

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
            className="flex max-h-[82dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] border border-gold/25 bg-ink-900 shadow-2xl sm:rounded-[26px]"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-4">
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
              {category === "food" ? (
                <>
                  <Section title="Mode">
                    {(Object.keys(FOOD_MODE_META) as FoodMode[]).map((mode) => (
                      <Chip
                        key={mode}
                        active={(draft.mode ?? null) === mode}
                        onClick={() => toggle("mode", mode)}
                      >
                        {FOOD_MODE_META[mode].emoji} {FOOD_MODE_META[mode].label}
                      </Chip>
                    ))}
                  </Section>

                  <Section title="Budget">
                    {[1, 2, 3].map((budget) => (
                      <Chip
                        key={budget}
                        active={draft.budget === budget}
                        onClick={() =>
                          toggle("budget", budget as 1 | 2 | 3)
                        }
                      >
                        {budgetLabel(budget as 1 | 2 | 3)}
                      </Chip>
                    ))}
                  </Section>
                </>
              ) : (
                <>
                  <Section title="Type">
                    <Chip
                      active={draft.kind === "movie"}
                      onClick={() => toggle("kind", "movie")}
                    >
                      Films
                    </Chip>
                    <Chip
                      active={draft.kind === "series"}
                      onClick={() => toggle("kind", "series")}
                    >
                      Séries
                    </Chip>
                  </Section>

                  <Section title="Lieu">
                    <Chip
                      active={draft.place === "canape"}
                      onClick={() => toggle("place", "canape")}
                    >
                      🛋️ Canapé
                    </Chip>
                    <Chip
                      active={draft.place === "cinema"}
                      onClick={() => toggle("place", "cinema")}
                    >
                      🍿 Au cinéma
                    </Chip>
                  </Section>

                  <Section title="Durée">
                    <Chip
                      active={draft.duration === "short"}
                      onClick={() => toggle("duration", "short")}
                    >
                      Moins de 1 h 45
                    </Chip>
                    <Chip
                      active={draft.duration === "long"}
                      onClick={() => toggle("duration", "long")}
                    >
                      Plus de 2 h
                    </Chip>
                  </Section>

                  <Section title="Plateforme">
                    {(Object.keys(MOVIE_PLATFORM_LABEL) as MoviePlatform[]).map(
                      (platform) => (
                        <Chip
                          key={platform}
                          active={draft.platform === platform}
                          onClick={() => toggle("platform", platform)}
                        >
                          {MOVIE_PLATFORM_LABEL[platform]}
                        </Chip>
                      ),
                    )}
                  </Section>
                </>
              )}

              <Section title={category === "food" ? "Envie" : "Genre"}>
                {GENRES[category].map((genre) => (
                  <Chip
                    key={genre.tag}
                    active={draft.tag === genre.tag}
                    onClick={() => toggle("tag", genre.tag)}
                  >
                    {genre.label}
                  </Chip>
                ))}
              </Section>

              {category === "movie" ? (
                <p className="mt-4 text-[9.5px] leading-relaxed text-ash">
                  Titres, durées et notes : IMDb. Affiches : Wikipédia.
                  Plateformes : sélection éditoriale ; les autres titres
                  affichent « IMDb ».
                </p>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-gold/15 bg-ink-900/95 px-5 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                onClick={() => {
                  onApply(draft);
                  onClose();
                }}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-3 text-[13px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110"
              >
                Voir les cartes
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/75">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 rounded-full border px-3 py-1.5 text-[11.5px] transition ${
        active
          ? "border-gold/60 bg-rose/20 text-cream"
          : "border-gold/15 bg-ink-800/50 text-cream/65 hover:border-gold/35"
      }`}
    >
      {children}
    </button>
  );
}
