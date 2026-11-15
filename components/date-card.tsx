import type { ReactElement } from "react";
import {
  BoltIcon,
  ClockIcon,
  MapPinIcon,
  SparklesIcon,
  WalletIcon,
} from "@/components/icons";
import {
  ENERGY_LABEL,
  TIME_LABEL,
  THEME_META,
} from "@/lib/preferences";
import type { Idea } from "@/lib/types";

const SETTING_SHORT: Record<Idea["setting"], string> = {
  indoor: "Intérieur",
  outdoor: "Extérieur",
  both: "Int. / ext.",
};

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

function MetaItem({
  icon: Icon,
  label,
  compact,
}: {
  icon: (props: { className?: string }) => ReactElement;
  label: string;
  compact: boolean;
}) {
  return (
    <li
      className={`flex min-w-0 items-center gap-1 rounded-lg bg-ink-800/70 ring-1 ring-inset ring-gold/15 ${
        compact ? "px-1.5 py-0.5" : "px-1.5 py-1"
      }`}
    >
      <Icon
        className={`shrink-0 text-ash ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`}
      />
      <span
        className={`truncate text-cream/75 ${
          compact ? "text-[9.5px]" : "text-[10.5px]"
        }`}
      >
        {label}
      </span>
    </li>
  );
}

/**
 * Carte d'une idée de rendez-vous, façon arcane de tarot : cadre double,
 * arche gravée, numéral romain, filets d'or. Purement présentationnelle :
 * le geste de swipe est géré par le parent. `compact` adapte les petits
 * écrans pour que tout tienne sans scroll.
 */
export function DateCard({
  idea,
  compact = false,
  number,
}: {
  idea: Idea;
  compact?: boolean;
  number?: number;
}) {
  const primaryTheme = THEME_META[idea.themes[0] ?? "detente"];

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
          compact ? "h-[24%] min-h-[84px]" : "h-[31%] min-h-[116px]"
        }`}
        style={{
          backgroundImage: `linear-gradient(145deg, ${primaryTheme.gradient[0]} 0%, ${primaryTheme.gradient[1]} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(80% 100% at 78% 0%, rgba(255,255,255,0.3), transparent 62%)",
          }}
        />
        <div aria-hidden className="grain absolute inset-0 opacity-20" />
        <div
          aria-hidden
          className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-black/25 blur-2xl"
        />

        {!compact ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-10 bottom-0 top-5 rounded-t-full border border-gold/25"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-14 bottom-0 top-8 rounded-t-full border border-gold/10"
            />
          </>
        ) : null}

        <span
          aria-hidden
          className="absolute left-[13%] top-[42%] text-[10px] leading-none text-gold/45"
        >
          ✦
        </span>
        <span
          aria-hidden
          className="absolute right-[12%] top-[28%] text-[8px] leading-none text-gold/35"
        >
          ✦
        </span>
        <span
          aria-hidden
          className="absolute bottom-[18%] right-[20%] text-[7px] leading-none text-gold/25"
        >
          ✦
        </span>

        <div
          className={`absolute inset-x-0 top-0 flex items-start justify-between gap-2 ${
            compact ? "p-2.5" : "p-3.5"
          }`}
        >
          <div className="flex flex-wrap gap-1.5">
            {idea.themes.slice(0, 2).map((theme) => (
              <span
                key={theme}
                className={`rounded-full bg-ink-950/55 font-semibold uppercase tracking-[0.13em] text-cream/90 ring-1 ring-gold/35 backdrop-blur-md ${
                  compact
                    ? "px-2 py-0.5 text-[8.5px]"
                    : "px-2.5 py-1 text-[9.5px]"
                }`}
              >
                {THEME_META[theme].label}
              </span>
            ))}
          </div>
          <span
            className={`shrink-0 rounded-full bg-ink-950/55 font-medium text-cream/90 ring-1 ring-gold/35 backdrop-blur-md ${
              compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
            }`}
          >
            {idea.budget === 0 ? "Gratuit" : `≈ ${idea.budget} €`}
          </span>
        </div>

        <div
          className={`relative flex h-full items-center justify-center ${
            compact ? "pb-0 pt-6" : "pb-1 pt-7"
          }`}
        >
          <span
            aria-hidden
            className={`select-none leading-none drop-shadow-[0_16px_30px_rgba(0,0,0,0.35)] ${
              compact ? "text-[42px]" : "text-[64px]"
            }`}
          >
            {idea.emoji}
          </span>
        </div>

        <div
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-16"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(20,18,24,0.92), transparent)",
          }}
        />
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col justify-between ${
          compact
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
              compact ? "text-[19px]" : "text-[23px]"
            }`}
          >
            {idea.title}
          </h2>
          <p
            className={`mt-0.5 line-clamp-1 text-center text-rose-soft/90 ${
              compact ? "text-[10.5px]" : "text-[11.5px]"
            }`}
          >
            {idea.tagline}
          </p>
          <p
            className={`mx-auto max-w-[95%] text-pretty text-center leading-relaxed text-cream/60 ${
              compact
                ? "mt-1 line-clamp-1 text-[10px]"
                : "mt-1.5 line-clamp-2 text-[11px]"
            }`}
          >
            {idea.description}
          </p>
        </div>

        <ul
          className={`grid grid-cols-2 ${compact ? "gap-1" : "gap-1.5"}`}
          aria-label="Détails de l’idée"
        >
          <MetaItem icon={ClockIcon} label={idea.duration} compact={compact} />
          <MetaItem
            icon={WalletIcon}
            label={idea.budget === 0 ? "Gratuit" : `≈ ${idea.budget} €`}
            compact={compact}
          />
          <MetaItem
            icon={MapPinIcon}
            label={SETTING_SHORT[idea.setting]}
            compact={compact}
          />
          <MetaItem
            icon={BoltIcon}
            label={`${TIME_LABEL[idea.time]} · ${ENERGY_LABEL[idea.energy]}`}
            compact={compact}
          />
        </ul>

        <div
          className={`rounded-xl border border-gold/20 bg-gold/[0.07] ${
            compact ? "px-2 py-1" : "px-2.5 py-1.5"
          }`}
        >
          <p className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.16em] text-gold/80">
            <SparklesIcon className="h-3 w-3" />
            Le petit plus
          </p>
          <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-gold/90">
            {idea.tip}
          </p>
        </div>
      </div>
    </article>
  );
}
