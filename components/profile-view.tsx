"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { AccountCard } from "@/components/account-card";
import { InstallCard } from "@/components/install-card";
import { PushStatusCard } from "@/components/push-status-card";
import { ThemePicker } from "@/components/theme-picker";
import { WidgetStatusCard } from "@/components/widget-status-card";
import {
  DownloadIcon,
  HeartIcon,
  LockIcon,
  UserIcon,
} from "@/components/icons";
import type { AuthProvider } from "@/lib/auth/provider";
import type { AccountSnapshot, CoupleSnapshot } from "@/lib/types";
import { APP_VERSION } from "@/lib/version";

type Props = {
  account: AccountSnapshot | null;
  authProviders: AuthProvider[];
  hasSession: boolean;
  couple: CoupleSnapshot | null;
  forgetting: boolean;
  onForget: () => Promise<void>;
};

export function ProfileView({
  account,
  authProviders,
  hasSession,
  couple,
  forgetting,
  onForget,
}: Props) {
  const [confirmForget, setConfirmForget] = useState(false);
  const [showApkLink, setShowApkLink] = useState(false);

  useEffect(() => {
    const android = /android/i.test(navigator.userAgent);
    const native = Capacitor.isNativePlatform();
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setShowApkLink(android && !native && !standalone);
  }, []);

  return (
    <div className="h-full overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
      <div className="mx-auto w-full max-w-md space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/80">
            Mon espace
          </p>
          <h1 className="mt-1.5 font-display text-[30px] leading-[1.05] text-cream">
            Profil
          </h1>
          <p className="mt-1 text-[11.5px] text-cream/55">
            {account
              ? "Votre compte suit vos envies d’un appareil à l’autre."
              : "Sans compte. Vos envies restent sur cet appareil."}
          </p>
        </div>

        <AccountCard account={account} providers={authProviders} />

        <section aria-label="Session" className="grimoire rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
              <UserIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[17px] leading-tight text-cream">
                {account ? "Compte connecté" : "Mode invité"}
              </h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-cream/55">
                {account
                  ? account.displayName ?? account.email ?? "Compte lié"
                  : "Session anonyme, conservée 30 jours par un cookie. Aucun compte, aucune donnée personnelle demandée."}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-ash">
                <span className="inline-flex items-center gap-1 rounded-full bg-ink-800/70 px-2 py-0.5 ring-1 ring-inset ring-gold/15">
                  <LockIcon className="h-3 w-3 text-gold/70" />
                  Cookie 30 jours
                </span>
                {couple ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-gold ring-1 ring-inset ring-gold/25">
                    Duo {couple.complete ? "connecté" : "en attente"}
                  </span>
                ) : null}
              </div>

              {hasSession ? (
                <div className="mt-3 border-t border-gold/10 pt-2">
                  {confirmForget ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] leading-snug text-rose-soft">
                        Efface la session et les envies de cet appareil.
                      </span>
                      <span className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmForget(false)}
                          className="rounded-lg px-2 py-1 text-[10.5px] text-cream/55 hover:text-cream"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          disabled={forgetting}
                          onClick={() => {
                            setConfirmForget(false);
                            void onForget();
                          }}
                          className="rounded-lg border border-rose/40 bg-rose/15 px-2.5 py-1 text-[10.5px] font-semibold text-rose-soft transition hover:bg-rose/25 disabled:opacity-50"
                        >
                          {forgetting ? "Effacement…" : "Effacer"}
                        </button>
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmForget(true)}
                      className="rounded-md py-1 text-[10.5px] text-ash transition hover:text-rose-soft"
                    >
                      Effacer ma session
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <ThemePicker />

        <section aria-label="Application" className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/75">
              Application
            </span>
            <span className="rule-ornament h-px flex-1" aria-hidden />
          </div>

          <InstallCard />

          {showApkLink ? (
            <a
              href="/telecharger"
              className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-ink-850/70 p-4 transition hover:border-gold/40 hover:bg-ink-800/70"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                <DownloadIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[17px] leading-tight text-cream">
                  Application Android
                </span>
                <span className="mt-0.5 block text-[11px] text-cream/55">
                  Widget cœur, pensées et notifications, hors Play Store.
                </span>
              </span>
            </a>
          ) : null}

          <WidgetStatusCard
            hasSession={hasSession}
            coupleComplete={couple?.complete === true}
          />
          <PushStatusCard hasSession={hasSession} />
        </section>

        <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-[10px] leading-relaxed text-ash">
          <HeartIcon className="h-3 w-3 text-rose/70" />
          Version {APP_VERSION} · vos envies restent les vôtres.
        </p>
      </div>
    </div>
  );
}
