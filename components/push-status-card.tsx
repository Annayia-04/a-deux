"use client";

import { useEffect, useState } from "react";
import { BellIcon, CheckIcon } from "@/components/icons";
import {
  enablePushNotifications,
  isPushSupported,
  pushPermission,
  type PushPermission,
} from "@/lib/push-notifications";

/**
 * Active les notifications FCM dans l'application native. La PWA n'est pas
 * concernée pour l'instant (Web Push viendra ensuite).
 */
export function PushStatusCard({ hasSession }: { hasSession: boolean }) {
  const [native, setNative] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    setNative(true);
    void pushPermission().then(setPermission);
  }, []);

  if (!native) return null;

  const granted = permission === "granted";
  const denied = permission === "denied";

  async function enable() {
    if (!hasSession || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await enablePushNotifications();
      setPermission(result);
      if (result === "denied") {
        setMessage(
          "Autorisez les notifications dans les réglages Android de l’application.",
        );
      } else if (result === "granted") {
        setMessage("Notifications activées sur cet appareil.");
      }
    } catch {
      setMessage("Impossible d’activer les notifications pour l’instant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Notifications"
      className="grimoire rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
            granted
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-gold/20 bg-ink-800/70 text-cream/55"
          }`}
        >
          {granted ? (
            <CheckIcon className="h-5 w-5" />
          ) : (
            <BellIcon className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-[17px] leading-tight text-cream">
              Notifications
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-medium ${
                granted
                  ? "bg-gold/10 text-gold ring-1 ring-inset ring-gold/30"
                  : "bg-ink-800/80 text-ash ring-1 ring-inset ring-gold/15"
              }`}
            >
              {granted ? "Activées" : denied ? "Bloquées" : "Désactivées"}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ash">
            {!hasSession
              ? "Créez votre sélection ou votre duo pour activer les notifications."
              : denied
                ? "Autorisez les notifications dans les réglages Android de l’application."
                : "Recevez les pensées de votre partenaire même quand l’application est fermée."}
          </p>

          {!granted ? (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={!hasSession || busy || denied}
              className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/[0.06] px-3 py-2 text-[11.5px] font-medium text-gold transition hover:border-gold/65 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <BellIcon className="h-3.5 w-3.5" />
              {busy ? "Activation…" : "Activer les notifications"}
            </button>
          ) : null}

          {message ? (
            <p
              role="status"
              className="mt-2 text-[10.5px] leading-relaxed text-gold/90"
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
