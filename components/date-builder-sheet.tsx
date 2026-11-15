"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  ShareIcon,
  SparklesIcon,
  XIcon,
} from "@/components/icons";
import {
  buildIcs,
  buildTicketText,
  formatBuilderDate,
  nextSaturday,
  type BuilderItem,
  type BuilderSlot,
} from "@/lib/date-builder";
import type { Choice, Idea } from "@/lib/types";

export type { BuilderSlot } from "@/lib/date-builder";

export type BuilderOptions = {
  activity: Idea[];
  food: Choice[];
  movie: Choice[];
};

export type BuilderPrefill = { slot: BuilderSlot; id: string } | null;

type Selection = Partial<Record<BuilderSlot, string>>;

const SLOTS: {
  slot: BuilderSlot;
  label: string;
  emoji: string;
  choose: string;
}[] = [
  { slot: "activity", label: "Activité", emoji: "✨", choose: "Choisir une activité" },
  { slot: "food", label: "Food", emoji: "🍕", choose: "Choisir un plat" },
  { slot: "movie", label: "Film", emoji: "🎬", choose: "Choisir un film" },
];

export function DateBuilderSheet({
  open,
  duo,
  options,
  prefill,
  onClose,
  onToast,
}: {
  open: boolean;
  duo: boolean;
  options: BuilderOptions;
  prefill: BuilderPrefill;
  onClose: () => void;
  onToast: (message: string, tone?: "info" | "success" | "error") => void;
}) {
  const [selection, setSelection] = useState<Selection>({});
  const [picking, setPicking] = useState<BuilderSlot | null>(null);
  const [date, setDate] = useState<Date>(() => nextSaturday());

  useEffect(() => {
    if (!open) return;
    setDate(nextSaturday());
    setPicking(null);
    setSelection(prefill ? { [prefill.slot]: prefill.id } : {});
  }, [open, prefill]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const bySlot = useMemo(
    () => ({
      activity: options.activity,
      food: options.food,
      movie: options.movie,
    }),
    [options],
  );

  const items = useMemo(
    () =>
      SLOTS.map(({ slot }) => {
        const id = selection[slot];
        const item = id
          ? bySlot[slot].find((entry) => entry.id === id)
          : undefined;
        return { ...SLOTS.find((entry) => entry.slot === slot)!, item };
      }),
    [bySlot, selection],
  );

  const chosen = items.filter((entry) => entry.item);
  const canBuild = chosen.length > 0;
  const hasOptions = SLOTS.some(({ slot }) => bySlot[slot].length > 0);

  const chosenItems: BuilderItem[] = chosen.map(({ slot, label, emoji, item }) => ({
    slot,
    label,
    emoji,
    title: item!.title,
  }));
  const ticketText = buildTicketText(date, chosenItems);

  function surprise() {
    const next: Selection = {};
    let picked = 0;
    for (const { slot } of SLOTS) {
      const list = bySlot[slot];
      if (list.length === 0) continue;
      next[slot] = list[Math.floor(Math.random() * list.length)]!.id;
      picked += 1;
    }
    if (picked === 0) {
      onToast(
        duo
          ? "Aucun match commun pour composer une soirée."
          : "Aucune envie gardée pour composer une soirée.",
        "info",
      );
      return;
    }
    setSelection(next);
    onToast("Une soirée surprise est prête.", "success");
  }

  async function shareTicket() {
    if (!canBuild) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Notre soirée À deux",
          text: ticketText,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(ticketText);
      onToast("Ticket copié. Collez-le dans votre messagerie.", "success");
    } catch {
      onToast("Partage indisponible sur cet appareil.", "error");
    }
  }

  function addToAgenda() {
    if (!canBuild) return;
    const blob = new Blob([buildIcs(date, chosenItems)], {
      type: "text/calendar;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "notre-soiree-a-deux.ics";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    onToast("Événement prêt à être ajouté à votre agenda.", "success");
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[67] flex items-end justify-center bg-ink-950/80 backdrop-blur-sm sm:items-center sm:p-4"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="builder-title"
            initial={{ y: "100%", opacity: 0.7 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] border border-gold/25 bg-ink-900 shadow-2xl sm:rounded-[26px]"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-4">
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-gold/80">
                  Date Builder
                </p>
                <h2
                  id="builder-title"
                  className="mt-1 font-display text-[26px] leading-tight text-cream"
                >
                  Composez votre soirée
                </h2>
                <p className="mt-0.5 text-[11px] text-cream/50">
                  Un seul univers, deux, ou les trois.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le compositeur"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/20 bg-ink-800/70 text-cream/60 transition hover:border-gold/40 hover:text-cream"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {picking ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2">
                <button
                  type="button"
                  onClick={() => setPicking(null)}
                  className="inline-flex min-h-11 items-center gap-1.5 text-[11.5px] text-cream/60 transition hover:text-cream"
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5" />
                  Retour
                </button>
                <h3 className="mt-2 font-display text-[21px] text-cream">
                  {SLOTS.find((entry) => entry.slot === picking)?.choose}
                </h3>

                <ul className="mt-3 space-y-2">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setSelection((current) => {
                          const next = { ...current };
                          delete next[picking];
                          return next;
                        });
                        setPicking(null);
                      }}
                      className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-dashed border-gold/20 px-3 py-2 text-left text-[12px] text-cream/45 transition hover:border-gold/40 hover:text-cream/75"
                    >
                      Laisser cette étape vide
                    </button>
                  </li>
                  {bySlot[picking].map((item) => {
                    const active = selection[picking] === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelection((current) => ({
                              ...current,
                              [picking]: item.id,
                            }));
                            setPicking(null);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                            active
                              ? "border-gold/55 bg-gold/10"
                              : "border-gold/15 bg-ink-850/60 hover:border-gold/35"
                          }`}
                        >
                          <span
                            aria-hidden
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-800/80 text-[20px] ring-1 ring-gold/15"
                          >
                            {item.emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-display text-[16px] leading-tight text-cream">
                              {item.title}
                            </span>
                            <span className="mt-0.5 block truncate text-[10.5px] text-ash">
                              {item.tagline}
                            </span>
                          </span>
                          {active ? (
                            <CheckIcon className="h-4 w-4 shrink-0 text-gold" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {bySlot[picking].length === 0 ? (
                  <p className="mt-4 text-center text-[12px] leading-relaxed text-cream/45">
                    {duo
                      ? "Aucun match commun dans cet univers pour l’instant."
                      : "Aucune envie gardée dans cet univers pour l’instant."}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2">
                  <div className="space-y-2">
                    {items.map(({ slot, label, emoji, item }) => {
                      const available = bySlot[slot].length > 0;
                      return (
                        <div
                          key={slot}
                          className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
                            item
                              ? "border-gold/35 bg-gold/[0.06]"
                              : "border-gold/15 bg-ink-850/60"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => available && setPicking(slot)}
                            disabled={!available}
                            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 text-left transition disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <span
                              aria-hidden
                              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-800/80 text-[20px] ring-1 ring-gold/15"
                            >
                              {item?.emoji ?? emoji}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[9px] uppercase tracking-[0.16em] text-gold/70">
                                {label}
                              </span>
                              <span className="block truncate font-display text-[15.5px] leading-tight text-cream">
                                {item?.title ??
                                  (available
                                    ? SLOTS.find((entry) => entry.slot === slot)
                                        ?.choose
                                    : duo
                                      ? "Aucun match dans cet univers"
                                      : "Aucune envie dans cet univers")}
                              </span>
                            </span>
                          </button>
                          {item ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelection((current) => {
                                  const next = { ...current };
                                  delete next[slot];
                                  return next;
                                })
                              }
                              aria-label={`Retirer ${item.title} de la soirée`}
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ash transition hover:bg-rose/15 hover:text-rose-soft"
                            >
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={surprise}
                    disabled={!hasOptions}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/25 bg-gold/[0.05] px-4 py-2 text-[12px] font-medium text-gold transition hover:border-gold/50 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    Surprends-nous
                  </button>

                  {canBuild ? (
                    <div className="relative mt-4 overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-br from-ink-800 via-ink-850 to-ink-900 p-4">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -left-2 top-1/2 h-4 w-4 rounded-full bg-ink-900 ring-1 ring-gold/20"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-2 top-1/2 h-4 w-4 rounded-full bg-ink-900 ring-1 ring-gold/20"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[8.5px] font-semibold uppercase tracking-[0.24em] text-gold/80">
                          Ticket de date
                        </p>
                        <p className="text-[9px] text-cream/40">
                          {duo ? "À deux" : "En solo"}
                        </p>
                      </div>
                      <p className="mt-1 font-display text-[23px] leading-tight text-cream">
                        Notre soirée
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1.5 text-[10.5px] text-gold/90">
                        <ClockIcon className="h-3 w-3" />
                        {formatBuilderDate(date)}
                      </p>
                      <div className="my-3 border-t border-dashed border-gold/25" />
                      <ul className="space-y-1.5">
                        {chosen.map(({ slot, emoji, item }) => (
                          <li
                            key={slot}
                            className="flex items-center gap-2 text-[12px] text-cream/80"
                          >
                            <span aria-hidden>{emoji}</span>
                            <span className="truncate">{item!.title}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-[8.5px] uppercase tracking-[0.2em] text-cream/30">
                        À deux · complicité
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-center text-[11px] leading-relaxed text-cream/40">
                      Choisissez au moins une étape pour créer votre ticket.
                    </p>
                  )}
                </div>

                <div className="shrink-0 border-t border-gold/15 bg-ink-900/95 px-5 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void shareTicket()}
                      disabled={!canBuild}
                      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-3 py-3 text-[12.5px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ShareIcon className="h-4 w-4" />
                      {duo ? "Envoyer à ma moitié" : "Partager le ticket"}
                    </button>
                    <button
                      type="button"
                      onClick={addToAgenda}
                      disabled={!canBuild}
                      aria-label="Ajouter à notre agenda"
                      title="Ajouter à notre agenda (.ics)"
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gold/30 bg-ink-800/70 text-gold transition hover:border-gold/55 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[9.5px] text-ash">
                    L’agenda s’ajoute au prochain samedi, 19 h 30.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
