"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Brand } from "@/components/brand";
import {
  ArrowRightIcon,
  CopyIcon,
  HeartIcon,
  LockIcon,
  SlidersIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/icons";
import {
  SETTING_LABEL,
  THEME_META,
  formatPrefsBudget,
} from "@/lib/preferences";
import type { CoupleSnapshot, Idea, Prefs } from "@/lib/types";

type Props = {
  likedIdeas: Idea[];
  prefs: Prefs;
  total: number;
  swiped: number;
  remaining: number;
  couple: CoupleSnapshot | null;
  onResume: () => void;
  onRestart: () => void;
  onCopy: () => void;
  onForget: () => Promise<void>;
  onOpenDuo: () => void;
};

export function ResultsView({
  likedIdeas,
  prefs,
  total,
  swiped,
  remaining,
  couple,
  onResume,
  onRestart,
  onCopy,
  onForget,
  onOpenDuo,
}: Props) {
  const [confirmForget, setConfirmForget] = useState(false);
  const [forgetting, setForgetting] = useState(false);

  async function handleForget() {
    if (!confirmForget) {
      setConfirmForget(true);
      return;
    }
    setForgetting(true);
    try {
      await onForget();
    } finally {
      setForgetting(false);
      setConfirmForget(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen min-h-dvh w-full max-w-4xl flex-col px-4 pb-14 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-5">
        <Brand />
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gold/20 bg-ink-800/60 px-3 py-2 text-[11.5px] text-cream/65 transition hover:border-gold/40 hover:text-cream"
        >
          <SlidersIcon className="h-3.5 w-3.5" />
          Nouvelle sélection
        </button>
      </header>

      <section className="pt-4">
        <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-gold/85">
          <HeartIcon className="h-3.5 w-3.5" />
          Votre sélection
        </p>
        <h1 className="balance mt-3 font-display text-[38px] leading-[1.02] tracking-[-0.02em] text-cream sm:text-[50px]">
          Vos envies, à vivre à deux.
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-cream/55">
          <span>
            <strong className="font-semibold text-cream/85">
              {likedIdeas.length}
            </strong>{" "}
            idée{likedIdeas.length > 1 ? "s" : ""} gardée
            {likedIdeas.length > 1 ? "s" : ""} sur {total}
          </span>
          <span aria-hidden className="text-ash">
            ·
          </span>
          <span>{swiped} carte{swiped > 1 ? "s" : ""} swipée{swiped > 1 ? "s" : ""}</span>
          <span aria-hidden className="text-ash">
            ·
          </span>
          <span>{formatPrefsBudget(prefs.budget)}</span>
          {prefs.setting !== "any" ? (
            <>
              <span aria-hidden className="text-ash">
                ·
              </span>
              <span>{SETTING_LABEL[prefs.setting]}</span>
            </>
          ) : null}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {likedIdeas.length > 0 ? (
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-4 py-2.5 text-[12.5px] font-semibold text-cream shadow-[0_12px_28px_-16px_rgba(158,25,45,0.95)] transition hover:border-gold/70 hover:brightness-110"
            >
              <CopyIcon className="h-4 w-4" />
              Copier la liste
            </button>
          ) : null}

          {remaining > 0 ? (
            <button
              type="button"
              onClick={onResume}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gold/20 bg-ink-800/60 px-4 py-2.5 text-[12.5px] font-medium text-cream/80 transition hover:border-gold/40 hover:bg-ink-700/60"
            >
              Continuer à swiper
              <span className="rounded-full bg-rose/25 px-1.5 py-0.5 text-[10px] text-rose-soft">
                {remaining}
              </span>
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="grimoire mt-5 rounded-2xl p-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 ${
                  couple
                    ? "bg-gold/15 text-gold ring-gold/30"
                    : "bg-rose/15 text-rose-soft ring-rose/30"
                }`}
              >
                <UsersIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="flex items-center gap-2 text-[12.5px] font-medium text-cream">
                  Votre espace à deux
                  {couple && couple.unread > 0 ? (
                    <span className="rounded-full bg-rose px-1.5 py-0.5 text-[9.5px] font-bold leading-none text-cream ring-1 ring-gold/40">
                      {couple.unread} nouveau{couple.unread > 1 ? "x" : ""}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-cream/55">
                  {couple
                    ? couple.complete
                      ? `Vous êtes deux · ${couple.matches.length} match${couple.matches.length > 1 ? "s" : ""} en commun`
                      : "En attente de votre partenaire · partagez votre code"
                    : "Créez un duo pour comparer vos envies et être prévenus des matchs."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenDuo}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-gold/30 bg-gold/[0.06] px-3.5 py-2 text-[11.5px] font-medium text-gold transition hover:border-gold/55 hover:bg-gold/10"
            >
              {couple ? "Ouvrir notre duo" : "Créer un duo"}
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {couple && couple.matches.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-gold/15 pt-2.5">
              {couple.matches.slice(0, 4).map((match) => (
                <li
                  key={match.idea.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] ring-1 ring-inset ${
                    match.seen
                      ? "bg-ink-800/70 text-cream/60 ring-gold/15"
                      : "bg-rose/20 text-rose-soft ring-gold/30"
                  }`}
                >
                  <span aria-hidden>{match.idea.emoji}</span>
                  <span className="max-w-[140px] truncate">{match.idea.title}</span>
                </li>
              ))}
              {couple.matches.length > 4 ? (
                <li className="inline-flex items-center rounded-full bg-ink-800/70 px-2 py-1 text-[10.5px] text-ash ring-1 ring-inset ring-gold/15">
                  +{couple.matches.length - 4}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </section>

      {likedIdeas.length === 0 ? (
        <section className="grimoire ornament-corners mt-8 flex flex-1 flex-col items-center justify-center rounded-[28px] px-6 py-14 text-center">
          <span aria-hidden className="text-5xl">
            🌙
          </span>
          <h2 className="mt-4 font-display text-2xl text-cream">
            Pas encore d’envie gardée
          </h2>
          <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-cream/55">
            {remaining > 0
              ? "Reprenez le swipe : les idées qui vous tentent apparaîtront ici."
              : "Ajustez vos filtres pour découvrir une nouvelle sélection."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {remaining > 0 ? (
              <button
                type="button"
                onClick={onResume}
                className="rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-4 py-2.5 text-[12.5px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110"
              >
                Continuer à swiper
              </button>
            ) : null}
            <button
              type="button"
              onClick={onRestart}
              className="rounded-xl border border-gold/20 bg-ink-800/60 px-4 py-2.5 text-[12.5px] font-medium text-cream/75 transition hover:border-gold/40"
            >
              Ajuster mes envies
            </button>
          </div>
        </section>
      ) : (
        <ul className="mt-7 grid flex-1 content-start gap-3 sm:grid-cols-2">
          {likedIdeas.map((idea, index) => {
            const theme = THEME_META[idea.themes[0] ?? "detente"];
            return (
              <motion.li
                key={idea.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: Math.min(index * 0.045, 0.35),
                  ease: [0.3, 0.8, 0.2, 1],
                }}
                className="grimoire rounded-2xl p-3.5"
              >
                <div className="flex gap-3">
                  <div
                    aria-hidden
                    className="grid h-[74px] w-[74px] shrink-0 place-items-center rounded-xl text-[30px] shadow-inner ring-1 ring-gold/25"
                    style={{
                      backgroundImage: `linear-gradient(145deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                    }}
                  >
                    {idea.emoji}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-[18px] leading-tight text-cream">
                        {idea.title}
                      </h2>
                      <span className="mt-0.5 shrink-0 rounded-full bg-ink-800/80 px-2 py-0.5 text-[9.5px] text-cream/55 ring-1 ring-inset ring-gold/15">
                        {idea.budget === 0 ? "Gratuit" : `${idea.budget} €`}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-cream/55">
                      {idea.tagline}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-ash">
                      <span>{idea.duration}</span>
                      <span aria-hidden>·</span>
                      <span>{SETTING_LABEL[idea.setting]}</span>
                      <span aria-hidden>·</span>
                      <span>{THEME_META[idea.themes[0] ?? "detente"].label}</span>
                    </p>
                  </div>
                </div>

                <details className="group mt-2.5 border-t border-gold/15 pt-2">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[10.5px] font-medium text-gold/75 transition hover:text-gold [&::-webkit-details-marker]:hidden">
                    <SparklesIcon className="h-3 w-3" />
                    Le petit plus
                  </summary>
                  <p className="mt-1.5 rounded-lg bg-gold/[0.06] px-2.5 py-2 text-[11px] leading-relaxed text-gold/85">
                    {idea.tip}
                  </p>
                </details>
              </motion.li>
            );
          })}
        </ul>
      )}

      <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-gold/15 pt-4 text-[10.5px] text-ash sm:flex-row">
        <p className="inline-flex items-center gap-1.5">
          <LockIcon className="h-3.5 w-3.5 text-gold/75" />
          Session anonyme · conservée 30 jours · aucune donnée personnelle
        </p>
        <button
          type="button"
          onClick={() => void handleForget()}
          disabled={forgetting}
          className={`rounded-md px-2 py-1 transition hover:bg-white/[0.05] ${
            confirmForget ? "text-rose-soft" : "text-ash hover:text-cream/60"
          }`}
        >
          {forgetting
            ? "Effacement…"
            : confirmForget
              ? "Cliquez à nouveau pour confirmer"
              : "Effacer ma session"}
        </button>
      </footer>
    </main>
  );
}
