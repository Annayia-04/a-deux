"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChoiceCard } from "@/components/choice-card";
import {
  AlertIcon,
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
    x: 180,
    rotate: 4,
    transition: { duration: 0.2 },
  },
  pass: {
    opacity: 0,
    x: -180,
    rotate: -4,
    transition: { duration: 0.2 },
  },
} as const;

/** Deck Food ou Film, dans la même coque que les cartes Activité. */
export function ChoiceDeck({
  category,
  onCategoryChange,
  snapshot,
  loading,
  error,
  pending,
  onSwipe,
  onRefresh,
  hideTabs = false,
  discover = false,
}: {
  category: ChoiceCategory;
  onCategoryChange: (category: ChoiceCategory) => void;
  snapshot: ChoiceSnapshot | null;
  loading: boolean;
  error: string | null;
  pending: string | null;
  onSwipe: (choice: Choice, direction: SwipeDirection) => void;
  onRefresh: () => void;
  hideTabs?: boolean;
  discover?: boolean;
}) {
  const meta = CHOICE_CATEGORY_META[category];
  const [exitDirection, setExitDirection] = useState<SwipeDirection>("like");
  const [density, setDensity] = useState<"regular" | "compact" | "tight">(
    "regular",
  );
  const deckRef = useRef<HTMLDivElement>(null);
  const top = snapshot?.deck[0];
  const second = snapshot?.deck[1];
  const third = snapshot?.deck[2];

  const decide = useCallback(
    (choice: Choice, direction: SwipeDirection) => {
      if (pending !== null) return;
      setExitDirection(direction);
      onSwipe(choice, direction);
    },
    [onSwipe, pending],
  );

  const progress = snapshot
    ? Math.min(
        100,
        Math.round((snapshot.swiped / Math.max(1, snapshot.total)) * 100),
      )
    : 0;

  useEffect(() => {
    if (!discover) return;
    const element = deckRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const height = entry.contentRect.height;
      setDensity(height < 340 ? "tight" : height < 460 ? "compact" : "regular");
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [discover]);

  useEffect(() => {
    if (!discover) return;
    function onKeyDown(event: KeyboardEvent) {
      if (!top) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        decide(top, "like");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        decide(top, "pass");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [decide, discover, top]);

  const footer = top ? (
    <div className="relative mt-1 flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => decide(top, "pass")}
        disabled={pending !== null}
        aria-label={`Passer ${top.title}`}
        className="grid h-12 w-12 place-items-center rounded-full border border-gold/25 bg-ink-800/70 text-cream/65 transition hover:border-rose/50 hover:bg-rose/10 hover:text-cream active:scale-95 disabled:opacity-40"
      >
        <XIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => decide(top, "like")}
        disabled={pending !== null}
        aria-label={`Garder ${top.title}`}
        className="inline-flex h-12 items-center gap-1.5 rounded-full border border-gold/45 bg-gradient-to-r from-ember to-rose px-4 text-[12px] font-semibold text-cream shadow-[0_12px_26px_-14px_rgba(158,25,45,0.95)] transition hover:border-gold/70 hover:brightness-110 active:scale-95 disabled:opacity-40"
      >
        <HeartIcon className="h-4 w-4" />
        Coup de cœur
      </button>
    </div>
  ) : null;

  const progressBlock = (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10.5px] text-ash">
        <span className="tabular-nums">
          {snapshot
            ? `${snapshot.swiped} / ${snapshot.total} cartes · 40 par page`
            : "—"}
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
        className="h-1 overflow-hidden rounded-full bg-ink-700/70 ring-1 ring-inset ring-gold/10"
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
  );

  const stack = (
    <>
      {third ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 translate-y-4 scale-[0.94] opacity-40"
        >
          <ChoiceCard choice={third} compact tight />
        </div>
      ) : null}
      {second ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 translate-y-2 scale-[0.97] opacity-65"
        >
          <ChoiceCard choice={second} compact tight />
        </div>
      ) : null}
    </>
  );

  if (discover) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 px-4 pt-2.5">
          {progressBlock}
          {error ? (
            <div
              role="alert"
              className="mt-2 flex items-start gap-2 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[11px] leading-relaxed text-rose-soft"
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
        </div>

        <section className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-1 pt-2">
          <div
            ref={deckRef}
            className="relative h-full min-h-0 w-full max-w-[400px]"
          >
            {stack}

            <AnimatePresence mode="popLayout" custom={exitDirection}>
              {top ? (
                <motion.div
                  key={`${top.category}:${top.id}`}
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  variants={EXIT_VARIANTS}
                  exit={exitDirection}
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  drag="x"
                  dragConstraints={{ left: -240, right: 240 }}
                  dragElastic={0.2}
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
                  className="absolute inset-0 z-20 cursor-grab touch-none active:cursor-grabbing"
                >
                  <ChoiceCard
                    choice={top}
                    number={(snapshot?.swiped ?? 0) + 1}
                    compact={density !== "regular"}
                    tight={density === "tight"}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {!top && loading ? (
              <div className="absolute inset-0 animate-pulse rounded-[24px] border border-gold/15 bg-ink-850/70" />
            ) : null}

            {!top && !loading ? (
              <div className="grimoire absolute inset-0 flex flex-col items-center justify-center rounded-[24px] px-5 text-center">
                <span aria-hidden className="text-3xl">
                  {category === "food" ? "🍽️" : "🎬"}
                </span>
                <p className="mt-2 font-display text-[19px] leading-tight text-cream">
                  {meta.emptyTitle}
                </p>
                <p className="mt-1 max-w-[250px] text-[11px] leading-relaxed text-ash">
                  {meta.emptyText}
                </p>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/[0.06] px-2.5 py-1.5 text-[10.5px] text-gold transition hover:border-gold/55 hover:text-cream"
                >
                  <RefreshIcon className="h-3 w-3" />
                  Rafraîchir
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {top ? (
          <div className="shrink-0 px-4 pb-1 pt-1">
            <div className="mx-auto flex h-[68px] w-full max-w-md items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => decide(top, "pass")}
                disabled={pending !== null}
                aria-label={`Passer ${top.title}`}
                className="grid h-[60px] w-[60px] place-items-center rounded-full border border-gold/25 bg-ink-800/70 text-cream/70 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.9)] transition hover:border-rose/60 hover:bg-rose/15 hover:text-rose-soft active:scale-95 disabled:opacity-40"
              >
                <XIcon className="h-[26px] w-[26px]" />
              </button>
              <button
                type="button"
                onClick={() => decide(top, "like")}
                disabled={pending !== null}
                aria-label={`Garder ${top.title}`}
                className="grid h-[60px] w-[60px] place-items-center rounded-full border border-gold/50 bg-gradient-to-br from-ember via-rose to-[#4a0d14] text-cream shadow-[0_16px_38px_-14px_rgba(158,25,45,0.9)] transition hover:border-gold/75 hover:brightness-110 active:scale-95 disabled:opacity-40"
              >
                <HeartIcon className="h-[26px] w-[26px]" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {hideTabs ? null : (
        <div className="flex rounded-xl border border-gold/20 bg-ink-800/50 p-1">
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
                    ? "bg-gold/[0.1] text-cream shadow-[inset_0_-1px_0_rgba(197,160,89,0.65)]"
                    : "text-ash hover:text-cream/75"
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
      )}

      {progressBlock}

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
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold/80">
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
                    ? "bg-ink-800/70 text-cream/60 ring-gold/15"
                    : "bg-rose/20 text-rose-soft ring-gold/30"
                }`}
              >
                <span aria-hidden>{match.choice.emoji}</span>
                <span className="truncate">{match.choice.title}</span>
                {!match.seen ? (
                  <span
                    aria-label="Nouveau match"
                    className="h-1.5 w-1.5 shrink-0 rotate-45 bg-gold"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="relative mx-auto h-[300px] w-full max-w-[340px]">
        {stack}

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
              className="absolute inset-0 z-20 cursor-grab touch-pan-y active:cursor-grabbing"
            >
              <ChoiceCard
                choice={top}
                number={(snapshot?.swiped ?? 0) + 1}
                compact
                tight
                footer={footer}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!top && loading ? (
          <div className="absolute inset-0 animate-pulse rounded-[24px] border border-gold/15 bg-ink-850/70" />
        ) : null}

        {!top && !loading ? (
          <div className="grimoire absolute inset-0 flex flex-col items-center justify-center rounded-[24px] px-5 text-center">
            <span aria-hidden className="text-3xl">
              {category === "food" ? "🍽️" : "🎬"}
            </span>
            <p className="mt-2 font-display text-[17px] text-cream">
              {meta.emptyTitle}
            </p>
            <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-ash">
              {meta.emptyText}
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/[0.06] px-2.5 py-1.5 text-[10.5px] text-gold transition hover:border-gold/55 hover:text-cream"
            >
              <RefreshIcon className="h-3 w-3" />
              Rafraîchir
            </button>
          </div>
        ) : null}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-ash">
        <SparklesIcon className="h-3 w-3" />
        Glissez la carte ou utilisez les boutons · un match apparaît quand vous
        aimez la même carte
      </p>
    </section>
  );
}
