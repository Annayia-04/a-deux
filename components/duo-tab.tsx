"use client";

import { useState } from "react";
import {
  AlertIcon,
  ArrowRightIcon,
  BookIcon,
  CardsIcon,
  CheckIcon,
  CopyIcon,
  ShareIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/icons";
import { TapButton } from "@/components/tap-button";
import { formatBudget } from "@/lib/preferences";
import type { CoupleSnapshot, Idea } from "@/lib/types";

type Props = {
  couple: CoupleSnapshot | null;
  hasSession: boolean;
  busy: boolean;
  error: string | null;
  onSendTap: () => Promise<unknown>;
  onTapError: (message: string) => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
  onLeave: () => void;
  onShareInvite: () => void;
  onCopyCode: () => void;
  onShareMatch: (idea: Idea) => void;
  onOpenSouvenirs: () => void;
  onOpenChoices: () => void;
  onDiscover: () => void;
};

/**
 * Onglet À deux : création / saisie du code, puis matchs communs.
 * Les souvenirs et les choix (nourriture et films) restent accessibles via
 * deux raccourcis vers la fenêtre historique.
 */
export function DuoTab({
  couple,
  hasSession,
  busy,
  error,
  onSendTap,
  onTapError,
  onCreate,
  onJoin,
  onLeave,
  onShareInvite,
  onCopyCode,
  onShareMatch,
  onOpenSouvenirs,
  onOpenChoices,
  onDiscover,
}: Props) {
  const [code, setCode] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const joinCode = code.replace(/[\s-]/g, "");

  return (
    <div className="h-full overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
      <div className="mx-auto w-full max-w-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/80">
          Espace à deux
        </p>
        <h1 className="mt-1.5 font-display text-[30px] leading-[1.05] text-cream">
          {couple ? "Votre duo" : "À deux, c’est mieux"}
        </h1>

        {error ? (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[12px] text-rose-soft"
          >
            <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}

        {!couple ? (
          <div className="mt-4 space-y-3">
            <section className="grimoire rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-rose/15 text-gold">
                  <UsersIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-[18px] leading-tight text-cream">
                    Créer un espace duo
                  </h2>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-cream/55">
                    Un code à 6 caractères, un lien à partager, et vous swipez
                    chacun de votre côté. Les idées aimées par les deux
                    apparaissent ici.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCreate}
                disabled={busy}
                className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-4 py-2.5 text-[13px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <UsersIcon className="h-4 w-4" />
                {busy ? "Création…" : "Créer notre duo"}
              </button>
              {!hasSession ? (
                <p className="mt-2 text-center text-[10px] text-ash">
                  Une première sélection sera créée automatiquement.
                </p>
              ) : null}
            </section>

            <section className="grimoire rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                  <ArrowRightIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-[18px] leading-tight text-cream">
                    Rejoindre avec un code
                  </h2>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-cream/55">
                    Votre partenaire vous a envoyé un code ou un lien ? Saisissez
                    le code à 6 caractères.
                  </p>
                </div>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!busy && joinCode.length >= 4) onJoin(joinCode);
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="ABC123"
                  aria-label="Code d’invitation"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={8}
                  className="min-w-0 flex-1 rounded-xl border border-gold/25 bg-ink-950/70 px-3 py-2.5 text-center font-display text-[19px] tracking-[0.24em] text-cream placeholder:text-ash/60 focus:border-gold/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || joinCode.length < 4}
                  className="shrink-0 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-2.5 text-[12px] font-semibold text-gold transition hover:border-gold/55 hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "…" : "Rejoindre"}
                </button>
              </form>
            </section>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <section className="grimoire relative overflow-hidden rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                      couple.complete
                        ? "border-gold/35 bg-gold/10 text-gold"
                        : "border-rose/30 bg-rose/15 text-rose-soft"
                    }`}
                  >
                    {couple.complete ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      <UsersIcon className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <h2 className="font-display text-[18px] leading-tight text-cream">
                      {couple.complete ? "Duo connecté" : "En attente de votre partenaire"}
                    </h2>
                    <p className="mt-0.5 text-[11.5px] text-cream/55">
                      {couple.complete
                        ? "Vous êtes deux · les matchs arrivent en direct."
                        : "Partagez le lien : votre partenaire vous rejoint en un geste."}
                    </p>
                  </div>
                </div>
              </div>

              {couple.complete ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-gold/15 bg-ink-950/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-cream">
                      Envoyer une pensée
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-ash">
                      Halo et son chez votre partenaire, sans ouvrir l’app.
                    </p>
                  </div>
                  <TapButton
                    onSend={onSendTap}
                    onError={onTapError}
                    disabled={false}
                  />
                </div>
              ) : null}

              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-gold/15 bg-ink-950/50 px-3 py-2">
                <span className="text-[10.5px] uppercase tracking-[0.16em] text-ash">
                  Code
                </span>
                <span className="font-display text-[20px] tracking-[0.22em] text-gold">
                  {couple.code}
                </span>
                <button
                  type="button"
                  onClick={onCopyCode}
                  aria-label={`Copier le code ${couple.code}`}
                  className="grid h-11 w-11 place-items-center rounded-lg border border-gold/20 bg-gold/[0.05] text-gold transition hover:border-gold/45"
                >
                  <CopyIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onShareInvite}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/[0.08] px-3 py-2 text-[11.5px] font-semibold text-gold transition hover:border-gold/60 hover:bg-gold/15"
                >
                  <ShareIcon className="h-3.5 w-3.5" />
                  {couple.complete ? "Partager le duo" : "Inviter mon/ma partenaire"}
                </button>
                <button
                  type="button"
                  onClick={onDiscover}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-gold/20 bg-ink-800/60 px-3 py-2 text-[11.5px] text-cream/65 transition hover:border-gold/40 hover:text-cream"
                >
                  Swiper
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-gold/10 pt-2">
                {confirmLeave ? (
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-[10.5px] text-rose-soft">
                      Quitter supprime les matchs partagés.
                    </span>
                    <span className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmLeave(false)}
                        className="rounded-lg px-2 py-1 text-[10.5px] text-cream/55 hover:text-cream"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={onLeave}
                        disabled={busy}
                        className="rounded-lg border border-rose/40 bg-rose/15 px-2.5 py-1 text-[10.5px] font-semibold text-rose-soft transition hover:bg-rose/25 disabled:opacity-50"
                      >
                        Quitter
                      </button>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(true)}
                    className="rounded-md px-1 py-1 text-[10.5px] text-ash transition hover:text-rose-soft"
                  >
                    Quitter l’espace
                  </button>
                )}
              </div>
            </section>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenSouvenirs}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold/20 bg-ink-800/50 px-3 py-2 text-[11px] text-cream/70 transition hover:border-gold/40 hover:text-cream"
              >
                <BookIcon className="h-4 w-4 text-gold/80" />
                Nos souvenirs
              </button>
              <button
                type="button"
                onClick={onOpenChoices}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-mint/20 bg-mint/[0.05] px-3 py-2 text-[11px] text-mint transition hover:border-mint/40 hover:bg-mint/10"
              >
                <CardsIcon className="h-4 w-4" />
                Nourriture & Films
              </button>
            </div>

            <section className="pt-1">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-[22px] leading-tight text-cream">
                  Nos matchs
                </h2>
                <span className="text-[11px] tabular-nums text-ash">
                  {couple.matches.length}
                </span>
              </div>

              {couple.matches.length === 0 ? (
                <div className="mt-2 rounded-2xl border border-gold/15 bg-ink-850/60 px-4 py-6 text-center">
                  <SparklesIcon className="mx-auto h-5 w-5 text-gold/70" />
                  <p className="mt-2 text-[12px] leading-relaxed text-cream/60">
                    {couple.complete
                      ? "Aucun match pour l’instant. Swipez quelques cartes : un match apparaît dès que vous aimez la même idée."
                      : "Votre partenaire n’a pas encore rejoint. Le premier match arrivera après vos swipes."}
                  </p>
                </div>
              ) : (
                <ul className="mt-2 space-y-2">
                  {couple.matches.map((match) => (
                    <li
                      key={match.idea.id}
                      className={`grimoire flex items-center gap-3 rounded-2xl p-3 ${
                        match.seen ? "" : "ring-1 ring-inset ring-rose/30"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-800/80 text-[22px] ring-1 ring-gold/20"
                      >
                        {match.idea.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-display text-[16px] leading-tight text-cream">
                          <span className="truncate">{match.idea.title}</span>
                          {!match.seen ? (
                            <span
                              aria-label="Nouveau match"
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose"
                            />
                          ) : null}
                        </p>
                        <p className="mt-0.5 truncate text-[10.5px] text-ash">
                          {match.idea.duration} ·{" "}
                          {match.idea.budget === 0
                            ? "Gratuit"
                            : formatBudget(match.idea.budget)}{" "}
                          · {match.idea.tagline}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onShareMatch(match.idea)}
                        aria-label={`Partager le date ${match.idea.title}`}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/[0.06] text-gold transition hover:border-gold/50 hover:bg-gold/15"
                      >
                        <ShareIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {!couple ? (
          <button
            type="button"
            onClick={onDiscover}
            className="mt-4 inline-flex items-center gap-1 text-[11px] text-cream/45 transition hover:text-cream/75"
          >
            Continuer à swiper seul
            <ArrowRightIcon className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
