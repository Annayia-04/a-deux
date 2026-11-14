"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DuoInvite } from "@/components/duo-invite";
import {
  ArrowRightIcon,
  SparklesIcon,
  UndoIcon,
} from "@/components/icons";
import { api } from "@/lib/api-client";
import {
  BUDGET_OPTIONS,
  ENERGY_OPTIONS,
  SETTING_OPTIONS,
  THEME_OPTIONS,
  TIME_OPTIONS,
} from "@/lib/preferences";
import {
  MAX_THEMES,
  type CoupleSnapshot,
  type Prefs,
  type Theme,
} from "@/lib/types";

type ResumeInfo = { remaining: number; liked: number };

type Props = {
  initialPrefs: Prefs;
  isEditing: boolean;
  starting: boolean;
  error: string | null;
  resume: ResumeInfo | null;
  couple: CoupleSnapshot | null;
  duoBusy: boolean;
  duoError: string | null;
  onStart: (prefs: Prefs) => Promise<void>;
  onResume: () => void;
  onCancelEdit: () => void;
  onCreateDuo: (prefs: Prefs) => Promise<void>;
  onJoinDuo: (prefs: Prefs, code: string) => Promise<void>;
  onManageDuo: () => void;
  onCopyDuoCode: () => void;
};

export function PreferenceForm({
  initialPrefs,
  isEditing,
  starting,
  error,
  resume,
  couple,
  duoBusy,
  duoError,
  onStart,
  onResume,
  onCancelEdit,
  onCreateDuo,
  onJoinDuo,
  onManageDuo,
  onCopyDuoCode,
}: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [count, setCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

  const themesFull = prefs.themes.length >= MAX_THEMES;

  // Aperçu du nombre d'idées compatibles, débouncé et annulable.
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setChecking(true);
      api
        .preview(prefs, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setCount(result.count);
        })
        .catch(() => {
          // Aperçu indisponible : on laisse le serveur trancher au démarrage.
        })
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [prefs]);

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

  const canStart = !starting && count !== 0;

  return (
    <section className="glass relative rounded-[28px] p-4 sm:p-6">
      {resume && !isEditing ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-gold/25 bg-gold/[0.06] p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/30">
              <UndoIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-medium text-cream">
                Reprendre où vous en étiez
              </p>
              <p className="mt-0.5 text-[11.5px] text-cream/55">
                {resume.remaining} idée{resume.remaining > 1 ? "s" : ""} restante
                {resume.remaining > 1 ? "s" : ""} · {resume.liked} envie
                {resume.liked > 1 ? "s" : ""} gardée{resume.liked > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResume}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-[12.5px] font-semibold text-[#17110a] transition hover:brightness-110"
          >
            Reprendre
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {isEditing ? (
        <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-gold/25 bg-gold/[0.07] p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-relaxed text-gold/90">
            Modifier vos envies démarre une nouvelle sélection. Vos envies
            actuelles seront remplacées.
          </p>
          <button
            type="button"
            onClick={onCancelEdit}
            className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-medium text-gold underline-offset-4 hover:underline"
          >
            Annuler
          </button>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!canStart) return;
          void onStart(prefs);
        }}
        className="space-y-5"
      >
        <FieldGroup title="Budget" hint="par personne">
          <div role="radiogroup" aria-label="Budget" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BUDGET_OPTIONS.map((option) => {
              const selected = prefs.budget === option.value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() =>
                    setPrefs((current) => ({ ...current, budget: option.value }))
                  }
                  className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-gold/60 bg-rose/20 shadow-[inset_0_0_0_1px_rgba(197,160,89,0.22)]"
                      : "border-gold/15 bg-ink-800/50 hover:border-gold/35 hover:bg-ink-700/60"
                  }`}
                >
                  <span
                    className={`text-[12.5px] font-medium ${
                      selected ? "text-cream" : "text-cream/75"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="mt-0.5 text-[10.5px] text-ash">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </FieldGroup>

        <FieldGroup title="Lieu">
          <div role="radiogroup" aria-label="Lieu" className="grid grid-cols-3 gap-1.5">
            {SETTING_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={prefs.setting === option.value}
                role="radio"
                onClick={() =>
                  setPrefs((current) => ({ ...current, setting: option.value }))
                }
              >
                <span aria-hidden>{option.emoji}</span>
                <span className="sm:hidden">{option.shortLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </Chip>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup title="Moment">
          <div role="radiogroup" aria-label="Moment" className="grid grid-cols-3 gap-1.5">
            {TIME_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={prefs.time === option.value}
                role="radio"
                onClick={() =>
                  setPrefs((current) => ({ ...current, time: option.value }))
                }
              >
                <span aria-hidden>{option.emoji}</span>
                <span className="sm:hidden">{option.shortLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </Chip>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup title="Ambiance">
          <div role="radiogroup" aria-label="Ambiance" className="grid grid-cols-3 gap-1.5">
            {ENERGY_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={prefs.energy === option.value}
                role="radio"
                onClick={() =>
                  setPrefs((current) => ({ ...current, energy: option.value }))
                }
              >
                <span aria-hidden>{option.emoji}</span>
                <span className="sm:hidden">{option.shortLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </Chip>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup
          title="Thèmes"
          hint={`${prefs.themes.length}/${MAX_THEMES} max`}
        >
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Thèmes">
            {THEME_OPTIONS.map((theme) => {
              const selected = prefs.themes.includes(theme.value);
              return (
                <button
                  key={theme.value}
                  type="button"
                  aria-pressed={selected}
                  aria-disabled={!selected && themesFull}
                  onClick={() => toggleTheme(theme.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] transition ${
                    selected
                      ? "border-gold/40 text-cream"
                      : themesFull
                        ? "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-ash"
                        : "border-gold/15 bg-ink-800/50 text-cream/70 hover:border-gold/35 hover:bg-ink-700/60"
                  }`}
                  style={
                    selected
                      ? {
                          backgroundImage: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                          boxShadow: `0 6px 20px -10px ${theme.accent}`,
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
          <p className="mt-2 text-[11px] leading-relaxed text-ash">
            Aucun thème = toutes les envies. {themesFull ? "Retirez-en un pour en ajouter un autre." : "Jusqu’à trois univers."}
          </p>
        </FieldGroup>

        <div className="mt-2 rounded-2xl border border-gold/25 bg-ink-900/80 p-2.5 backdrop-blur-xl">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex items-center gap-2 px-1 text-[12px] text-cream/55"
              aria-live="polite"
            >
              {checking ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-gold" />
                  On prépare la sélection…
                </>
              ) : count === 0 ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                  <span className="text-gold">
                    Aucune idée : élargissez un critère.
                  </span>
                </>
              ) : count !== null ? (
                <>
                  <SparklesIcon className="h-3.5 w-3.5 text-gold" />
                  <span>
                    <strong className="font-semibold text-cream">{count}</strong>{" "}
                    idée{count > 1 ? "s" : ""} compatible{count > 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <span>Prêt quand vous l’êtes.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-cream/60 transition hover:bg-white/5 hover:text-cream"
                >
                  Annuler
                </button>
              ) : null}
              <button
                type="submit"
                disabled={!canStart}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-2.5 text-[13px] font-semibold text-cream shadow-[0_12px_30px_-14px_rgba(158,25,45,0.9)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              >
                {starting ? "Préparation…" : "Commencer à swiper"}
                {!starting ? <ArrowRightIcon className="h-4 w-4" /> : null}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[12px] text-rose-soft" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <DuoInvite
        couple={couple}
        busy={duoBusy}
        error={duoError}
        onCreate={() => onCreateDuo(prefs)}
        onJoin={(code) => onJoinDuo(prefs, code)}
        onManage={onManageDuo}
        onCopyCode={onCopyDuoCode}
      />
    </section>
  );
}

function FieldGroup({
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
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold/80">
          {title}
        </span>
        {hint ? (
          <span className="text-[10.5px] text-ash">{hint}</span>
        ) : null}
      </legend>
      {children}
    </fieldset>
  );
}

function Chip({
  selected,
  onClick,
  children,
  role,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  role?: "radio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role ? selected : undefined}
      aria-pressed={role ? undefined : selected}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-[11px] font-medium transition sm:gap-1.5 sm:px-2 sm:text-[11.5px] ${
        selected
          ? "border-gold/60 bg-rose/20 text-cream shadow-[inset_0_0_0_1px_rgba(197,160,89,0.2)]"
          : "border-gold/15 bg-ink-800/50 text-cream/65 hover:border-gold/35 hover:bg-ink-700/60"
      }`}
    >
      {children}
    </button>
  );
}
