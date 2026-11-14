import { SETTING_LABEL, formatPrefsBudget } from "@/lib/preferences";
import type { Idea, Prefs } from "@/lib/types";

/** Texte prêt à coller dans une messagerie ou un carnet. */
export function buildShareText(ideas: Idea[], prefs: Prefs): string {
  const header = [
    "Nos envies de rendez-vous — À deux",
    `Budget : ${formatPrefsBudget(prefs.budget)}`,
    "",
  ];

  if (ideas.length === 0) {
    return [...header, "Aucune idée gardée pour l’instant."].join("\n");
  }

  const items = ideas.map((idea) => {
    const meta = [
      idea.duration,
      SETTING_LABEL[idea.setting],
      idea.budget === 0 ? "gratuit" : `≈ ${idea.budget} € / pers.`,
    ].join(" · ");
    return `${idea.emoji} ${idea.title}\n   ${idea.tagline}\n   ${meta}\n   Astuce : ${idea.tip}`;
  });

  return [...header, ...items, "", "Trouvé sur À deux."].join("\n\n");
}
