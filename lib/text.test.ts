import { describe, expect, it } from "vitest";
import { sanitizePlainText } from "@/lib/text";

describe("sanitizePlainText", () => {
  it("normalise les accents en NFC", () => {
    // "e" + accent combinant → un seul caractère précomposé.
    expect(sanitizePlainText("e\u0301te\u0301")).toBe("été");
  });

  it("supprime les caractères de contrôle et invisibles", () => {
    expect(sanitizePlainText("bon\u0000jour\u200b \u202e!")).toBe("bonjour !");
  });

  it("compacte les espaces et les tabulations", () => {
    expect(sanitizePlainText("  un\t\t truc   ici  ")).toBe("un truc ici");
  });

  it("garde les sauts de ligne utiles sans les multiplier", () => {
    expect(sanitizePlainText("ligne 1\n\n\n\nligne 2")).toBe(
      "ligne 1\n\nligne 2",
    );
  });

  it("remplace les espaces insécables", () => {
    expect(sanitizePlainText("à\u00a0deux")).toBe("à deux");
  });

  it("préserve les emojis et la ponctuation", () => {
    expect(sanitizePlainText("  ✨ Super soirée !  ")).toBe("✨ Super soirée !");
  });

  it("renvoie une chaîne vide pour un texte uniquement composé d'espaces", () => {
    expect(sanitizePlainText("   \n\t  ")).toBe("");
  });
});
