"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertIcon,
  ArrowRightIcon,
  HeartIcon,
  RefreshIcon,
  SparklesIcon,
  XIcon,
} from "@/components/icons";
import { CHOICE_CATEGORY_META } from "@/lib/choices";
import type {
  Choice,
  ChoiceCategory,
  ChoiceSnapshot,
  SwipeDirection,
} from "@/lib/types";

const SWIPE_THRESHOLD = 88;
const VELOCITY_THRESHOLD = 520;

const EXIT_VARIANTS = {
  like: {
    opacity: 0,
    x: 140,
    rotate: 5,
    transition: { duration: 0.2 },
  },
  pass: {
    opacity: 0,
    x: -140,
    rotate: -5,
    transition: { duration: 0.2 },
  },
} as const;

export function ChoiceDeck({
  category,
  onCategoryChange,
  snapshot,
  loading,
  error,
  pending,
  onSwipe,
  onRefresh,
}: {
  category: ChoiceCategory;
  onCategoryChange: (category: ChoiceCategory) => void;
  snapshot: ChoiceSnapshot | null;
  loading: boolean;
  error: string | null;
  pending: string | null;
  onSwipe: (choice: Choice, direction: SwipeDirection) => void;
  onRefresh: () => void;
}) {
  const meta = CHOICE_CATEGORY_META[category];
  const [exitDirection, setExitDirection] = useState<SwipeDirection>("like");
  const top = snapshot?.deck[0];
  const second = snapshot?.deck[1];
  const third = snapshot?.deck[2];

  const decide = (choice: Choice, direction: SwipeDirection) => {
    setExitDirection(direction);
    onSwipe(choice, direction);
  };
  const progress = snapshot
    ? Math.min(
        100,
        Math.round((snapshot.swiped / Math.max(1, snapshot.total)) * 100),
      )
    : 0;

  return (
    <section className="space-y-4">
      <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {(["food", "movie"] as const).map((key) => {
          const item = CHOICE_CATEGORY_META[key];
          const active = category === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onCategoryChange(key)}
              aria-pressed={active}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11.5px] font-medium transition ${
                active
                  ? "bg-white/[0.09] text-cream shadow-sm"
                  : "text-cream/45 hover:text-cream/75"
              }`}
            >
              <span aria-hidden className="text-[14px]">
                {key === "food" ? "🍽️" : "🎬"}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-cream/40">
          <span className="tabular-nums">
            {snapshot ? `${snapshot.swiped} / ${snapshot.total} cartes` : "—"}
          </span>
          <span className="inline-flex items-center gap-1">
            <SparklesIcon className="h-3 w-3" />
            {meta.kicker}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`Progression ${meta.label}`}
          aria-valuemin={0}
          aria-valuemax={snapshot?.total ?? 0}
          aria-valuenow={snapshot?.swiped ?? 0}
          className="h-1 overflow-hidden rounded-full bg-white/[0.07]"
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${progress}%`,
              backgroundImage: `linear-gradient(90deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
            }}
          />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[11px] leading-relaxed text-rose-soft"
        >
          <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onRefresh}
            className="shrink-0 font-semibold underline-offset-2 hover:underline"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      {snapshot && snapshot.matches.length > 0 ? (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream/45">
            <HeartIcon className="h-3 w-3 text-rose" />
            Vos matchs {meta.label.toLowerCase()}
            <span className="rounded-full bg-rose/15 px-1.5 py-0.5 text-[9px] normal-case tracking-normal text-rose-soft">
              {snapshot.matches.length}
            </span>
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {snapshot.matches.map((match) => (
              <li
                key={`${match.category}:${match.choiceId}`}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] ring-1 ring-inset ${
                  match.seen
                    ? "bg-white/[0.04] text-cream/60 ring-white/10"
                    : "bg-rose/12 text-rose-soft ring-rose/30"
                }`}
              >
                <span aria-hidden>{match.choice.emoji}</span>
                <span className="truncate">{match.choice.title}</span>
                {!match.seen ? (
                  <span
                    aria-label="Nouveau match"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="relative mx-auto h-[232px] w-full max-w-[320px]">
        {third ? (
          <div
            aria-hidden
            className="absolute inset-x-2 bottom-0 top-4 rounded-[24px] border border-white/[0.05] bg-white/[0.02]"
          />
        ) : null}
        {second ? (
          <div
            aria-hidden
            className="absolute inset-x-1 bottom-0 top-2 rounded-[26px] border border-white/[0.07] bg-white/[0.035]"
          />
        ) : null}

        <AnimatePresence mode="popLayout" custom={exitDirection}>
          {top ? (
            <motion.div
              key={`${top.category}:${top.id}`}
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              variants={EXIT_VARIANTS}
              exit={exitDirection}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (pending !== null) return;
                if (
                  info.offset.x > SWIPE_THRESHOLD ||
                  info.velocity.x > VELOCITY_THRESHOLD
                ) {
                  decide(top, "like");
                } else if (
                  info.offset.x < -SWIPE_THRESHOLD ||
                  info.velocity.x < -VELOCITY_THRESHOLD
                ) {
                  decide(top, "pass");
                }
              }}
              className="absolute inset-0 z-10 flex cursor-grab touch-pan-y flex-col overflow-hidden rounded-[26px] border border-white/12 bg-ink-850 p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] active:cursor-grabbing"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage: `radial-gradient(circle at 78% 8%, ${meta.gradient[0]}, transparent 55%), radial-gradient(circle at 8% 95%, ${meta.gradient[1]}, transparent 60%)`,
                }}
              />
              <div className="relative flex items-start justify-between gap-2">
                <span
                  aria-hidden
                  className="grid h-16 w-16 place-items-center rounded-2xl text-[34px] ring-1 ring-white/15"
                  style={{
                    backgroundImage: `linear-gradient(145deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
                  }}
                >
                  {top.emoji}
                </span>
                <span className="rounded-full border border-white/10 bg-ink-950/45 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-cream/45">
                  {meta.kicker}
                </span>
              </div>

              <div className="relative mt-3 min-h-0 flex-1">
                <h4 className="balance font-display text-[24px] leading-[1.1] text-cream">
                  {top.title}
                </h4>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-cream/55">
                  {top.tagline}
                </p>
                <ul className="mt-2.5 flex flex-wrap gap-1">
                  {top.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9.5px] text-cream/50"
                    >
                      {tag.replaceAll("-", " ")}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative mt-3 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => decide(top, "pass")}
                  disabled={pending !== null}
                  aria-label={`Passer ${top.title}`}
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-cream/65 transition hover:border-rose/40 hover:bg-rose/10 hover:text-rose-soft active:scale-95 disabled:opacity-40"
                >
                  <XIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => decide(top, "like")}
                  disabled={pending !== null}
                  aria-label={`Garder ${top.title}`}
                  className="inline-flex h-11 items-center gap-1.5 rounded-full bg-gradient-to-r from-rose to-[#ff8f6b] px-4 text-[12px] font-semibold text-ink-950 shadow-[0_12px_26px_-12px_rgba(255,107,149,0.9)] transition hover:brightness-105 active:scale-95 disabled:opacity-40"
                >
                  <HeartIcon className="h-4 w-4" />
                  Ça me tente
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!top && loading ? (
          <div className="absolute inset-0 animate-pulse rounded-[26px] border border-white/[0.07] bg-white/[0.03]" />
        ) : null}

        {!top && !loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[26px] border border-dashed border-white/12 bg-white/[0.02] px-5 text-center">
            <span aria-hidden className="text-3xl">
              {category === "food" ? "🍽️" : "🎬"}
            </span>
            <p className="mt-2 font-display text-[17px] text-cream">
              {meta.emptyTitle}
            </p>
            <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-cream/45">
              {meta.emptyText}
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[10.5px] text-cream/60 transition hover:border-white/25 hover:text-cream"
            >
              <RefreshIcon className="h-3 w-3" />
              Rafraîchir
            </button>
          </div>
        ) : null}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-cream/25">
        <SparklesIcon className="h-3 w-3" />
        Glissez la carte ou utilisez les boutons · un match apparaît quand vous
        aimez la même carte
        <ArrowRightIcon className="h-3 w-3" />
      </p>
    </section>
  );
}
