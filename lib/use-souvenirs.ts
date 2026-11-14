"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, type SouvenirDraft } from "@/lib/api-client";
import type { SouvenirSnapshot } from "@/lib/types";

function sortSouvenirs(items: SouvenirSnapshot[]): SouvenirSnapshot[] {
  return [...items].sort(
    (a, b) => b.happenedAt - a.happenedAt || b.createdAt - a.createdAt,
  );
}

export function useSouvenirs({
  enabled,
  coupleCode,
}: {
  enabled: boolean;
  coupleCode: string | null;
}) {
  const [souvenirs, setSouvenirs] = useState<SouvenirSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (options: { silent?: boolean } = {}) => {
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;
    if (!options.silent) setLoading(true);

    try {
      const result = await api.getSouvenirs(controller.signal);
      setSouvenirs(sortSouvenirs(result.souvenirs));
      setError(null);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible de charger les souvenirs.",
      );
    } finally {
      if (inFlightRef.current === controller) {
        inFlightRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !coupleCode) {
      setSouvenirs([]);
      setError(null);
      return;
    }
    void refresh();

    // Le partenaire peut écrire son moment pendant que la timeline est ouverte.
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      void refresh({ silent: true });
    };
    const interval = window.setInterval(tick, 10_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh({ silent: true });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      inFlightRef.current?.abort();
    };
  }, [enabled, coupleCode, refresh]);

  const create = useCallback(async (input: SouvenirDraft) => {
    const result = await api.createSouvenir(input);
    setSouvenirs((current) => sortSouvenirs([result.souvenir, ...current]));
    return result.souvenir;
  }, []);

  const saveNote = useCallback(async (id: string, body: string) => {
    const result = await api.saveSouvenirNote(id, body);
    setSouvenirs((current) =>
      sortSouvenirs(
        current.map((souvenir) =>
          souvenir.id === result.souvenir.id ? result.souvenir : souvenir,
        ),
      ),
    );
    return result.souvenir;
  }, []);

  return { souvenirs, loading, error, refresh, create, saveNote };
}
