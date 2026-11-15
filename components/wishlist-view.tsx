"use client";

import { motion } from "motion/react";
import {
  ArrowRightIcon,
  CopyIcon,
  HeartIcon,
  TrashIcon,
} from "@/components/icons";
import { SETTING_LABEL, THEME_META } from "@/lib/preferences";
import type { Idea } from "@/lib/types";

type Props = {
  likedIdeas: Idea[];
  total: number;
  hasSession: boolean;
  removingId: string | null;
  onCopy: () => void;
  onRemove: (idea: Idea) => void;
  onOpenDetail: (idea: Idea) => void;
  onDiscover: () => void;
  onOpenFilters: () => void;
};

export function WishlistView({
  likedIdeas,
  total,
  hasSession,
  removingId,
  onCopy,
  onRemove,
  onOpenDetail,
  onDiscover,
  onOpenFilters,
}: Props) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/80">
              Ma liste
            </p>
            <h1 className="mt-1.5 font-display text-[30px] leading-[1.05] text-cream">
              Mes envies
            </h1>
            <p className="mt-1 text-[11.5px] text-cream/55">
              {likedIdeas.length > 0
                ? `${likedIdeas.length} idée${likedIdeas.length > 1 ? "s" : ""} gardée${likedIdeas.length > 1 ? "s" : ""}${total > 0 ? ` sur ${total}` : ""}`
                : "Les cartes que vous gardez apparaissent ici."}
            </p>
          </div>

          {likedIdeas.length > 0 ? (
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/[0.07] px-3 py-2 text-[11px] font-semibold text-gold transition hover:border-gold/60 hover:bg-gold/15"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              Copier
            </button>
          ) : null}
        </div>

        {likedIdeas.length === 0 ? (
          <section className="grimoire ornament-corners mt-5 flex flex-col items-center rounded-[26px] px-6 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-gold/25 bg-rose/15 text-rose-soft">
              <HeartIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-4 font-display text-[24px] leading-tight text-cream">
              {hasSession ? "Aucune envie gardée" : "Votre liste est vide"}
            </h2>
            <p className="mt-1.5 max-w-[260px] text-[12px] leading-relaxed text-cream/55">
              {hasSession
                ? "Reprenez le swipe : glissez à droite sur les idées qui vous tentent."
                : "Choisissez d’abord vos envies pour découvrir des idées à swiper."}
            </p>
            <button
              type="button"
              onClick={hasSession ? onDiscover : onOpenFilters}
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-2.5 text-[13px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110"
            >
              {hasSession ? "Continuer à swiper" : "Choisir mes envies"}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </section>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {likedIdeas.map((idea, index) => {
              const theme = THEME_META[idea.themes[0] ?? "detente"];
              const removing = removingId === idea.id;
              return (
                <motion.li
                  key={idea.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(index * 0.04, 0.3),
                    ease: [0.3, 0.8, 0.2, 1],
                  }}
                  className={`grimoire flex items-stretch gap-1 rounded-2xl p-1.5 transition ${
                    removing ? "opacity-40" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onOpenDetail(idea)}
                    aria-label={`Lire l’envie ${idea.title}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition hover:bg-white/[0.035]"
                  >
                    <span
                      aria-hidden
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[24px] ring-1 ring-gold/20"
                      style={{
                        backgroundImage: `linear-gradient(145deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                      }}
                    >
                      {idea.emoji}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[17px] leading-tight text-cream">
                        {idea.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[10.5px] text-ash">
                        {idea.budget === 0 ? "Gratuit" : `${idea.budget} €`} ·{" "}
                        {idea.duration} · {SETTING_LABEL[idea.setting]} ·{" "}
                        {theme.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-cream/55">
                        {idea.tagline}
                      </span>
                    </span>

                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-gold/45" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemove(idea)}
                    disabled={removing}
                    aria-label={`Retirer ${idea.title} de mes envies`}
                    className="my-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/15 bg-ink-800/50 text-ash transition hover:border-rose/40 hover:bg-rose/15 hover:text-rose-soft disabled:opacity-40"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
