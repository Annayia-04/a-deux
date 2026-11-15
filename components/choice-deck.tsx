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
import {
  CHOICE_CATEGORY_META,
  FOOD_MODE_META,
  MOVIE_PLATFORM_LABEL,
  budgetLabel,
  formatChoiceDuration,
} from "@/lib/choices";
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
  const top = snapshot?.deck[0];
  const foodMode = top?.mode ? FOOD_MODE_META[top.mode] : null;
  const movieDuration = top?.duration
    ? formatChoiceDuration(top.duration)
    : null;
  const moviePlatform = top?.platform
    ? MOVIE_PLATFORM_LABEL[top.platform]
    : null;
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
    <section
      className={
        discover
          ? "flex h-full min-h-0 flex-col justify-center gap-3"
          : "space-y-4"
      }
    >
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

      <div className={discover ? "mx-auto w-full max-w-[360px]" : ""}>
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-ash">
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

      {!discover && snapshot && snapshot.matches.length > 0 ? (
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

      <div
        className={
          discover
            ? "relative mx-auto h-[min(52dvh,400px)] w-full max-w-[360px]"
            : "relative mx-auto h-[248px] w-full max-w-[320px]"
        }
      >
        {third ? (
          <div
            aria-hidden
            className="absolute inset-x-2 bottom-0 top-4 rounded-[24px] border border-gold/12 bg-ink-850/70"
          />
        ) : null}
        {second ? (
          <div
            aria-hidden
            className="absolute inset-x-1 bottom-0 top-2 rounded-[26px] border border-gold/18 bg-ink-850/80"
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
              className={`frame-gold absolute inset-0 z-10 flex cursor-grab touch-pan-y flex-col overflow-hidden rounded-[26px] border border-gold/30 bg-ink-850 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] active:cursor-grabbing ${
                discover ? "p-5 [@media(max-height:720px)]:p-4" : "p-4"
              }`}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage: `radial-gradient(circle at 78% 8%, ${meta.gradient[0]}, transparent 55%), radial-gradient(circle at 8% 95%, ${meta.gradient[1]}, transparent 60%)`,
                }}
              />
              {discover ? (
                <>
                  <div className="relative flex items-start justify-between gap-2">
                    <span className="rounded-full border border-gold/25 bg-ink-950/60 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-cream/80">
                      {top.category === "food"
                        ? `${foodMode?.emoji ?? "🍽️"} ${foodMode?.label ?? meta.label}`
                        : (top.tags[0] ?? meta.label).replaceAll("-", " ")}
                    </span>
                    <span className="rounded-full border border-gold/25 bg-ink-950/60 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-gold/80">
                      {top.category === "food"
                        ? top.budget
                          ? budgetLabel(top.budget)
                          : meta.kicker
                        : `${movieDuration ?? ""}${top.rating ? ` · ★ ${top.rating.toFixed(1)}` : ""}`}
                    </span>
                  </div>

                  <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-1 text-center">
                    <span
                      aria-hidden
                      className="grid h-24 w-24 place-items-center rounded-[28px] text-[52px] ring-1 ring-gold/25 [@media(max-height:720px)]:h-16 [@media(max-height:720px)]:w-16 [@media(max-height:720px)]:rounded-[22px] [@media(max-height:720px)]:text-[34px]"
                      style={{
                        backgroundImage: `linear-gradient(145deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
                      }}
                    >
                      {top.emoji}
                    </span>
                    <h4 className="balance mt-4 font-display text-[27px] leading-[1.05] text-cream [@media(max-height:720px)]:mt-2 [@media(max-height:720px)]:text-[21px]">
                      {top.title}
                    </h4>
                    <p className="mt-1.5 line-clamp-2 max-w-[280px] text-[12.5px] leading-relaxed text-cream/60 [@media(max-height:720px)]:mt-1 [@media(max-height:720px)]:text-[11px]">
                      {top.tagline}
                    </p>
                    <p className="mt-1 text-[10.5px] text-ash [@media(max-height:720px)]:text-[10px]">
                      {top.category === "food"
                        ? top.time
                          ? `${top.time} min`
                          : ""
                        : moviePlatform ?? ""}
                    </p>
                    <ul className="mt-3 flex flex-wrap justify-center gap-1.5 [@media(max-height:720px)]:hidden">
                      {top.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-full bg-ink-800/80 px-2.5 py-0.5 text-[9.5px] text-cream/55 ring-1 ring-inset ring-gold/10"
                        >
                          {tag.replaceAll("-", " ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex items-start justify-between gap-2">
                    <span
                      aria-hidden
                      className="grid h-16 w-16 place-items-center rounded-2xl text-[34px] ring-1 ring-gold/25"
                      style={{
                        backgroundImage: `linear-gradient(145deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
                      }}
                    >
                      {top.emoji}
                    </span>
                    <span className="rounded-full border border-gold/25 bg-ink-950/60 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-gold/80">
                      {meta.kicker}
                    </span>
                  </div>

                  <div className="relative mt-3 min-h-0 flex-1 overflow-hidden">
                    <h4 className="balance font-display text-[24px] leading-[1.1] text-cream">
                      {top.title}
                    </h4>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-cream/55">
                      {top.tagline}
                    </p>
                    <p className="mt-1 text-[10px] text-ash">
                      {top.category === "food"
                        ? [foodMode?.label, top.budget ? budgetLabel(top.budget) : null, top.time ? `${top.time} min` : null]
                            .filter(Boolean)
                            .join(" · ")
                        : [movieDuration, top.rating ? `★ ${top.rating.toFixed(1)}` : null, moviePlatform]
                            .filter(Boolean)
                            .join(" · ")}
                    </p>
                    <ul className="mt-2.5 flex flex-wrap gap-1">
                      {top.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-full bg-ink-800/80 px-2 py-0.5 text-[9.5px] text-cream/55 ring-1 ring-inset ring-gold/10"
                        >
                          {tag.replaceAll("-", " ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <div className="relative mt-3 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => decide(top, "pass")}
                  disabled={pending !== null}
                  aria-label={`Passer ${top.title}`}
                  className="grid h-12 w-12 place-items-center rounded-full border border-gold/25 bg-ink-800/70 text-cream/65 transition hover:border-rose/60 hover:bg-rose/15 hover:text-rose-soft active:scale-95 disabled:opacity-40"
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
                  Ça me tente
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!top && loading ? (
          <div className="absolute inset-0 animate-pulse rounded-[26px] border border-gold/15 bg-ink-850/70" />
        ) : null}

        {!top && !loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[26px] border border-dashed border-gold/20 bg-ink-850/70 px-5 text-center">
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

      {discover ? null : (
        <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-ash">
          <SparklesIcon className="h-3 w-3" />
          Glissez la carte ou utilisez les boutons · un match apparaît quand vous
          aimez la même carte
          <ArrowRightIcon className="h-3 w-3" />
        </p>
      )}
    </section>
  );
}
