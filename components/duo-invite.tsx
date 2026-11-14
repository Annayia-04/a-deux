"use client";

import { useState } from "react";
import {
  AlertIcon,
  ArrowRightIcon,
  CopyIcon,
  UsersIcon,
} from "@/components/icons";
import type { CoupleSnapshot } from "@/lib/types";

type Props = {
  couple: CoupleSnapshot | null;
  busy: boolean;
  error: string | null;
  onCreate: () => void | Promise<void>;
  onJoin: (code: string) => void | Promise<void>;
  onManage: () => void;
  onCopyCode: () => void;
};

export function DuoInvite({
  couple,
  busy,
  error,
  onCreate,
  onJoin,
  onManage,
  onCopyCode,
}: Props) {
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");

  if (couple) {
    return (
      <div className="grimoire mt-4 rounded-2xl p-3.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/30">
              <UsersIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[12.5px] font-medium text-cream">
                Vous êtes dans un espace à deux
              </p>
              <p className="mt-0.5 text-[11px] text-cream/55">
                Code <span className="font-semibold tracking-[0.16em] text-gold">{couple.code}</span>
                {" · "}
                {couple.complete
                  ? "vous êtes deux"
                  : "en attente de votre partenaire"}
                {couple.matches.length > 0
                  ? ` · ${couple.matches.length} match${couple.matches.length > 1 ? "s" : ""}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onCopyCode}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gold/25 bg-gold/[0.05] px-2.5 py-1.5 text-[11px] text-gold transition hover:border-gold/50 hover:text-cream"
            >
              <CopyIcon className="h-3 w-3" />
              Copier
            </button>
            <button
              type="button"
              onClick={onManage}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-gold px-2.5 py-1.5 text-[11px] font-semibold text-[#17110a] transition hover:brightness-110"
            >
              Gérer
              <ArrowRightIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
        {error ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-rose-soft" role="alert">
            <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-gold/15 bg-ink-850/60 p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose/15 text-rose-soft ring-1 ring-rose/30">
          <UsersIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-cream">
            Vous voulez le faire à deux ?
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-cream/55">
            Créez un espace, envoyez le code à votre partenaire, et swipez
            chacun de votre côté. Vous serez prévenus dès que vous aimez la
            même idée.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onCreate()}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gold/40 bg-gradient-to-r from-ember to-rose px-3 py-2 text-[11.5px] font-semibold text-cream transition hover:border-gold/65 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UsersIcon className="h-3.5 w-3.5" />
          {busy ? "Création…" : "Créer notre duo"}
        </button>

        <button
          type="button"
          onClick={() => setJoinOpen((current) => !current)}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 py-2 text-[11.5px] text-cream/55 transition hover:bg-gold/5 hover:text-cream"
          aria-expanded={joinOpen}
        >
          J’ai déjà un code
          <ArrowRightIcon
            className={`h-3 w-3 transition ${joinOpen ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {joinOpen ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && code.replace(/[\s-]/g, "").length >= 4) {
              void onJoin(code);
            }
          }}
          className="mt-2.5 flex gap-2"
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
            className="min-w-0 flex-1 rounded-xl border border-gold/25 bg-ink-950/70 px-3 py-2 font-display text-[17px] tracking-[0.2em] text-cream placeholder:text-ash focus:border-gold/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || code.replace(/[\s-]/g, "").length < 4}
            className="shrink-0 rounded-xl border border-gold/30 bg-gold/[0.08] px-3.5 py-2 text-[11.5px] font-medium text-gold transition hover:border-gold/55 hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "…" : "Rejoindre"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-rose-soft" role="alert">
          <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
