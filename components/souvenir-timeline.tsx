"use client";

import { motion } from "motion/react";
import { CheckIcon, SparklesIcon } from "@/components/icons";
import type { SouvenirSnapshot } from "@/lib/types";

function formatDate(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function monthKey(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    }).format(new Date(timestamp));
  } catch {
    return "Souvenirs";
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SouvenirTimeline({
  souvenirs,
  loading,
  error,
  onAdd,
  onEditMine,
}: {
  souvenirs: SouvenirSnapshot[];
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onEditMine: (souvenir: SouvenirSnapshot) => void;
}) {
  const groups = new Map<string, SouvenirSnapshot[]>();
  for (const souvenir of souvenirs) {
    const key = monthKey(souvenir.happenedAt);
    const group = groups.get(key) ?? [];
    group.push(souvenir);
    groups.set(key, group);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-[22px] leading-none tracking-[0.01em] text-cream">
            Votre journal
          </h3>
          <span aria-hidden className="rule-ornament mt-2 block h-px w-24" />
          <p className="mt-1.5 text-[10.5px] text-ash">
            {souvenirs.length > 0
              ? `${souvenirs.length} date${souvenirs.length > 1 ? "s" : ""} racontée${souvenirs.length > 1 ? "s" : ""}`
              : "Les dates vécues, racontées à deux."}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/[0.06] px-3 py-2 text-[11.5px] font-medium text-gold transition hover:border-gold/65 hover:bg-gold/10"
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[11.5px] leading-relaxed text-rose-soft"
        >
          {error}
        </p>
      ) : null}

      {loading && souvenirs.length === 0 ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1].map((index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
            />
          ))}
        </div>
      ) : null}

      {!loading && souvenirs.length === 0 ? (
        <div className="grimoire ornament-corners rounded-2xl px-5 py-9 text-center">
          <span aria-hidden className="text-4xl">
            📖
          </span>
          <p className="mt-3 font-display text-[18px] text-cream">
            Votre histoire commence ici
          </p>
          <p className="mx-auto mt-1.5 max-w-[280px] text-[11.5px] leading-relaxed text-ash">
            Après un date, racontez chacun votre moment préféré. Les deux
            versions se retrouvent dans cette timeline.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-4 py-2.5 text-[12px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            Écrire un premier souvenir
          </button>
        </div>
      ) : null}

      {[...groups.entries()].map(([month, items]) => (
        <div key={month}>
          <p className="mb-2 flex items-center gap-2 font-display text-[13px] tracking-[0.08em] text-gold/85">
            <span className="h-1.5 w-1.5 rotate-45 bg-gold/80" />
            {capitalize(month)}
          </p>
          <div className="relative space-y-2.5 border-l border-gold/20 pl-3.5">
            {items.map((souvenir, index) => (
              <motion.article
                key={souvenir.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(index * 0.04, 0.2),
                  ease: [0.3, 0.8, 0.2, 1],
                }}
                className="grimoire relative rounded-2xl p-3.5"
              >
                <span
                  aria-hidden
                  className="absolute -left-[22px] top-5 h-2.5 w-2.5 rotate-45 border border-gold/60 bg-ember"
                />

                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose/30 to-gold/15 text-[20px] ring-1 ring-gold/25"
                  >
                    {souvenir.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-display text-[16px] leading-tight text-cream">
                        {souvenir.title}
                      </h4>
                      {souvenir.complete ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/10 px-1.5 py-0.5 text-[9px] font-medium text-gold ring-1 ring-inset ring-gold/30">
                          <CheckIcon className="h-2.5 w-2.5" />
                          2/2
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-ash">
                          {Number(souvenir.mine !== null) +
                            Number(souvenir.partner !== null)}
                          /2
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-ash">
                      {formatDate(souvenir.happenedAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-rose/15 bg-rose/[0.05] px-2.5 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-rose-soft/85">
                      Votre moment
                    </p>
                    {souvenir.mine ? (
                      <>
                        <p className="mt-1 whitespace-pre-line text-[11.5px] leading-relaxed text-cream/80">
                          {souvenir.mine}
                        </p>
                        <button
                          type="button"
                          onClick={() => onEditMine(souvenir)}
                          className="mt-1.5 text-[10px] text-ash underline-offset-2 transition hover:text-cream/70 hover:underline"
                        >
                          Modifier
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEditMine(souvenir)}
                        className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-dashed border-rose/35 bg-rose/[0.06] px-2 py-1 text-[10.5px] font-medium text-rose-soft transition hover:border-rose/55 hover:bg-rose/10"
                      >
                        <SparklesIcon className="h-3 w-3" />
                        Écrire votre moment
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl border border-gold/12 bg-ink-800/50 px-2.5 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ash">
                      Votre partenaire
                    </p>
                    {souvenir.partner ? (
                      <p className="mt-1 whitespace-pre-line text-[11.5px] leading-relaxed text-cream/65">
                        {souvenir.partner}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] italic text-ash">
                        En attente de son moment…
                      </p>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
