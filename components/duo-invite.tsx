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
      <div className="mt-4 rounded-2xl border border-mint/20 bg-mint/[0.05] p-3.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mint/15 text-mint ring-1 ring-mint/25">
              <UsersIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[12.5px] font-medium text-cream">
                Vous êtes dans un espace à deux
              </p>
              <p className="mt-0.5 text-[11px] text-cream/55">
                Code <span className="font-semibold tracking-[0.14em] text-cream/85">{couple.code}</span>
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
              className="inline-flex items-center gap-1 rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-[11px] text-cream/70 transition hover:border-white/25 hover:text-cream"
            >
              <CopyIcon className="h-3 w-3" />
              Copier
            </button>
            <button
              type="button"
              onClick={onManage}
              className="inline-flex items-center gap-1 rounded-lg bg-mint px-2.5 py-1.5 text-[11px] font-semibold text-ink-950 transition hover:brightness-105"
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
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose/12 text-rose-soft ring-1 ring-rose/20">
          <UsersIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-cream">
            Vous voulez le faire à deux ?
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-cream/50">
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
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose/35 bg-rose/12 px-3 py-2 text-[11.5px] font-semibold text-rose-soft transition hover:bg-rose/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UsersIcon className="h-3.5 w-3.5" />
          {busy ? "Création…" : "Créer notre duo"}
        </button>

        <button
          type="button"
          onClick={() => setJoinOpen((current) => !current)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-[11.5px] text-cream/55 transition hover:bg-white/5 hover:text-cream"
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
            className="min-w-0 flex-1 rounded-xl border border-white/12 bg-ink-950/60 px-3 py-2 font-display text-[17px] tracking-[0.18em] text-cream placeholder:text-cream/20 focus:border-rose/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || code.replace(/[\s-]/g, "").length < 4}
            className="shrink-0 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-[11.5px] font-medium text-cream/85 transition hover:border-white/30 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
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
