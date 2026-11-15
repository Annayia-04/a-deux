"use client";

import { useEffect, useRef } from "react";
import {
  isNativeWidgetPlatform,
  pairWidgetDevice,
} from "@/lib/widget-bridge";

/**
 * Associe le téléphone au widget natif dès que le duo est complet.
 *
 * Le widget est un confort : un échec d'association ne doit jamais gêner
 * l'application. On retentera au prochain lancement.
 */
export function useWidgetPairing({
  enabled,
  onPaired,
}: {
  enabled: boolean;
  onPaired?: () => void;
}): void {
  const handled = useRef(false);
  const pairedCallback = useRef(onPaired);
  pairedCallback.current = onPaired;

  useEffect(() => {
    if (!enabled || handled.current) return;
    if (!isNativeWidgetPlatform()) return;

    handled.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const outcome = await pairWidgetDevice();
        if (!cancelled && outcome === "paired") {
          pairedCallback.current?.();
        }
      } catch {
        handled.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
