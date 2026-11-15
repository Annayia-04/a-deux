"use client";

import { useEffect, useState } from "react";
import { AlertIcon, CheckIcon, RefreshIcon, SparklesIcon } from "@/components/icons";
import { api } from "@/lib/api-client";
import {
  isNativeWidgetPlatform,
  pairWidgetDevice,
  WidgetBridge,
} from "@/lib/widget-bridge";

type State =
  | "checking"
  | "paired"
  | "unpaired"
  | "invalid"
  | "unknown"
  | "error";

const LABELS: Record<State, string> = {
  checking: "Vérification…",
  paired: "Associé",
  unpaired: "Non associé",
  invalid: "À réassocier",
  unknown: "Vérification impossible",
  error: "Association échouée",
};

const MESSAGES: Record<State, string> = {
  checking: "Nous vérifions l’association de cet appareil.",
  paired: "Touchez le widget pour envoyer une pensée, sans ouvrir l’app.",
  unpaired: "Associez cet appareil pour envoyer un ping sans ouvrir l’app.",
  invalid: "Le jeton a expiré. Réassociez le widget pour continuer.",
  unknown: "Le serveur n’a pas répondu. Vérifiez votre connexion.",
  error: "L’association n’a pas abouti. Réessayez dans un instant.",
};

/**
 * État du widget natif, affiché uniquement dans l'application Capacitor.
 * Permet de comprendre pourquoi un tap ouvre l'app au lieu d'envoyer un ping.
 */
export function WidgetStatusCard({
  hasSession,
  coupleComplete,
}: {
  hasSession: boolean;
  coupleComplete: boolean;
}) {
  const [native, setNative] = useState(false);
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isNativeWidgetPlatform()) return;
    setNative(true);

    let cancelled = false;
    void (async () => {
      try {
        const existing = await WidgetBridge.getPingToken();
        if (cancelled) return;
        if (!existing.token) {
          setState("unpaired");
          return;
        }
        const validity = await api.verifyWidgetToken(existing.token);
        if (cancelled) return;
        if (validity === "valid") setState("paired");
        else if (validity === "invalid") setState("invalid");
        else setState("unknown");
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!native) return null;

  const canPair = hasSession && coupleComplete && !busy;
  const isPaired = state === "paired";

  async function pair() {
    if (!canPair) return;
    setBusy(true);
    try {
      const outcome = await pairWidgetDevice();
      setState(outcome === "unknown" ? "unknown" : "paired");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Widget Petit ping"
      className="grimoire rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
            isPaired
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-gold/20 bg-ink-800/70 text-cream/55"
          }`}
        >
          {isPaired ? (
            <CheckIcon className="h-5 w-5" />
          ) : (
            <SparklesIcon className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-[17px] leading-tight text-cream">
              Widget « Petit ping »
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-medium ${
                isPaired
                  ? "bg-gold/10 text-gold ring-1 ring-inset ring-gold/30"
                  : "bg-ink-800/80 text-ash ring-1 ring-inset ring-gold/15"
              }`}
            >
              {LABELS[state]}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ash">
            {!hasSession
              ? "Créez d’abord votre sélection ou votre duo pour associer cet appareil."
              : !coupleComplete
                ? "Terminez votre duo (2/2) pour activer le widget et la tuile des réglages rapides."
                : MESSAGES[state]}
          </p>

          {state === "error" ? (
            <p className="mt-1 flex items-center gap-1 text-[10.5px] text-rose-soft">
              <AlertIcon className="h-3 w-3" />
              Vérifiez que le serveur est joignable.
            </p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void pair()}
              disabled={!canPair}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/[0.06] px-3 py-2 text-[11.5px] font-medium text-gold transition hover:border-gold/65 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshIcon className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              {busy
                ? "Association…"
                : isPaired
                  ? "Réassocier"
                  : "Associer le widget"}
            </button>
            <span className="text-[10px] text-ash">
              + tuile « Petit ping » dans les réglages rapides Android.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
