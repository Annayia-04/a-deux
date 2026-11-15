"use client";

import { ChoiceDeck } from "@/components/choice-deck";
import { HeartIcon, UsersIcon } from "@/components/icons";
import type {
  Choice,
  ChoiceCategory,
  ChoiceSnapshot,
  SwipeDirection,
} from "@/lib/types";

/**
 * Decks Food et Film de l'onglet Découvrir. Ils ne s'ouvrent qu'une fois le
 * duo complet : les matchs Food/Film sont des contenus partagés.
 */
export function ChoicesDiscover({
  category,
  complete,
  snapshot,
  loading,
  error,
  pending,
  onSwipe,
  onRefresh,
  onGoDuo,
}: {
  category: ChoiceCategory;
  complete: boolean;
  snapshot: ChoiceSnapshot | null;
  loading: boolean;
  error: string | null;
  pending: string | null;
  onSwipe: (choice: Choice, direction: SwipeDirection) => void;
  onRefresh: () => void;
  onGoDuo: () => void;
}) {
  if (!complete) {
    return (
      <div className="flex h-full items-center justify-center px-4 pb-4">
        <div className="grimoire ornament-corners w-full max-w-[380px] rounded-[26px] px-6 py-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
            <UsersIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-display text-[24px] leading-tight text-cream">
            Food et Film se découvrent à deux.
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-cream/55">
            Créez votre duo pour swiper les plats et les films, et voir les
            matchs communs apparaître.
          </p>
          <button
            type="button"
            onClick={onGoDuo}
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-2.5 text-[13px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110"
          >
            <HeartIcon className="h-4 w-4" />
            Créer notre duo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 pb-1 pt-2">
      <ChoiceDeck
        category={category}
        onCategoryChange={() => undefined}
        snapshot={snapshot}
        loading={loading}
        error={error}
        pending={pending}
        onSwipe={onSwipe}
        onRefresh={onRefresh}
        hideTabs
        discover
      />
    </div>
  );
}
