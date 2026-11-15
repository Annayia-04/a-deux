"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SparklesIcon, XIcon } from "@/components/icons";
import { api } from "@/lib/api-client";
import {
  BUDGET_OPTIONS,
  ENERGY_OPTIONS,
  SETTING_OPTIONS,
  THEME_OPTIONS,
  TIME_OPTIONS,
} from "@/lib/preferences";
import { MAX_THEMES, type Prefs, type Theme } from "@/lib/types";

type Props = {
  open: boolean;
  initialPrefs: Prefs;
  hasSession: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (prefs: Prefs) => void;
};

/**
 * Tiroir de filtres : il ne contient que les critères et un aperçu du nombre
 * d'idées. Le CTA crée (ou recrée) la sélection avec ces préférences.
 */
export function FiltersSheet({
  open,
  initialPrefs,
  hasSession,
  busy,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [count, setCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

  // Chaque ouverture repart des préférences réellement appliquées.
  useEffect(() => {
    if (!open) return;
    setPrefs(initialPrefs);
  }, [open, initialPrefs]);

  // Aperçu débouncé et annulable.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setChecking(true);
      api
        .preview(prefs, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setCount(result.count);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [prefs, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const themesFull = prefs.themes.length >= MAX_THEMES;
  const canSubmit = !busy && count !== 0;

  function toggleTheme(theme: Theme) {
    setPrefs((current) => {
      const selected = current.themes.includes(theme);
      if (selected) {
        return {
          ...current,
          themes: current.themes.filter((item) => item !== theme),
        };
      }
      if (current.themes.length >= MAX_THEMES) return current;
      return { ...current, themes: [...current.themes, theme] };
    });
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
            aria-labelledby="filters-title"
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.4 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="flex max-h-[75dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] border border-gold/25 bg-ink-900 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)] sm:rounded-[26px]"
          >
            <div className="shrink-0 px-5 pb-1 pt-3">
              <span
                aria-hidden
                className="mx-auto mb-3 block h-1 w-10 rounded-full bg-gold/30"
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="filters-title"
                    className="font-display text-[24px] leading-tight text-cream"
                  >
                    Affiner mes envies
                  </h2>
                  <p className="mt-0.5 text-[11.5px] text-cream/50">
                    Budget, lieu, moment et ambiance.
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-3">
              <div className="space-y-4">
                <Field title="Budget" hint="par personne">
                  <div
                    role="radiogroup"
                    aria-label="Budget"
                    className="grid grid-cols-2 gap-2"
                  >
                    {BUDGET_OPTIONS.map((option) => {
                      const selected = prefs.budget === option.value;
                      return (
                        <button
                          key={String(option.value)}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() =>
                            setPrefs((current) => ({
                              ...current,
                              budget: option.value,
                            }))
                          }
                          className={`rounded-xl border px-3 py-2.5 text-left transition ${
                            selected
                              ? "border-gold/60 bg-rose/20 shadow-[inset_0_0_0_1px_rgba(197,160,89,0.22)]"
                              : "border-gold/15 bg-ink-800/50 hover:border-gold/35"
                          }`}
                        >
                          <span className="block text-[12.5px] font-medium text-cream">
                            {option.label}
                          </span>
                          <span className="mt-0.5 block text-[10.5px] text-ash">
                            {option.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field title="Lieu">
                  <ChipRow
                    label="Lieu"
                    options={SETTING_OPTIONS}
                    selected={prefs.setting}
                    onSelect={(value) =>
                      setPrefs((current) => ({ ...current, setting: value }))
                    }
                  />
                </Field>

                <Field title="Moment">
                  <ChipRow
                    label="Moment"
                    options={TIME_OPTIONS}
                    selected={prefs.time}
                    onSelect={(value) =>
                      setPrefs((current) => ({ ...current, time: value }))
                    }
                  />
                </Field>

                <Field title="Ambiance">
                  <ChipRow
                    label="Ambiance"
                    options={ENERGY_OPTIONS}
                    selected={prefs.energy}
                    onSelect={(value) =>
                      setPrefs((current) => ({ ...current, energy: value }))
                    }
                  />
                </Field>

                <Field
                  title="Thèmes"
                  hint={`${prefs.themes.length}/${MAX_THEMES} max`}
                >
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label="Thèmes"
                  >
                    {THEME_OPTIONS.map((theme) => {
                      const selected = prefs.themes.includes(theme.value);
                      return (
                        <button
                          key={theme.value}
                          type="button"
                          aria-pressed={selected}
                          aria-disabled={!selected && themesFull}
                          onClick={() => toggleTheme(theme.value)}
                          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] transition ${
                            selected
                              ? "border-gold/40 text-cream"
                              : themesFull
                                ? "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-ash"
                                : "border-gold/15 bg-ink-800/50 text-cream/70 hover:border-gold/35"
                          }`}
                          style={
                            selected
                              ? {
                                  backgroundImage: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                                }
                              : undefined
                          }
                        >
                          <span aria-hidden>{theme.emoji}</span>
                          {theme.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10.5px] leading-relaxed text-ash">
                    Aucun thème = toutes les envies.
                    {themesFull ? " Retirez-en un pour en ajouter un autre." : ""}
                  </p>
                </Field>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[12px] text-rose-soft"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-gold/15 bg-ink-900/95 px-5 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
              <div
                className="mb-2 flex items-center gap-1.5 text-[11px] text-cream/55"
                aria-live="polite"
              >
                {checking ? (
                  <>
                    <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-gold" />
                    On prépare la sélection…
                  </>
                ) : count === 0 ? (
                  <span className="text-gold">
                    Aucune idée : élargissez un critère.
                  </span>
                ) : count !== null ? (
                  <>
                    <SparklesIcon className="h-3.5 w-3.5 text-gold" />
                    <span>
                      <strong className="font-semibold text-cream">
                        {count}
                      </strong>{" "}
                      idée{count > 1 ? "s" : ""} compatible
                      {count > 1 ? "s" : ""}
                    </span>
                  </>
                ) : (
                  <span>Prêt quand vous l’êtes.</span>
                )}
              </div>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => onSubmit(prefs)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-3 text-[13.5px] font-semibold text-cream shadow-[0_14px_30px_-16px_rgba(158,25,45,0.95)] transition hover:border-gold/70 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy
                  ? "Préparation…"
                  : count === null
                    ? "Voir les idées"
                    : `Voir les ${count} idée${count > 1 ? "s" : ""}`}
              </button>
              {hasSession ? (
                <p className="mt-2 text-center text-[10px] leading-relaxed text-ash">
                  Appliquer remplace la sélection en cours. Vos envies gardées
                  restent dans l’onglet Mes envies.
                </p>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Field({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 flex w-full items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80">
          {title}
        </span>
        {hint ? <span className="text-[10px] text-ash">{hint}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

function ChipRow<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string; shortLabel: string; emoji: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1.5">
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(option.value)}
            className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-[11px] font-medium transition ${
              active
                ? "border-gold/60 bg-rose/20 text-cream shadow-[inset_0_0_0_1px_rgba(197,160,89,0.2)]"
                : "border-gold/15 bg-ink-800/50 text-cream/65 hover:border-gold/35"
            }`}
          >
            <span aria-hidden>{option.emoji}</span>
            {option.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
