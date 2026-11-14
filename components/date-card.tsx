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

function MetaItem({
  icon: Icon,
  label,
}: {
  icon: (props: { className?: string }) => ReactElement;
  label: string;
}) {
  return (
    <li className="flex min-w-0 items-center gap-1 rounded-lg bg-white/[0.05] px-1.5 py-1 ring-1 ring-inset ring-white/[0.06] [@media(min-height:701px)]:gap-1.5 [@media(min-height:701px)]:px-2 [@media(min-height:701px)]:py-1.5">
      <Icon className="h-3 w-3 shrink-0 text-cream/40 [@media(min-height:701px)]:h-3.5 [@media(min-height:701px)]:w-3.5" />
      <span className="truncate text-[10px] text-cream/75 [@media(min-height:701px)]:text-[11px]">
        {label}
      </span>
    </li>
  );
}

/**
 * Carte d'une idée de rendez-vous. Purement présentationnelle :
 * le geste de swipe est géré par le parent.
 */
export function DateCard({ idea }: { idea: Idea }) {
  const primaryTheme = THEME_META[idea.themes[0] ?? "detente"];

  return (
    <article className="relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-ink-900 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)]">
      <div
        className="relative h-[34%] min-h-[118px] shrink-0 overflow-hidden [@media(min-height:701px)]:min-h-[148px]"
        style={{
          backgroundImage: `linear-gradient(145deg, ${primaryTheme.gradient[0]} 0%, ${primaryTheme.gradient[1]} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(80% 100% at 78% 0%, rgba(255,255,255,0.32), transparent 62%)",
          }}
        />
        <div aria-hidden className="grain absolute inset-0 opacity-20" />
        <div
          aria-hidden
          className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-black/25 blur-2xl"
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
          <div className="flex flex-wrap gap-1.5">
            {idea.themes.slice(0, 2).map((theme) => (
              <span
                key={theme}
                className="rounded-full bg-black/25 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.13em] text-white/90 ring-1 ring-white/25 backdrop-blur-md"
              >
                {THEME_META[theme].label}
              </span>
            ))}
          </div>
          <span className="shrink-0 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-medium text-white/90 ring-1 ring-white/25 backdrop-blur-md">
            {idea.budget === 0 ? "Gratuit" : `≈ ${idea.budget} €`}
          </span>
        </div>

        <div className="relative flex h-full items-center justify-center pb-2 pt-9 [@media(min-height:701px)]:pt-8">
          <span
            aria-hidden
            className="select-none text-[60px] leading-none drop-shadow-[0_16px_30px_rgba(0,0,0,0.35)] [@media(min-height:701px)]:text-[86px]"
          >
            {idea.emoji}
          </span>
        </div>

        <div
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-16"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(16,10,24,0.85), transparent)",
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5 px-4 pb-3 pt-2.5 [@media(min-height:701px)]:gap-2.5 [@media(min-height:701px)]:px-5 [@media(min-height:701px)]:pb-4 [@media(min-height:701px)]:pt-3.5">
        <div className="min-h-0">
          <h2 className="balance line-clamp-2 font-display text-[21px] leading-[1.06] tracking-[-0.01em] text-cream [@media(min-height:701px)]:text-[26px]">
            {idea.title}
          </h2>
          <p className="mt-0.5 line-clamp-1 text-[11.5px] text-rose-soft/90 [@media(min-height:701px)]:mt-1 [@media(min-height:701px)]:text-[12.5px]">
            {idea.tagline}
          </p>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-cream/60 [@media(min-height:701px)]:mt-2 [@media(min-height:701px)]:line-clamp-3 [@media(min-height:701px)]:text-[12px]">
            {idea.description}
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-1 [@media(min-height:701px)]:gap-1.5">
          <MetaItem icon={ClockIcon} label={idea.duration} />
          <MetaItem
            icon={WalletIcon}
            label={idea.budget === 0 ? "Gratuit" : `≈ ${idea.budget} €`}
          />
          <MetaItem icon={MapPinIcon} label={SETTING_SHORT[idea.setting]} />
          <MetaItem
            icon={BoltIcon}
            label={`${TIME_LABEL[idea.time]} · ${ENERGY_LABEL[idea.energy]}`}
          />
        </ul>

        <div className="rounded-xl border border-gold/20 bg-gold/[0.07] px-2.5 py-1.5 [@media(min-height:701px)]:rounded-2xl [@media(min-height:701px)]:px-3 [@media(min-height:701px)]:py-2">
          <p className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.16em] text-gold/80 [@media(min-height:701px)]:text-[9px]">
            <SparklesIcon className="h-3 w-3" />
            Le petit plus
          </p>
          <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-gold/90 [@media(min-height:701px)]:line-clamp-2 [@media(min-height:701px)]:text-[11px]">
            {idea.tip}
          </p>
        </div>
      </div>
    </article>
  );
}
