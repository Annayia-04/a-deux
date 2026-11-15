import { describe, expect, it } from "vitest";
import {
  prefsSchema,
  coupleJoinSchema,
  swipeSchema,
  souvenirCreateSchema,
  souvenirNoteSchema,
  souvenirIdSchema,
  choiceSwipeSchema,
  tapSeenSchema,
  pushDeviceSchema,
  pushDeviceDeleteSchema,
} from "@/lib/schemas";
import { DEFAULT_PREFS } from "@/lib/types";

describe("prefsSchema", () => {
  it("accepte les préférences par défaut", () => {
    expect(prefsSchema.safeParse(DEFAULT_PREFS).success).toBe(true);
  });

  it("refuse un budget non prévu", () => {
    expect(
      prefsSchema.safeParse({ ...DEFAULT_PREFS, budget: 42 }).success,
    ).toBe(false);
  });

  it("refuse les clés inconnues", () => {
    expect(
      prefsSchema.safeParse({ ...DEFAULT_PREFS, admin: true }).success,
    ).toBe(false);
  });

  it("refuse plus de trois thèmes", () => {
    expect(
      prefsSchema.safeParse({
        ...DEFAULT_PREFS,
        themes: ["culture", "nature", "sport", "aventure"],
      }).success,
    ).toBe(false);
  });

  it("refuse les doublons de thèmes", () => {
    expect(
      prefsSchema.safeParse({
        ...DEFAULT_PREFS,
        themes: ["nature", "nature"],
      }).success,
    ).toBe(false);
  });

  it("refuse un thème inconnu", () => {
    expect(
      prefsSchema.safeParse({ ...DEFAULT_PREFS, themes: ["spa"] }).success,
    ).toBe(false);
  });
});

describe("coupleJoinSchema", () => {
  it("accepte un code avec espaces ou minuscules", () => {
    expect(coupleJoinSchema.safeParse({ code: "abc234" }).success).toBe(true);
    expect(coupleJoinSchema.safeParse({ code: " ABC-234 " }).success).toBe(true);
  });

  it("refuse un code trop court ou avec des caractères inattendus", () => {
    expect(coupleJoinSchema.safeParse({ code: "ab" }).success).toBe(false);
    expect(coupleJoinSchema.safeParse({ code: "ABC/234" }).success).toBe(false);
  });

  it("refuse les champs supplémentaires", () => {
    expect(
      coupleJoinSchema.safeParse({ code: "ABC234", sessionId: "autre" }).success,
    ).toBe(false);
  });
});

describe("swipeSchema", () => {
  it("accepte un swipe valide", () => {
    expect(
      swipeSchema.safeParse({ ideaId: "pique-nique-sunset", direction: "like" })
        .success,
    ).toBe(true);
  });

  it("refuse un identifiant arbitraire", () => {
    expect(
      swipeSchema.safeParse({ ideaId: "../../etc/passwd", direction: "like" })
        .success,
    ).toBe(false);
  });

  it("refuse une direction inconnue", () => {
    expect(
      swipeSchema.safeParse({ ideaId: "escape-game", direction: "superlike" })
        .success,
    ).toBe(false);
  });

  it("refuse les champs supplémentaires", () => {
    expect(
      swipeSchema.safeParse({
        ideaId: "escape-game",
        direction: "pass",
        sessionId: "autre-session",
      }).success,
    ).toBe(false);
  });
});

describe("souvenirCreateSchema", () => {
  it("accepte un souvenir lié à une idée avec un moment", () => {
    const result = souvenirCreateSchema.safeParse({
      ideaId: "pique-nique-sunset",
      happenedAt: Date.parse("2026-05-01T12:00:00Z"),
      body: "Le coucher de soleil sur les quais.",
    });
    expect(result.success).toBe(true);
  });

  it("accepte un souvenir manuel avec titre et emoji", () => {
    const result = souvenirCreateSchema.safeParse({
      title: "Dîner sur les toits",
      emoji: "🌙",
      happenedAt: Date.parse("2026-04-12T12:00:00Z"),
    });
    expect(result.success).toBe(true);
  });

  it("nettoie le texte avant de le stocker", () => {
    const result = souvenirCreateSchema.safeParse({
      title: "  Dîner   sur les toits  ",
      body: "  Un\n\n\n\nmoment  parfait.  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Dîner sur les toits");
      expect(result.data.body).toBe("Un\n\nmoment parfait.");
    }
  });

  it("refuse un corps vide après nettoyage", () => {
    expect(souvenirCreateSchema.safeParse({ body: "   \u200b  " }).success).toBe(
      false,
    );
  });

  it("refuse un moment de plus de 500 caractères", () => {
    expect(
      souvenirCreateSchema.safeParse({ body: "a".repeat(501) }).success,
    ).toBe(false);
  });

  it("refuse un identifiant d'idée invalide", () => {
    expect(
      souvenirCreateSchema.safeParse({ ideaId: "../../etc/passwd" }).success,
    ).toBe(false);
  });

  it("refuse une date hors bornes", () => {
    expect(souvenirCreateSchema.safeParse({ happenedAt: 0 }).success).toBe(
      false,
    );
    expect(
      souvenirCreateSchema.safeParse({ happenedAt: Date.now() + 1e6 }).success,
    ).toBe(true);
  });

  it("refuse les champs supplémentaires", () => {
    expect(
      souvenirCreateSchema.safeParse({ title: "Test", coupleId: "autre" })
        .success,
    ).toBe(false);
  });
});

describe("souvenirNoteSchema", () => {
  it("accepte un moment simple", () => {
    expect(souvenirNoteSchema.safeParse({ body: "Le dessert." }).success).toBe(
      true,
    );
  });

  it("refuse un moment vide ou trop long", () => {
    expect(souvenirNoteSchema.safeParse({ body: "  " }).success).toBe(false);
    expect(
      souvenirNoteSchema.safeParse({ body: "a".repeat(501) }).success,
    ).toBe(false);
  });

  it("refuse les champs supplémentaires", () => {
    expect(
      souvenirNoteSchema.safeParse({ body: "Test", sessionId: "autre" }).success,
    ).toBe(false);
  });
});

describe("souvenirIdSchema", () => {
  it("accepte 24 caractères hexadécimaux", () => {
    expect(souvenirIdSchema.safeParse("a1b2c3d4e5f60718293a4b5c").success).toBe(
      true,
    );
  });

  it("refuse les identifiants arbitraires", () => {
    expect(souvenirIdSchema.safeParse("../../etc/passwd").success).toBe(false);
    expect(souvenirIdSchema.safeParse("abc").success).toBe(false);
  });
});

describe("choiceSwipeSchema", () => {
  it("accepte un swipe valide", () => {
    expect(
      choiceSwipeSchema.safeParse({
        category: "food",
        choiceId: "pizza-maison",
        direction: "like",
      }).success,
    ).toBe(true);
  });

  it("refuse une catégorie inconnue", () => {
    expect(
      choiceSwipeSchema.safeParse({
        category: "music",
        choiceId: "pizza-maison",
        direction: "like",
      }).success,
    ).toBe(false);
  });

  it("refuse un identifiant arbitraire", () => {
    expect(
      choiceSwipeSchema.safeParse({
        category: "movie",
        choiceId: "<script>",
        direction: "pass",
      }).success,
    ).toBe(false);
  });

  it("refuse les champs supplémentaires", () => {
    expect(
      choiceSwipeSchema.safeParse({
        category: "movie",
        choiceId: "inception",
        direction: "like",
        coupleId: "autre",
      }).success,
    ).toBe(false);
  });
});

describe("tapSeenSchema", () => {
  it("accepte un identifiant entier positif", () => {
    expect(tapSeenSchema.safeParse({ tapId: 42 }).success).toBe(true);
  });

  it("refuse zéro, les flottants et les chaînes", () => {
    expect(tapSeenSchema.safeParse({ tapId: 0 }).success).toBe(false);
    expect(tapSeenSchema.safeParse({ tapId: 1.5 }).success).toBe(false);
    expect(tapSeenSchema.safeParse({ tapId: "42" }).success).toBe(false);
  });

  it("refuse les champs supplémentaires", () => {
    expect(
      tapSeenSchema.safeParse({ tapId: 1, sessionId: "autre" }).success,
    ).toBe(false);
  });
});

describe("pushDeviceSchema", () => {
  const token = "f".repeat(64);

  it("accepte un jeton Android", () => {
    expect(
      pushDeviceSchema.safeParse({ token, platform: "android" }).success,
    ).toBe(true);
  });

  it("refuse une plateforme inconnue", () => {
    expect(
      pushDeviceSchema.safeParse({ token, platform: "desktop" }).success,
    ).toBe(false);
  });

  it("refuse un jeton trop court", () => {
    expect(
      pushDeviceSchema.safeParse({ token: "court", platform: "android" })
        .success,
    ).toBe(false);
  });

  it("refuse les champs supplémentaires", () => {
    expect(
      pushDeviceSchema.safeParse({
        token,
        platform: "android",
        sessionId: "autre",
      }).success,
    ).toBe(false);
  });
});

describe("pushDeviceDeleteSchema", () => {
  it("accepte un jeton seul", () => {
    expect(pushDeviceDeleteSchema.safeParse({ token: "f".repeat(64) }).success).toBe(
      true,
    );
  });

  it("refuse les champs supplémentaires", () => {
    expect(
      pushDeviceDeleteSchema.safeParse({
        token: "f".repeat(64),
        platform: "android",
      }).success,
    ).toBe(false);
  });
});
