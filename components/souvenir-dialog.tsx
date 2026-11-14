"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertIcon, SparklesIcon, XIcon } from "@/components/icons";
import type { SouvenirDraft } from "@/lib/api-client";
import type { SouvenirSnapshot } from "@/lib/types";

const EMOJIS = ["✨", "📸", "🍽️", "🎬", "🌙", "💞"];
const MAX_BODY = 500;

function toDateInput(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInput(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    12,
    0,
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export type SouvenirPrefill = {
  ideaId?: string;
  title?: string;
  emoji?: string;
};

type Props = {
  open: boolean;
  mode: "create" | "note";
  souvenir: SouvenirSnapshot | null;
  prefill: SouvenirPrefill | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: SouvenirDraft) => Promise<void>;
  onSaveNote: (id: string, body: string) => Promise<void>;
};

export function SouvenirDialog({
  open,
  mode,
  souvenir,
  prefill,
  busy,
  error,
  onClose,
  onCreate,
  onSaveNote,
}: Props) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [date, setDate] = useState(() => toDateInput(Date.now()));
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    setBody(mode === "note" ? (souvenir?.mine ?? "") : "");
    setTitle(prefill?.title ?? "");
    setEmoji(prefill?.emoji ?? "✨");
    setDate(toDateInput(Date.now()));
  }, [open, mode, prefill, souvenir]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, busy, onClose]);

  const trimmedBody = body.trim();
  const remaining = MAX_BODY - body.length;
  const usingIdea = Boolean(prefill?.ideaId);
  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (mode === "note") {
      return trimmedBody.length >= 1 && trimmedBody.length <= MAX_BODY;
    }
    if (!usingIdea && title.trim().length < 2) return false;
    return trimmedBody.length <= MAX_BODY;
  }, [busy, mode, trimmedBody, title, usingIdea]);

  if (!open) return null;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLocalError(null);

    if (mode === "note") {
      if (!souvenir) return;
      if (trimmedBody.length === 0) {
        setLocalError("Écrivez au moins quelques mots.");
        return;
      }
      await onSaveNote(souvenir.id, trimmedBody);
      return;
    }

    const happenedAt = fromDateInput(date);
    if (happenedAt === null) {
      setLocalError("Choisissez une date valide.");
      return;
    }

    await onCreate({
      ...(prefill?.ideaId
        ? { ideaId: prefill.ideaId }
        : { title: title.trim(), emoji }),
      happenedAt,
      ...(trimmedBody.length > 0 ? { body: trimmedBody } : {}),
    });
  }

  const shownError = localError ?? error;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "note" ? "Votre moment préféré" : "Nouveau souvenir"
        }
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-ink-900 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] sm:max-h-[85dvh] sm:rounded-[28px]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-soft/80">
              <SparklesIcon className="h-3 w-3" />
              Journal de souvenirs
            </p>
            <h2 className="mt-1 font-display text-[23px] leading-tight text-cream">
              {mode === "note" ? "Votre moment préféré" : "Un nouveau souvenir"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-cream/60 transition hover:border-white/20 hover:text-cream disabled:opacity-40"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {shownError ? (
            <p
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[11.5px] leading-relaxed text-rose-soft"
            >
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {shownError}
            </p>
          ) : null}

          {mode === "note" && souvenir ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose/25 to-gold/15 text-[20px] ring-1 ring-white/10"
              >
                {souvenir.emoji}
              </span>
              <div className="min-w-0">
                <p className="font-display text-[16px] text-cream">
                  {souvenir.title}
                </p>
                <p className="text-[10px] text-cream/35">
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(souvenir.happenedAt))}
                </p>
              </div>
            </div>
          ) : null}

          {mode === "create" ? (
            <>
              {usingIdea ? (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-rose/20 bg-rose/[0.06] p-3">
                  <span aria-hidden className="text-[26px]">
                    {prefill?.emoji ?? "✨"}
                  </span>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-soft/70">
                      Depuis votre match
                    </p>
                    <p className="font-display text-[16px] text-cream">
                      {prefill?.title}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <label
                    htmlFor="souvenir-title"
                    className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cream/50"
                  >
                    Le date
                  </label>
                  <input
                    id="souvenir-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={80}
                    autoFocus
                    placeholder="Ex. Dîner sur les quais"
                    className="mt-2 w-full rounded-xl border border-white/12 bg-ink-950/60 px-3 py-2.5 text-[13px] text-cream placeholder:text-cream/25 focus:border-rose/60 focus:outline-none"
                  />

                  <div className="mt-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cream/50">
                      Ambiance
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {EMOJIS.map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setEmoji(choice)}
                          aria-label={`Choisir l’emoji ${choice}`}
                          aria-pressed={emoji === choice}
                          className={`grid h-9 w-9 place-items-center rounded-xl border text-[17px] transition ${
                            emoji === choice
                              ? "border-rose/50 bg-rose/15"
                              : "border-white/10 bg-white/[0.03] hover:border-white/25"
                          }`}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <label
                htmlFor="souvenir-date"
                className="mt-4 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cream/50"
              >
                Quand ?
              </label>
              <input
                id="souvenir-date"
                type="date"
                value={date}
                max={toDateInput(Date.now())}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/12 bg-ink-950/60 px-3 py-2.5 text-[13px] text-cream [color-scheme:dark] focus:border-rose/60 focus:outline-none"
              />
            </>
          ) : null}

          <label
            htmlFor="souvenir-body"
            className="mt-4 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cream/50"
          >
            {mode === "note"
              ? "Ce que vous avez préféré"
              : "Votre moment préféré (facultatif)"}
          </label>
          <textarea
            id="souvenir-body"
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, MAX_BODY))}
            rows={4}
            autoFocus={mode === "note"}
            placeholder="Un détail, une phrase, une sensation…"
            className="mt-2 w-full resize-none rounded-xl border border-white/12 bg-ink-950/60 px-3 py-2.5 text-[13px] leading-relaxed text-cream placeholder:text-cream/25 focus:border-rose/60 focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-cream/30">
            <span>Texte brut · visible uniquement par vous deux</span>
            <span className={remaining < 40 ? "text-gold" : undefined}>
              {body.length} / {MAX_BODY}
            </span>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/[0.07] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl px-3.5 py-2 text-[12px] text-cream/55 transition hover:bg-white/5 hover:text-cream disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="rounded-xl bg-gradient-to-r from-rose to-[#ff8f6b] px-4 py-2.5 text-[12.5px] font-semibold text-ink-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? "Enregistrement…"
              : mode === "note"
                ? "Enregistrer mon moment"
                : "Créer le souvenir"}
          </button>
        </footer>
      </div>
    </div>
  );
}
