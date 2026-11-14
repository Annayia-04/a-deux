"use client";

import { useCallback, useEffect, useState } from "react";
import { SparklesIcon } from "@/components/icons";
import { ApiError } from "@/lib/api-client";

const COOLDOWN_MS = 8000;

export function TapButton({
  onSend,
  onError,
  disabled = false,
}: {
  onSend: () => Promise<unknown>;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const cooling = remaining > 0;

  useEffect(() => {
    if (!cooling && !busy) return;
    const interval = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(interval);
  }, [cooling, busy]);

  const handleClick = useCallback(async () => {
    if (busy || cooling || disabled) return;
    setBusy(true);
    try {
      await onSend();
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setNow(Date.now());
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429) {
        const seconds = caught.retryAfterSeconds ?? 8;
        setCooldownUntil(Date.now() + seconds * 1000);
        setNow(Date.now());
      }
      onError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible d’envoyer cette pensée.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, cooling, disabled, onError, onSend]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled || busy || cooling}
      aria-label={
        cooling
          ? `Pensée disponible dans ${remaining} seconde${remaining > 1 ? "s" : ""}`
          : "Envoyer une pensée à votre partenaire"
      }
      title={
        cooling
          ? `Encore ${remaining} s`
          : "Envoyer une pensée (halo et son chez votre partenaire)"
      }
      className={`relative grid h-9 w-9 place-items-center rounded-full border text-[11px] font-semibold tabular-nums transition ${
        disabled
          ? "cursor-not-allowed border-white/10 bg-white/[0.02] text-cream/20"
          : cooling
            ? "border-white/10 bg-white/[0.03] text-cream/35"
            : "border-rose/30 bg-rose/[0.08] text-rose-soft hover:border-rose/50 hover:bg-rose/15 active:scale-95"
      }`}
    >
      {cooling ? (
        <span>{remaining}</span>
      ) : (
        <SparklesIcon className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
      )}
      {!cooling && !disabled ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-rose"
        />
      ) : null}
    </button>
  );
}
