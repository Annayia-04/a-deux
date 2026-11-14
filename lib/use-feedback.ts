"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isTapSoundEnabled,
  setTapSoundEnabled,
  TAP_SOUND_EVENT,
} from "@/lib/feedback";

/** Préférence locale du carillon de réception, synchronisée entre onglets. */
export function useTapSoundPreference() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(isTapSoundEnabled());
    sync();
    window.addEventListener(TAP_SOUND_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TAP_SOUND_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((next: boolean) => {
    setTapSoundEnabled(next);
    setEnabled(next);
  }, []);

  return [enabled, update] as const;
}
