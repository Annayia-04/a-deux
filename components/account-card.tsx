"use client";

import { useCallback, useEffect, useState } from "react";
import { GoogleIcon, UserIcon } from "@/components/icons";
import type { AuthProvider } from "@/lib/auth/provider";
import type { AccountSnapshot } from "@/lib/types";

type Notice = "ok" | "refus" | "etat" | "erreur" | null;

const NOTICES: Record<Exclude<Notice, null>, string> = {
  ok: "Connexion réussie. Cet appareil est maintenant lié à votre compte.",
  refus: "Connexion annulée. Vous restez en mode anonyme.",
  etat: "La connexion a expiré. Réessayez.",
  erreur: "La connexion a échoué. Réessayez dans un instant.",
};

/**
 * Carte de compte affichée sur l'écran de préférences.
 * - Anonyme : propose uniquement les fournisseurs réellement configurés.
 * - Connecté : affiche l'identité et permet de se déconnecter.
 * Aucun jeton n'est manipulé côté client : tout passe par des cookies
 * HttpOnly posés par le serveur.
 */
export function AccountCard({
  account,
  providers,
}: {
  account: AccountSnapshot | null;
  providers: AuthProvider[];
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("compte");
    if (value === "ok" || value === "refus" || value === "etat" || value === "erreur") {
      setNotice(value);
      params.delete("compte");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/account", { method: "DELETE" });
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }, []);

  if (!account && providers.length === 0) return null;

  return (
    <section
      aria-label="Compte"
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose/25 bg-rose/10 text-rose-soft">
          <UserIcon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          {account ? (
            <>
              <h3 className="font-display text-[17px] leading-tight text-cream">
                {account.displayName ?? "Compte connecté"}
              </h3>
              <p className="mt-1 truncate text-[11.5px] text-cream/45">
                {account.email ?? "Identité Google liée à cet espace"}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-cream/40">
                Vos swipes, votre duo et vos souvenirs suivent votre compte sur
                vos autres appareils.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void signOut()}
                className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-cream/60 transition hover:text-cream disabled:opacity-50"
              >
                {busy ? "Déconnexion…" : "Se déconnecter"}
              </button>
            </>
          ) : (
            <>
              <h3 className="font-display text-[17px] leading-tight text-cream">
                Retrouvez votre duo partout
              </h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-cream/55">
                Connectez-vous pour conserver vos swipes, vos matchs et vos
                souvenirs sur tous vos appareils. Le mode anonyme reste
                disponible.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {providers.includes("google") ? (
                  <a
                    href="/api/auth/google"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white px-3.5 py-1.5 text-[11.5px] font-semibold text-ink-950 transition hover:bg-cream"
                  >
                    <GoogleIcon className="h-3.5 w-3.5" />
                    Continuer avec Google
                  </a>
                ) : null}
                {providers.includes("apple") ? (
                  <a
                    href="/api/auth/apple"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11.5px] font-semibold text-cream transition hover:bg-white/[0.12]"
                  >
                    Continuer avec Apple
                  </a>
                ) : null}
              </div>
            </>
          )}

          {notice ? (
            <p
              role="status"
              className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-cream/55"
            >
              {NOTICES[notice]}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
