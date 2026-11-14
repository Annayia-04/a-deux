"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api-client";
import type { Idea, SwipeDirection } from "@/lib/types";

type PendingSwipe = { ideaId: string; direction: SwipeDirection };

/**
 * File d'attente des swipes :
 * - les requêtes partent dans l'ordre exact des gestes (l'annulation reste juste) ;
 * - une coupure réseau conserve les gestes et propose de réessayer ;
 * - une session expirée est signalée une seule fois ;
 * - `reset()` invalide les requêtes en vol lors d'un changement de session.
 */
export function useSwipeSync({
  onSessionExpired,
  onMatch,
}: {
  onSessionExpired: () => void;
  /** Appelé quand le swipe courant crée un match avec le partenaire. */
  onMatch?: (idea: Idea) => void;
}) {
  const queueRef = useRef<PendingSwipe[]>([]);
  const runningRef = useRef(false);
  const offlineRef = useRef(false);
  const epochRef = useRef(0);
  const expiredRef = useRef(onSessionExpired);
  const matchRef = useRef(onMatch);

  const [pending, setPending] = useState(0);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    expiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  useEffect(() => {
    matchRef.current = onMatch;
  }, [onMatch]);

  const pump = useCallback(async (): Promise<void> => {
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const next = queueRef.current[0];
        if (!next) break;
        const epoch = epochRef.current;

        try {
          const result = await api.swipe(next.ideaId, next.direction);

          // Session remplacée pendant la requête : on ignore ce résultat.
          if (epoch !== epochRef.current) continue;

          if (result.match) matchRef.current?.(result.match);

          queueRef.current.shift();
          setPending(queueRef.current.length);
          offlineRef.current = false;
          setOffline(false);
          setError(null);
        } catch (caught) {
          if (epoch !== epochRef.current) continue;

          if (caught instanceof ApiError && caught.status === 401) {
            queueRef.current = [];
            setPending(0);
            expiredRef.current();
            return;
          }

          offlineRef.current = true;
          setOffline(true);
          setError(
            caught instanceof Error
              ? caught.message
              : "Synchronisation impossible.",
          );
          return;
        }
      }
    } finally {
      runningRef.current = false;
      // Des gestes ont pu être ajoutés pendant la dernière requête.
      if (queueRef.current.length > 0 && !offlineRef.current) {
        void pump();
      }
    }
  }, []);

  const enqueue = useCallback(
    (ideaId: string, direction: SwipeDirection) => {
      queueRef.current.push({ ideaId, direction });
      setPending(queueRef.current.length);
      void pump();
    },
    [pump],
  );

  const retry = useCallback(() => {
    if (queueRef.current.length === 0) return;
    offlineRef.current = false;
    setOffline(false);
    setError(null);
    void pump();
  }, [pump]);

  const reset = useCallback(() => {
    epochRef.current += 1;
    queueRef.current = [];
    offlineRef.current = false;
    setPending(0);
    setOffline(false);
    setError(null);
  }, []);

  // Reprise automatique dès que le réseau revient.
  useEffect(() => {
    const handleOnline = () => {
      if (queueRef.current.length > 0) retry();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [retry]);

  return { enqueue, retry, reset, pending, offline, error };
}
