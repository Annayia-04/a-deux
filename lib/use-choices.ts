"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api-client";
import type {
  Choice,
  ChoiceCategory,
  ChoiceSnapshot,
  SwipeDirection,
} from "@/lib/types";

export function useChoices({
  enabled,
  coupleCode,
  onMatch,
}: {
  enabled: boolean;
  coupleCode: string | null;
  onMatch: (choice: Choice) => void;
}) {
  const [category, setCategory] = useState<ChoiceCategory>("food");
  const [snapshot, setSnapshot] = useState<ChoiceSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const generationRef = useRef(0);
  const pendingRef = useRef<string | null>(null);
  const categoryRef = useRef(category);
  const onMatchRef = useRef(onMatch);

  useEffect(() => {
    onMatchRef.current = onMatch;
  }, [onMatch]);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  const refresh = useCallback(
    async (nextCategory: ChoiceCategory = category) => {
      const generation = generationRef.current + 1;
      generationRef.current = generation;
      setLoading(true);

      try {
        const result = await api.getChoices(nextCategory);
        if (generationRef.current !== generation) return;
        setSnapshot(result);
        setError(null);
      } catch (caught) {
        if (generationRef.current !== generation) return;
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Impossible de charger les cartes.",
        );
      } finally {
        if (generationRef.current === generation) setLoading(false);
      }
    },
    [category],
  );

  useEffect(() => {
    if (!enabled || !coupleCode) {
      setSnapshot(null);
      setError(null);
      return;
    }
    setSnapshot(null);
    void refresh(category);
  }, [enabled, coupleCode, category, refresh]);

  const swipe = useCallback(
    async (choice: Choice, direction: SwipeDirection) => {
      if (pendingRef.current) return;
      pendingRef.current = choice.id;
      setPending(choice.id);
      setError(null);

      const targetCategory = category;
      const stillCurrent = () => categoryRef.current === targetCategory;

      setSnapshot((current) =>
        current
          ? {
              ...current,
              deck: current.deck.filter((item) => item.id !== choice.id),
              swiped: current.swiped + 1,
              liked:
                direction === "like"
                  ? [choice, ...current.liked]
                  : current.liked,
            }
          : current,
      );

      try {
        const result = await api.swipeChoice(
          targetCategory,
          choice.id,
          direction,
        );
        if (!stillCurrent()) return;
        if (result.match) {
          onMatchRef.current(result.match);
          void refresh(targetCategory);
        }
      } catch (caught) {
        if (!stillCurrent()) return;
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Impossible d’enregistrer ce choix.",
        );
        void refresh(targetCategory);
      } finally {
        pendingRef.current = null;
        setPending(null);
      }
    },
    [category, refresh],
  );

  const markSeen = useCallback(async () => {
    if (!snapshot || snapshot.unread === 0) return;
    try {
      await api.markChoicesSeen(snapshot.category);
      setSnapshot((current) =>
        current
          ? {
              ...current,
              unread: 0,
              matches: current.matches.map((match) => ({
                ...match,
                seen: true,
              })),
            }
          : current,
      );
    } catch {
      // Best effort : le prochain rafraîchissement remettra le compteur à jour.
    }
  }, [snapshot]);

  return {
    category,
    setCategory,
    snapshot,
    loading,
    error,
    pending,
    refresh,
    swipe,
    markSeen,
  };
}
