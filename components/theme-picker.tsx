"use client";

import { useEffect, useState } from "react";
import { CheckIcon, PaletteIcon } from "@/components/icons";
import {
  THEME_COOKIE,
  THEMES,
  parseTheme,
  themeById,
  type ThemeId,
} from "@/lib/themes";

/**
 * Choix de l'ambiance visuelle. Le thème est posé sur `<html data-theme>` et
 * mémorisé dans un cookie lisible par le serveur, pour éviter tout flash au
 * chargement suivant.
 */
export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>("gothique");

  useEffect(() => {
    setTheme(parseTheme(document.documentElement.dataset.theme));
  }, []);

  function choose(id: ThemeId) {
    setTheme(id);
    document.documentElement.dataset.theme = id;
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${THEME_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax${secure}`;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", themeById(id).themeColor);
  }

  return (
    <section
      aria-label="Apparence"
      className="grimoire rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
          <PaletteIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[17px] leading-tight text-cream">
            Apparence
          </h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ash">
            Choisissez l’ambiance qui vous ressemble. Elle reste sur cet
            appareil.
          </p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Thème de l’application"
        className="mt-3 grid gap-2 sm:grid-cols-2"
      >
        {THEMES.map((item) => {
          const selected = item.id === theme;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(item.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-gold/60 bg-gold/[0.08] shadow-[inset_0_0_0_1px_rgba(197,160,89,0.16)]"
                  : "border-gold/15 bg-ink-800/50 hover:border-gold/35 hover:bg-ink-700/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden className="flex -space-x-1">
                  {item.swatches.map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-full border border-ink-950/70"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="text-[12px] font-medium text-cream">
                  {item.label}
                </span>
                {selected ? (
                  <CheckIcon className="ml-auto h-3.5 w-3.5 shrink-0 text-gold" />
                ) : null}
              </span>
              <span className="mt-1 block text-[10.5px] leading-snug text-ash">
                {item.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
