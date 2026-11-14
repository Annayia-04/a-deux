"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DownloadIcon, ShareIcon, XIcon } from "@/components/icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "a-deux:install-dismissed";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isIos(): boolean {
  const userAgent = window.navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1)
  );
}

function wasDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_MS;
  } catch {
    return false;
  }
}

/**
 * Invitation à installer la PWA. Sur Android/desktop, utilise l'événement
 * `beforeinstallprompt` ; sur iOS, affiche la marche à suivre Safari.
 * Le refus est mémorisé 14 jours pour ne pas harceler.
 */
export function InstallCard() {
  const [mode, setMode] = useState<"hidden" | "native" | "ios">("hidden");
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setMode("native");
    };
    const onInstalled = () => {
      setMode("hidden");
      setSheetOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS ne déclenche jamais `beforeinstallprompt` : on affiche les étapes.
    const iosTimer = window.setTimeout(() => {
      if (isIos() && !isStandalone()) setMode("ios");
    }, 900);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Stockage indisponible : la carte reviendra simplement au prochain chargement.
    }
    setMode("hidden");
    setSheetOpen(false);
  }, []);

  const install = useCallback(async () => {
    if (mode === "ios" || !promptEvent) {
      setSheetOpen(true);
      return;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setMode("hidden");
    } catch {
      setSheetOpen(true);
    }
    setPromptEvent(null);
  }, [mode, promptEvent]);

  return (
    <>
      <AnimatePresence>
        {mode !== "hidden" ? (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.08] via-transparent to-rose/[0.06] p-4"
            aria-label="Installer l’application"
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Masquer l’invitation à installer"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-cream/35 transition hover:bg-white/5 hover:text-cream/70"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                <DownloadIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-[17px] leading-tight text-cream">
                  Emportez À deux partout
                </h3>
                <p className="mt-1 text-[11.5px] leading-relaxed text-cream/55">
                  Installez l’app sur votre écran d’accueil : plein écran, accès
                  direct et une page de secours hors ligne.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void install()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1.5 text-[11.5px] font-semibold text-gold transition hover:bg-gold/25"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Installer
                  </button>
                  {mode === "ios" ? (
                    <button
                      type="button"
                      onClick={() => setSheetOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] text-cream/60 transition hover:text-cream"
                    >
                      <ShareIcon className="h-3.5 w-3.5" />
                      Comment faire
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {sheetOpen ? (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setSheetOpen(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Installer l’application sur iPhone ou iPad"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-md rounded-t-[26px] border border-white/10 bg-ink-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[26px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/80">
                    Installation
                  </p>
                  <h3 className="mt-1 font-display text-[22px] text-cream">
                    Sur iPhone ou iPad
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Fermer les instructions d’installation"
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-cream/60 transition hover:text-cream"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              <ol className="mt-4 space-y-3 text-[12.5px] leading-relaxed text-cream/70">
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/10 text-[11px] font-semibold text-gold">
                    1
                  </span>
                  Ouvrez cette page dans <strong className="text-cream">Safari</strong>.
                </li>
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/10 text-[11px] font-semibold text-gold">
                    2
                  </span>
                  Touchez le bouton <ShareIcon className="inline h-3.5 w-3.5" />{" "}
                  <strong className="text-cream">Partager</strong>, puis « Sur
                  l’écran d’accueil ».
                </li>
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/10 text-[11px] font-semibold text-gold">
                    3
                  </span>
                  Validez avec <strong className="text-cream">Ajouter</strong> :
                  l’icône À deux apparaît sur votre écran d’accueil.
                </li>
              </ol>

              <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-cream/45">
                L’installation nécessite une connexion HTTPS. En local, elle
                fonctionne sur l’ordinateur via localhost ; sur le réseau, il
                faut un hébergement sécurisé.
              </p>

              <button
                type="button"
                onClick={dismiss}
                className="mt-4 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-medium text-cream/60 transition hover:text-cream"
              >
                Ne plus afficher pendant 14 jours
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
