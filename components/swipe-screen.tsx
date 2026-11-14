"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";
import { Brand } from "@/components/brand";
import { DateCard } from "@/components/date-card";
import { TapButton } from "@/components/tap-button";
import {
  AlertIcon,
  ArrowRightIcon,
  CardsIcon,
  HeartIcon,
  SlidersIcon,
  SparklesIcon,
  UndoIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";
import type { Idea, SwipeDirection } from "@/lib/types";

const SWIPE_THRESHOLD = 105;
const VELOCITY_THRESHOLD = 620;
const FLY_DISTANCE = 640;

type Props = {
  ideas: Idea[];
  index: number;
  total: number;
  swiped: number;
  likedCount: number;
  prefsSummary: string;
  duoActive: boolean;
  duoUnread: number;
  choiceUnread: number;
  tapEnabled: boolean;
  canUndo: boolean;
  undoBusy: boolean;
  pending: number;
  offline: boolean;
  syncError: string | null;
  onDecide: (idea: Idea, direction: SwipeDirection) => void;
  onUndo: () => void;
  onRetrySync: () => void;
  onOpenSettings: () => void;
  onOpenResults: () => void;
  onOpenDuo: () => void;
  onOpenChoices: () => void;
  onSendTap: () => Promise<unknown>;
  onTapError: (message: string) => void;
};

type SwipeCardHandle = {
  flyOut: (direction: SwipeDirection) => Promise<void>;
};

type SwipeCardProps = {
  idea: Idea;
  onDecide: (idea: Idea, direction: SwipeDirection) => void;
};

const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  function SwipeCard({ idea, onDecide }, ref) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-FLY_DISTANCE, 0, FLY_DISTANCE], [-18, 0, 18]);
    const likeOpacity = useTransform(x, [28, 140], [0, 1]);
    const passOpacity = useTransform(x, [-140, -28], [1, 0]);
    const decidedRef = useRef(false);

    const flyOut = useCallback(
      async (direction: SwipeDirection) => {
        if (decidedRef.current) return;
        decidedRef.current = true;

        await new Promise<void>((resolve) => {
          animate(x, direction === "like" ? FLY_DISTANCE : -FLY_DISTANCE, {
            duration: 0.28,
            ease: [0.3, 0.8, 0.2, 1],
            onComplete: () => resolve(),
          });
        });

        onDecide(idea, direction);
      },
      [idea, onDecide, x],
    );

    useImperativeHandle(ref, () => ({ flyOut }), [flyOut]);

    const handleDragEnd = useCallback(
      (_event: unknown, info: PanInfo) => {
        if (decidedRef.current) return;

        const shouldLike =
          info.offset.x > SWIPE_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD;
        const shouldPass =
          info.offset.x < -SWIPE_THRESHOLD ||
          info.velocity.x < -VELOCITY_THRESHOLD;

        if (shouldLike) {
          void flyOut("like");
        } else if (shouldPass) {
          void flyOut("pass");
        } else {
          animate(x, 0, { type: "spring", stiffness: 420, damping: 34 });
        }
      },
      [flyOut, x],
    );

    return (
      <motion.div
        drag="x"
        dragMomentum={false}
        dragElastic={0.9}
        dragConstraints={{ left: -520, right: 520 }}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0.965, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        style={{ x, rotate }}
        className="absolute inset-0 z-20 cursor-grab touch-none active:cursor-grabbing"
        aria-roledescription="carte à swiper"
      >
        <DateCard idea={idea} />

        <motion.div
          style={{ opacity: likeOpacity }}
          aria-hidden
          className="pointer-events-none absolute left-5 top-20 z-10 rotate-[-7deg] rounded-lg border border-gold bg-ink-950/55 px-3 py-1 font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-gold shadow-lg backdrop-blur-sm"
        >
          Ça me tente
        </motion.div>

        <motion.div
          style={{ opacity: passOpacity }}
          aria-hidden
          className="pointer-events-none absolute right-5 top-20 z-10 rotate-[7deg] rounded-lg border border-rose-soft/70 bg-ink-950/55 px-3 py-1 font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-rose-soft shadow-lg backdrop-blur-sm"
        >
          Pas pour moi
        </motion.div>
      </motion.div>
    );
  },
);

export function SwipeScreen({
  ideas,
  index,
  total,
  swiped,
  likedCount,
  prefsSummary,
  duoActive,
  duoUnread,
  choiceUnread,
  tapEnabled,
  canUndo,
  undoBusy,
  pending,
  offline,
  syncError,
  onDecide,
  onUndo,
  onRetrySync,
  onOpenSettings,
  onOpenResults,
  onOpenDuo,
  onOpenChoices,
  onSendTap,
  onTapError,
}: Props) {
  const cardRef = useRef<SwipeCardHandle>(null);
  const top = ideas[index];
  const second = ideas[index + 1];
  const third = ideas[index + 2];
  const progress = total > 0 ? Math.min(100, Math.round((swiped / total) * 100)) : 0;

  const decide = useCallback(
    (direction: SwipeDirection) => {
      if (!top) return;
      void cardRef.current?.flyOut(direction);
    },
    [top],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

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
        decide("like");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        decide("pass");
      } else if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        onUndo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [decide, onUndo]);

  return (
    <main className="flex h-screen h-dvh flex-col overflow-hidden [@media(max-height:520px)]:overflow-y-auto">
      <header className="shrink-0 px-3 pt-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2">
          <Brand />

          <div className="flex items-center gap-0.5 sm:gap-1.5">
            {duoActive && tapEnabled ? (
              <TapButton onSend={onSendTap} onError={onTapError} />
            ) : null}
            <button
              type="button"
              onClick={onOpenDuo}
              aria-label={
                duoUnread > 0
                  ? `Espace à deux, ${duoUnread} nouveau${duoUnread > 1 ? "x" : ""} match${duoUnread > 1 ? "s" : ""}`
                  : "Espace à deux"
              }
              className={`relative inline-flex items-center gap-1.5 rounded-full border px-2 py-2 text-[12px] font-medium transition sm:px-3 ${
                duoActive
                  ? "border-gold/35 bg-gold/[0.08] text-gold hover:bg-gold/15"
                  : "border-gold/20 bg-ink-800/60 text-cream/60 hover:border-gold/40 hover:text-cream"
              }`}
            >
              <UsersIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Duo</span>
              {duoUnread > 0 ? (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9.5px] font-bold leading-none text-cream ring-1 ring-gold/40">
                  {duoUnread > 9 ? "9+" : duoUnread}
                </span>
              ) : duoActive ? (
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-mint"
                />
              ) : null}
            </button>
            {duoActive ? (
              <button
                type="button"
                onClick={onOpenChoices}
                aria-label={
                  choiceUnread > 0
                    ? `Nourriture et Films, ${choiceUnread} nouveau${choiceUnread > 1 ? "x" : ""} match${choiceUnread > 1 ? "s" : ""}`
                    : "Nourriture et Films"
                }
                className="relative inline-flex min-h-11 items-center gap-1.5 rounded-full border border-mint/25 bg-mint/[0.07] px-2 py-2 text-[12px] font-medium text-mint transition hover:border-mint/40 hover:bg-mint/15 sm:px-3"
              >
                <CardsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Choix</span>
                {choiceUnread > 0 ? (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9.5px] font-bold leading-none text-cream ring-1 ring-gold/40">
                    {choiceUnread > 9 ? "9+" : choiceUnread}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenResults}
              aria-label={`Voir mes envies (${likedCount})`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rose/40 bg-rose/15 px-2 py-2 text-[12px] font-medium text-rose-soft transition hover:border-rose/60 hover:bg-rose/20 sm:px-3"
            >
              <HeartIcon className="h-4 w-4" />
              <span className="tabular-nums">{likedCount}</span>
              <span className="hidden sm:inline">envie{likedCount > 1 ? "s" : ""}</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Modifier mes envies"
              className="grid h-11 w-11 place-items-center rounded-full border border-gold/20 bg-ink-800/60 text-cream/60 transition hover:border-gold/40 hover:text-cream"
            >
              <SlidersIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-3 w-full max-w-4xl">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[10.5px] text-ash">
            <span className="tabular-nums">
              {Math.min(swiped, total)} / {total} cartes
            </span>
            <span className="hidden min-w-0 truncate sm:block">{prefsSummary}</span>
            <span className="tabular-nums sm:hidden">{progress} %</span>
          </div>
          <div
            role="progressbar"
            aria-label="Progression du swipe"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.min(swiped, total)}
            className="h-1 overflow-hidden rounded-full bg-ink-700/70 ring-1 ring-inset ring-gold/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-ember via-rose to-gold transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {pending > 0 || offline ? (
          <div
            className="mx-auto mt-2 flex w-full max-w-4xl items-center justify-between gap-2 rounded-lg border border-gold/20 bg-gold/[0.07] px-3 py-1.5 text-[10.5px] text-gold"
            role="status"
            title={syncError ?? undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              {offline ? (
                <AlertIcon className="h-3.5 w-3.5" />
              ) : (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              )}
              {offline
                ? `Synchronisation en attente (${pending})`
                : "Synchronisation…"}
            </span>
            {offline ? (
              <button
                type="button"
                onClick={onRetrySync}
                className="rounded px-1.5 py-0.5 font-semibold underline-offset-2 hover:underline"
              >
                Réessayer
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <section className="flex min-h-0 flex-1 items-center justify-center px-4 py-3 sm:px-6 [@media(max-height:520px)]:min-h-[400px] [@media(max-height:520px)]:py-4">
        <div className="relative h-full max-h-[620px] w-full max-w-[400px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 bottom-3 top-6 rounded-[38px] bg-gradient-to-b from-rose/25 via-ember/10 to-transparent blur-2xl"
          />

          {top ? (
            <>
              {third ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 translate-y-4 scale-[0.94] opacity-45"
                >
                  <DateCard idea={third} />
                </div>
              ) : null}

              {second ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 translate-y-2 scale-[0.97] opacity-70"
                >
                  <DateCard idea={second} />
                </div>
              ) : null}

              <SwipeCard
                key={top.id}
                ref={cardRef}
                idea={top}
                onDecide={onDecide}
              />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-[28px] p-7 text-center grimoire ornament-corners">
              <span aria-hidden className="text-5xl">
                🌙
              </span>
              <h2 className="mt-4 font-display text-[26px] leading-tight text-cream">
                C’est tout pour cette sélection
              </h2>
              <p className="mt-2 max-w-[260px] text-[12.5px] leading-relaxed text-cream/55">
                {likedCount > 0
                  ? `Vous avez gardé ${likedCount} envie${likedCount > 1 ? "s" : ""}. Il ne reste plus qu’à choisir le jour.`
                  : "Aucune carte gardée cette fois. Ajustez vos envies pour découvrir d’autres idées."}
              </p>

              {likedCount > 0 ? (
                <button
                  type="button"
                  onClick={onOpenResults}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-2.5 text-[13px] font-semibold text-cream shadow-[0_14px_30px_-16px_rgba(158,25,45,0.95)] transition hover:border-gold/70 hover:brightness-110"
                >
                  Voir mes envies
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={onOpenSettings}
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-ash transition hover:text-cream/80"
              >
                <SlidersIcon className="h-3.5 w-3.5" />
                Ajuster mes envies
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="safe-bottom shrink-0 px-4 pb-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => decide("pass")}
              disabled={!top}
              aria-label="Passer cette idée"
              className="grid h-[62px] w-[62px] place-items-center rounded-full border border-gold/25 bg-ink-800/70 text-cream/70 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.9)] transition hover:border-rose/60 hover:bg-rose/15 hover:text-rose-soft active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <XIcon className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo || undoBusy}
              aria-label="Annuler le dernier swipe"
              title="Annuler le dernier swipe (Z)"
              className="grid h-11 w-11 place-items-center rounded-full border border-gold/15 bg-ink-800/60 text-ash transition hover:border-gold/35 hover:text-cream disabled:cursor-not-allowed disabled:opacity-25"
            >
              <UndoIcon
                className={`h-4 w-4 ${undoBusy ? "animate-spin" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={() => decide("like")}
              disabled={!top}
              aria-label="Garder cette idée"
              className="grid h-[62px] w-[62px] place-items-center rounded-full border border-gold/50 bg-gradient-to-br from-ember via-rose to-[#4a0d14] text-cream shadow-[0_16px_38px_-14px_rgba(158,25,45,0.9)] transition hover:border-gold/75 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <HeartIcon className="h-6 w-6" />
            </button>
          </div>

          <p className="flex items-center gap-1.5 text-center text-[10px] text-ash">
            <SparklesIcon className="h-3 w-3" />
            <span className="hidden sm:inline">
              Glissez la carte · ← passer · → garder · Z annuler
            </span>
            <span className="sm:hidden">Glissez ou utilisez les boutons</span>
          </p>
        </div>
      </footer>
    </main>
  );
}
