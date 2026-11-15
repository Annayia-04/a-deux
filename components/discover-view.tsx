"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";
import { DateCard } from "@/components/date-card";
import {
  AlertIcon,
  ArrowRightIcon,
  FlameIcon,
  HeartIcon,
  SlidersIcon,
  SparklesIcon,
  UndoIcon,
  XIcon,
} from "@/components/icons";
import { vibrateTap } from "@/lib/feedback";
import type { Idea, SwipeDirection } from "@/lib/types";

const HINT_KEY = "a-deux:swipe-hint";
const FLY_DISTANCE = 640;
const VELOCITY_THRESHOLD = 620;

type Props = {
  ideas: Idea[];
  index: number;
  total: number;
  swiped: number;
  likedCount: number;
  hasSession: boolean;
  canUndo: boolean;
  undoBusy: boolean;
  pending: number;
  offline: boolean;
  syncError: string | null;
  onDecide: (idea: Idea, direction: SwipeDirection) => void;
  onUndo: () => void;
  onRetrySync: () => void;
  onOpenFilters: () => void;
  onOpenPassed: () => void;
  onOpenWishlist: () => void;
};

type SwipeCardHandle = { flyOut: (direction: SwipeDirection) => Promise<void> };

/**
 * Onglet Découvrir : zéro scroll, une pile de cartes et un dock d'actions.
 * Toute la logique de session reste dans `DateSwipeApp`, ce composant ne fait
 * que présenter et animer.
 */
export function DiscoverView({
  ideas,
  index,
  total,
  swiped,
  likedCount,
  hasSession,
  canUndo,
  undoBusy,
  pending,
  offline,
  syncError,
  onDecide,
  onUndo,
  onRetrySync,
  onOpenFilters,
  onOpenPassed,
  onOpenWishlist,
}: Props) {
  const cardRef = useRef<SwipeCardHandle>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const top = ideas[index];
  const second = ideas[index + 1];
  const third = ideas[index + 2];
  const progress = total > 0 ? Math.min(100, Math.round((swiped / total) * 100)) : 0;

  // La carte s'adapte à la hauteur réellement disponible (petits téléphones).
  useEffect(() => {
    const element = deckRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setCompact(entry.contentRect.height < 520);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Indication de première visite, affichée au-dessus de la carte.
  useEffect(() => {
    try {
      setHintVisible(!window.localStorage.getItem(HINT_KEY));
    } catch {
      setHintVisible(true);
    }
  }, []);

  const dismissHint = useCallback(() => {
    setHintVisible(false);
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      // Stockage indisponible : l'indication reviendra au prochain chargement.
    }
  }, []);

  useEffect(() => {
    if (swiped > 0) dismissHint();
  }, [dismissHint, swiped]);

  const decide = useCallback(
    (direction: SwipeDirection) => {
      if (!top) return;
      void cardRef.current?.flyOut(direction);
    },
    [top],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      const undoShortcut =
        event.key.toLowerCase() === "z" &&
        (event.ctrlKey || event.metaKey || !event.altKey);
      if (undoShortcut) {
        event.preventDefault();
        onUndo();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        decide("like");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        decide("pass");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [decide, onUndo]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none">
      <div className={`shrink-0 px-4 ${hasSession ? "pt-2.5" : "pt-1"}`}>
        <div className={`mx-auto w-full max-w-md ${hasSession ? "" : "hidden"}`}>
          <div className="flex items-center justify-between gap-3 text-[10.5px] text-ash">
            <span className="tabular-nums">
              {Math.min(swiped, total)} / {total} cartes
            </span>
            <span className="inline-flex items-center gap-1.5 text-cream/45">
              <HeartIcon className="h-3 w-3 text-rose-soft" />
              {likedCount} gardée{likedCount > 1 ? "s" : ""}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progression du swipe"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.min(swiped, total)}
            className="mt-1 h-1 overflow-hidden rounded-full bg-ink-700/70 ring-1 ring-inset ring-gold/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-ember via-rose to-gold transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {pending > 0 || offline ? (
            <div
              role="status"
              title={syncError ?? undefined}
              className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-gold/20 bg-gold/[0.07] px-2.5 py-1 text-[10px] text-gold"
            >
              <span className="inline-flex items-center gap-1.5">
                {offline ? (
                  <AlertIcon className="h-3 w-3" />
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
                  className="rounded px-1 py-0.5 font-semibold underline-offset-2 hover:underline"
                >
                  Réessayer
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <section className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-1 pt-2.5">
        {hasSession && top && hintVisible ? (
          <div className="mx-auto mb-2 flex w-full max-w-[420px] shrink-0 items-center justify-center gap-2 rounded-xl border border-gold/20 bg-gold/[0.06] px-3 py-1.5 text-center text-[10.5px] text-cream/75">
            <ArrowRightIcon className="h-3.5 w-3.5 text-gold" />
            Glissez à droite pour garder · à gauche pour passer
          </div>
        ) : null}
        <div
          ref={deckRef}
          className="relative mx-auto min-h-0 w-full max-w-[420px] flex-1"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 bottom-4 top-8 rounded-[34px] bg-gradient-to-b from-rose/20 via-ember/[0.08] to-transparent blur-2xl"
          />

          {!hasSession ? (
            <EmptyStart onOpenFilters={onOpenFilters} />
          ) : top ? (
            <>
              {third ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 translate-y-4 scale-[0.94] opacity-40"
                >
                  <DateCard idea={third} compact={compact} />
                </div>
              ) : null}
              {second ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 translate-y-2 scale-[0.97] opacity-65"
                >
                  <DateCard idea={second} compact={compact} />
                </div>
              ) : null}

              <SwipeCard
                key={top.id}
                ref={cardRef}
                idea={top}
                compact={compact}
                onDecide={onDecide}
                onInteract={dismissHint}
              />
            </>
          ) : (
            <EndOfDeck
              likedCount={likedCount}
              onOpenFilters={onOpenFilters}
              onOpenPassed={onOpenPassed}
              onOpenWishlist={onOpenWishlist}
            />
          )}
        </div>
      </section>

      {hasSession && top ? (
        <div className="shrink-0 px-4 pb-1 pt-1">
          <div className="mx-auto flex h-[68px] w-full max-w-md items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => decide("pass")}
              aria-label="Passer cette idée"
              className="grid h-[60px] w-[60px] place-items-center rounded-full border border-gold/25 bg-ink-800/70 text-cream/70 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.9)] transition hover:border-rose/60 hover:bg-rose/15 hover:text-rose-soft active:scale-95"
            >
              <XIcon className="h-[26px] w-[26px]" />
            </button>

            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo || undoBusy}
              aria-label="Annuler le dernier swipe"
              title="Annuler le dernier swipe (Ctrl+Z)"
              className="grid h-12 w-12 place-items-center rounded-full border border-gold/15 bg-ink-800/60 text-ash transition hover:border-gold/35 hover:text-cream disabled:cursor-not-allowed disabled:opacity-25"
            >
              <UndoIcon
                className={`h-[18px] w-[18px] ${undoBusy ? "animate-spin" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={() => decide("like")}
              aria-label="Garder cette idée"
              className="grid h-[60px] w-[60px] place-items-center rounded-full border border-gold/50 bg-gradient-to-br from-ember via-rose to-[#4a0d14] text-cream shadow-[0_16px_38px_-14px_rgba(158,25,45,0.9)] transition hover:border-gold/75 hover:brightness-110 active:scale-95"
            >
              <HeartIcon className="h-[26px] w-[26px]" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const SwipeCard = forwardRef<SwipeCardHandle, {
  idea: Idea;
  compact: boolean;
  onDecide: (idea: Idea, direction: SwipeDirection) => void;
  onInteract: () => void;
}>(function SwipeCard({ idea, compact, onDecide, onInteract }, ref) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-FLY_DISTANCE, 0, FLY_DISTANCE], [-16, 0, 16]);
  const likeOpacity = useTransform(x, [24, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -24], [1, 0]);
  const decidedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const flyOut = useCallback(
    async (direction: SwipeDirection) => {
      if (decidedRef.current) return;
      decidedRef.current = true;

      await new Promise<void>((resolve) => {
        animate(x, direction === "like" ? FLY_DISTANCE : -FLY_DISTANCE, {
          duration: 0.26,
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

      const width = containerRef.current?.offsetWidth ?? 360;
      const threshold = width * 0.35;
      const shouldLike =
        info.offset.x > threshold || info.velocity.x > VELOCITY_THRESHOLD;
      const shouldPass =
        info.offset.x < -threshold || info.velocity.x < -VELOCITY_THRESHOLD;

      if (shouldLike) {
        vibrateTap([10]);
        void flyOut("like");
      } else if (shouldPass) {
        vibrateTap([10]);
        void flyOut("pass");
      } else {
        animate(x, 0, { type: "spring", stiffness: 420, damping: 34 });
      }
    },
    [flyOut, x],
  );

  return (
    <div ref={containerRef} className="absolute inset-0 z-20">
      <motion.div
        drag="x"
        dragMomentum={false}
        dragElastic={0.85}
        dragConstraints={{ left: -520, right: 520 }}
        onDragStart={onInteract}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0.965, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        style={{ x, rotate }}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        aria-roledescription="carte à swiper"
      >
        <DateCard idea={idea} compact={compact} />

        <motion.div
          style={{ opacity: likeOpacity }}
          aria-hidden
          className="pointer-events-none absolute left-4 top-[30%] z-10 rotate-[-7deg] rounded-lg border-2 border-mint/80 bg-ink-950/60 px-3 py-1 font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-mint shadow-lg backdrop-blur-sm"
        >
          À garder
        </motion.div>

        <motion.div
          style={{ opacity: passOpacity }}
          aria-hidden
          className="pointer-events-none absolute right-4 top-[30%] z-10 rotate-[7deg] rounded-lg border-2 border-rose-soft/80 bg-ink-950/60 px-3 py-1 font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-rose-soft shadow-lg backdrop-blur-sm"
        >
          Passer
        </motion.div>

      </motion.div>
    </div>
  );
});

function EmptyStart({ onOpenFilters }: { onOpenFilters: () => void }) {
  return (
    <div className="grimoire ornament-corners flex h-full flex-col items-center justify-center rounded-[26px] px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
        <FlameIcon className="h-7 w-7" />
      </span>
      <h1 className="balance mt-5 font-display text-[30px] leading-[1.05] text-cream">
        Votre prochain rendez-vous commence ici.
      </h1>
      <p className="mt-2 max-w-[280px] text-[12.5px] leading-relaxed text-cream/55">
        Choisissez vos envies, puis glissez les cartes : gardez celles qui vous
        tentent, laissez filer les autres.
      </p>
      <button
        type="button"
        onClick={onOpenFilters}
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-3 text-[13px] font-semibold text-cream shadow-[0_14px_30px_-16px_rgba(158,25,45,0.95)] transition hover:border-gold/70 hover:brightness-110"
      >
        <SparklesIcon className="h-4 w-4" />
        Choisir mes envies
      </button>
      <p className="mt-3 text-[10.5px] text-ash">
        Sans compte · session anonyme de 30 jours
      </p>
    </div>
  );
}

function EndOfDeck({
  likedCount,
  onOpenFilters,
  onOpenPassed,
  onOpenWishlist,
}: {
  likedCount: number;
  onOpenFilters: () => void;
  onOpenPassed: () => void;
  onOpenWishlist: () => void;
}) {
  return (
    <div className="grimoire ornament-corners flex h-full flex-col items-center justify-center rounded-[26px] px-6 py-8 text-center">
      <span aria-hidden className="text-4xl">
        🌙
      </span>
      <h2 className="mt-3 font-display text-[26px] leading-tight text-cream">
        C’est tout pour cette sélection
      </h2>
      <p className="mt-1.5 max-w-[260px] text-[12px] leading-relaxed text-cream/55">
        {likedCount > 0
          ? `${likedCount} envie${likedCount > 1 ? "s" : ""} gardée${likedCount > 1 ? "s" : ""}. Changez de filtres ou revoyez les cartes passées.`
          : "Aucune carte gardée cette fois. Élargissez vos filtres pour découvrir d’autres idées."}
      </p>

      <div className="mt-5 flex w-full max-w-[260px] flex-col gap-2">
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-4 py-2.5 text-[13px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110"
        >
          <SlidersIcon className="h-4 w-4" />
          Élargir mes filtres
        </button>
        <button
          type="button"
          onClick={onOpenPassed}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gold/20 bg-ink-800/60 px-4 py-2.5 text-[12px] font-medium text-cream/75 transition hover:border-gold/40 hover:text-cream"
        >
            Revoir les idées passées
        </button>
      </div>

      {likedCount > 0 ? (
        <button
          type="button"
          onClick={onOpenWishlist}
          className="mt-3 inline-flex items-center gap-1 text-[11px] text-cream/50 transition hover:text-cream/80"
        >
          <HeartIcon className="h-3.5 w-3.5" />
          Voir mes envies
          <ArrowRightIcon className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
