"use client";

export type Universe = "activity" | "food" | "movie";

const UNIVERSES: { id: Universe; label: string; emoji: string }[] = [
  { id: "activity", label: "Activité", emoji: "✨" },
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "movie", label: "Film", emoji: "🎬" },
];

/** Sélecteur des trois decks de Découvrir. */
export function UniverseSwitch({
  value,
  onChange,
}: {
  value: Universe;
  onChange: (value: Universe) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Univers de découverte"
      className="mx-auto flex w-full max-w-md gap-1 rounded-xl border border-gold/15 bg-ink-850/60 p-1"
    >
      {UNIVERSES.map((universe) => {
        const active = value === universe.id;
        return (
          <button
            key={universe.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(universe.id)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium transition ${
              active
                ? "bg-gold/[0.12] text-cream shadow-[inset_0_-1px_0_rgba(197,160,89,0.65)]"
                : "text-ash hover:text-cream/75"
            }`}
          >
            <span aria-hidden className="text-[13px]">
              {universe.emoji}
            </span>
            {universe.label}
          </button>
        );
      })}
    </div>
  );
}
