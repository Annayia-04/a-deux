"use client";

import { useCallback, useEffect, useRef } from "react";
import { ApiError, api } from "@/lib/api-client";
import type { TapSnapshot } from "@/lib/types";

const TAP_POLL_MS = 3000;

export function useTaps({
  enabled,
  coupleCode,
  onTap,
  onSessionExpired,
}: {
  enabled: boolean;
  coupleCode: string | null;
  onTap: (tap: TapSnapshot) => void;
  onSessionExpired: () => void;
}) {
  const onTapRef = useRef(onTap);
  const expiredRef = useRef(onSessionExpired);
  const knownRef = useRef(new Set<number>());
  const inFlightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  useEffect(() => {
    expiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  useEffect(() => {
    knownRef.current = new Set();
  }, [coupleCode]);

  const refresh = useCallback(async () => {
    if (!coupleCode) return;
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    try {
      const result = await api.getTaps(controller.signal);
      if (!result.tap || knownRef.current.has(result.tap.id)) return;

      knownRef.current.add(result.tap.id);
      onTapRef.current(result.tap);
      // Le curseur serveur n'avance qu'après l'affichage effectif.
      void api.markTapSeen(result.tap.id).catch(() => undefined);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      if (caught instanceof ApiError && caught.status === 401) {
        expiredRef.current();
      }
    } finally {
      if (inFlightRef.current === controller) inFlightRef.current = null;
    }
  }, [coupleCode]);

  useEffect(() => {
    if (!enabled || !coupleCode) return;

    void refresh();

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    };
    const interval = window.setInterval(tick, TAP_POLL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      inFlightRef.current?.abort();
    };
  }, [enabled, coupleCode, refresh]);

  const send = useCallback(async (): Promise<TapSnapshot> => {
    const result = await api.sendTap();
    return result.tap;
  }, []);

  return { send };
}
