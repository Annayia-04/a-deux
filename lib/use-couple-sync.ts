"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api-client";
import type { ChoiceMatchSummary, CoupleSnapshot, Idea } from "@/lib/types";

const POLL_INTERVAL_MS = 8000;

type Options = {
  initial: CoupleSnapshot | null;
  enabled: boolean;
  /** Appelé une seule fois par nouveau match d'activité détecté. */
  onNewMatch: (idea: Idea) => void;
  /** Appelé une seule fois par nouveau match Nourriture / Films détecté. */
  onNewChoiceMatch: (match: ChoiceMatchSummary) => void;
  onSessionExpired: () => void;
};

/**
 * Garde l'espace à deux synchronisé sans WebSocket : un polling léger (8 s)
 * uniquement quand un duo existe, suspendu quand l'onglet est en arrière-plan.
 * Les matchs déjà connus ne sont jamais notifiés deux fois.
 */
export function useCoupleSync({
  initial,
  enabled,
  onNewMatch,
  onNewChoiceMatch,
  onSessionExpired,
}: Options) {
  const [couple, setCouple] = useState<CoupleSnapshot | null>(initial);
  const [error, setError] = useState<string | null>(null);

  const knownRef = useRef(
    new Set(initial?.matches.map((match) => match.idea.id) ?? []),
  );
  const knownChoiceRef = useRef(
    new Set(
      initial?.choiceMatches.map(
        (match) => `${match.category}:${match.choiceId}`,
      ) ?? [],
    ),
  );
  const keyRef = useRef<string | null>(initial?.code ?? null);
  const onNewMatchRef = useRef(onNewMatch);
  const onNewChoiceMatchRef = useRef(onNewChoiceMatch);
  const expiredRef = useRef(onSessionExpired);
  const inFlightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    onNewMatchRef.current = onNewMatch;
  }, [onNewMatch]);

  useEffect(() => {
    onNewChoiceMatchRef.current = onNewChoiceMatch;
  }, [onNewChoiceMatch]);

  useEffect(() => {
    expiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  const apply = useCallback((next: CoupleSnapshot | null, notify: boolean) => {
    const nextKey = next?.code ?? null;

    if (nextKey !== keyRef.current) {
      // Nouveau duo (ou sortie) : on repart d'une base propre.
      keyRef.current = nextKey;
      knownRef.current = new Set(next?.matches.map((match) => match.idea.id) ?? []);
      knownChoiceRef.current = new Set(
        next?.choiceMatches.map(
          (match) => `${match.category}:${match.choiceId}`,
        ) ?? [],
      );
    } else if (next && notify) {
      for (const match of next.matches) {
        if (!knownRef.current.has(match.idea.id)) {
          knownRef.current.add(match.idea.id);
          onNewMatchRef.current(match.idea);
        }
      }
      for (const match of next.choiceMatches) {
        const key = `${match.category}:${match.choiceId}`;
        if (!knownChoiceRef.current.has(key)) {
          knownChoiceRef.current.add(key);
          onNewChoiceMatchRef.current(match);
        }
      }
    } else if (next) {
      for (const match of next.matches) knownRef.current.add(match.idea.id);
      for (const match of next.choiceMatches) {
        knownChoiceRef.current.add(`${match.category}:${match.choiceId}`);
      }
    }

    setCouple(next);
  }, []);

  const refresh = useCallback(
    async ({ notify = true }: { notify?: boolean } = {}) => {
      inFlightRef.current?.abort();
      const controller = new AbortController();
      inFlightRef.current = controller;

      try {
        const result = await api.getCouple(controller.signal);
        apply(result.couple, notify);
        setError(null);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        if (caught instanceof ApiError && caught.status === 401) {
          expiredRef.current();
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : "Synchronisation du duo impossible.",
        );
      } finally {
        if (inFlightRef.current === controller) inFlightRef.current = null;
      }
    },
    [apply],
  );

  const update = useCallback(
    (next: CoupleSnapshot | null) => {
      apply(next, false);
    },
    [apply],
  );

  const markKnown = useCallback((ideaId: string) => {
    knownRef.current.add(ideaId);
  }, []);

  const markChoiceKnown = useCallback(
    (category: ChoiceMatchSummary["category"], choiceId: string) => {
      knownChoiceRef.current.add(`${category}:${choiceId}`);
    },
    [],
  );

  const markSeen = useCallback(async () => {
    try {
      const result = await api.markCoupleSeen();
      apply(result.couple, false);
    } catch {
      // Best effort : le badge se remettra à jour au prochain polling.
    }
  }, [apply]);

  const reset = useCallback(() => {
    keyRef.current = null;
    knownRef.current = new Set();
    knownChoiceRef.current = new Set();
    setCouple(null);
    setError(null);
  }, []);

  const hasCouple = couple !== null;

  useEffect(() => {
    if (!enabled || !hasCouple) return;

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    };

    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      inFlightRef.current?.abort();
    };
  }, [enabled, hasCouple, refresh]);

  return {
    couple,
    error,
    refresh,
    update,
    markKnown,
    markChoiceKnown,
    markSeen,
    reset,
  };
}
