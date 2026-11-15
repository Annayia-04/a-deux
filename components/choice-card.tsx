import type { ReactNode } from "react";
import { SparklesIcon } from "@/components/icons";
import { MOVIE_POSTERS } from "@/lib/posters";
import {
  CHOICE_CATEGORY_META,
  FOOD_MODE_META,
  MOVIE_PLATFORM_LABEL,
  budgetLabel,
  formatChoiceDuration,
} from "@/lib/choices";
import type { Choice } from "@/lib/types";

const ROMAN: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

function roman(value: number): string {
  let rest = Math.max(1, Math.min(3999, Math.round(value)));
  let out = "";
  for (const [amount, glyph] of ROMAN) {
    while (rest >= amount) {
      out += glyph;
      rest -= amount;
    }
  }
  return out;
}

/**
 * Carte Food ou Film, dans la même coque tarot que les activités : cadre
 * double, arche dorée, numéral, titre centré et métadonnées.
 */
export function ChoiceCard({
  choice,
  number,
  compact = false,
  tight = false,
  footer,
}: {
  choice: Choice;
  number?: number;
  compact?: boolean;
  tight?: boolean;
  footer?: ReactNode;
}) {
  const meta = CHOICE_CATEGORY_META[choice.category];
  const poster = MOVIE_POSTERS[choice.id] ?? null;
  const isSeries = choice.kind === "series";
  const foodMode = choice.mode ? FOOD_MODE_META[choice.mode] : null;
  const duration = choice.duration
    ? `${formatChoiceDuration(choice.duration)}${isSeries ? "/ép." : ""}`
    : null;
  const platform = choice.platform
    ? MOVIE_PLATFORM_LABEL[choice.platform]
    : null;

  const topLeft =
    choice.category === "food"
      ? `${foodMode?.emoji ?? "🍽️"} ${foodMode?.label ?? meta.label}`
      : isSeries
        ? "Série"
        : (choice.tags[0] ?? meta.label).replaceAll("-", " ");
  const topRight =
    choice.category === "food"
      ? choice.budget
        ? budgetLabel(choice.budget)
        : meta.kicker
      : `${duration ?? ""}${choice.rating ? ` · ★ ${choice.rating.toFixed(1)}` : ""}`;
  const metaLine =
    choice.category === "food"
      ? choice.time
        ? `${choice.time} min`
        : ""
      : platform ?? "IMDb";

  return (
    <article className="frame-gold relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-gold/30 bg-ink-850 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.92)]">
      <div
        aria-hidden
        className="ornament-corners pointer-events-none absolute inset-0 z-20 rounded-[24px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[5px] z-20 rounded-[19px] border border-gold/15"
      />

      <div
        className={`relative shrink-0 overflow-hidden ${
          tight
            ? "h-[24%] min-h-[70px]"
            : compact
              ? "h-[34%] min-h-[104px]"
              : "h-[42%] min-h-[188px]"
        }`}
        style={{
          backgroundImage: `linear-gradient(145deg, ${meta.gradient[0]} 0%, ${meta.gradient[1]} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(80% 100% at 78% 0%, rgba(255,255,255,0.26), transparent 62%)",
          }}
        />
        <div aria-hidden className="grain absolute inset-0 opacity-15" />

        {compact ? (
          <div className="relative flex h-full items-center justify-center">
            <span
              aria-hidden
              className={`relative grid place-items-center overflow-hidden rounded-[12px] border border-gold/30 bg-ink-950/40 ring-1 ring-inset ring-gold/15 ${
                tight ? "h-14 w-10" : "h-20 w-14"
              }`}
            >
              <span
                className={`${tight ? "text-[22px]" : "text-[30px]"} ${
                  poster ? "opacity-0" : ""
                }`}
              >
                {choice.emoji}
              </span>
              {poster ? (
                <img
                  src={poster}
                  alt=""
                  loading={number === 1 ? "eager" : "lazy"}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    event.currentTarget.previousElementSibling?.classList.remove(
                      "opacity-0",
                    );
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
            </span>
          </div>
        ) : (
          <>
            <span
              aria-hidden
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] leading-none text-gold/40"
            >
              ✦
            </span>
            <span
              aria-hidden
              className="absolute right-4 top-1/3 text-[8px] leading-none text-gold/30"
            >
              ✦
            </span>
            <div className="absolute inset-y-2 left-1/2 aspect-[3/4] -translate-x-1/2 overflow-hidden rounded-t-full rounded-b-[18px] border border-gold/45 bg-ink-950/55 p-1 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.95)]">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-t-full rounded-b-[14px]">
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-80"
                  style={{
                    backgroundImage: `linear-gradient(150deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
                  }}
                />
                <span className="relative text-[58px] drop-shadow-[0_14px_24px_rgba(0,0,0,0.45)]">
                  {choice.emoji}
                </span>
                {poster ? (
                  <img
                    src={poster}
                    alt=""
                    loading={number === 1 ? "eager" : "lazy"}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/25"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink-950/70 to-transparent"
                />
              </div>
            </div>
          </>
        )}

        <div
          className={`absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 ${
            compact ? "p-2.5" : "p-3.5"
          }`}
        >
          <span
            className={`rounded-full bg-ink-950/60 font-semibold uppercase tracking-[0.13em] text-cream/90 ring-1 ring-gold/35 backdrop-blur-md ${
              compact ? "px-2 py-0.5 text-[8.5px]" : "px-2.5 py-1 text-[9.5px]"
            }`}
          >
            {topLeft}
          </span>
          <span
            className={`shrink-0 rounded-full bg-ink-950/60 font-medium text-cream/90 ring-1 ring-gold/35 backdrop-blur-md ${
              compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
            }`}
          >
            {topRight}
          </span>
        </div>

        <div
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-16 bg-gradient-to-t from-ink-850 via-ink-850/45 to-transparent"
        />
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col justify-between ${
          tight
            ? "gap-1 px-3.5 pb-2.5 pt-2"
            : compact
              ? "gap-1 px-3.5 pb-2.5 pt-2"
              : "gap-1.5 px-4 pb-3 pt-2.5"
        }`}
      >
        <div className="min-h-0">
          <div className="mb-1 flex items-center justify-center gap-2 text-gold/70">
            <span
              aria-hidden
              className="h-px w-7 bg-gradient-to-r from-transparent to-gold/40"
            />
            <span className="font-display text-[9.5px] uppercase leading-none tracking-[0.3em]">
              {number ? roman(number) : "✦"}
            </span>
            <span
              aria-hidden
              className="h-px w-7 bg-gradient-to-l from-transparent to-gold/40"
            />
          </div>

          <h2
            className={`balance line-clamp-2 text-center font-display leading-[1.06] tracking-[-0.01em] text-cream ${
              tight ? "text-[17px]" : compact ? "text-[19px]" : "text-[23px]"
            }`}
          >
            {choice.title}
          </h2>
          <p
            className={`mt-0.5 line-clamp-1 text-center text-rose-soft/90 ${
              compact ? "text-[10.5px]" : "text-[11.5px]"
            }`}
          >
            {choice.tagline}
          </p>
          <p className="mt-1 text-center text-[10px] text-ash">
            {metaLine}
          </p>
        </div>

        {tight ? null : (
          <div className="rounded-xl border border-gold/20 bg-gold/[0.07] px-2.5 py-1.5">
            <p className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.16em] text-gold/80">
              <SparklesIcon className="h-3 w-3" />
              {choice.category === "food" ? "L’ambiance" : "Les genres"}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-gold/90">
              {choice.tags.map((tag) => tag.replaceAll("-", " ")).join(" · ")}
            </p>
          </div>
        )}

        {footer}
      </div>
    </article>
  );
}
