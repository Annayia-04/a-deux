import { z } from "zod";
import { sanitizePlainText } from "@/lib/text";
import { CHOICE_CATEGORIES, MAX_THEMES, THEMES } from "@/lib/types";

const themeSchema = z.enum(THEMES);

/**
 * Schéma des préférences. `.strict()` rejette toute clé inconnue :
 * on ne laisse jamais de données arbitraires entrer en base.
 */
export const prefsSchema = z
  .object({
    budget: z.union([z.literal(0), z.literal(30), z.literal(80), z.null()]),
    setting: z.enum(["indoor", "outdoor", "any"]),
    time: z.enum(["day", "evening", "any"]),
    energy: z.enum(["calm", "active", "any"]),
    themes: z
      .array(themeSchema)
      .max(MAX_THEMES)
      .refine((themes) => new Set(themes).size === themes.length, {
        message: "Thèmes en double",
      }),
  })
  .strict();

export const swipeSchema = z
  .object({
    ideaId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, "Identifiant invalide"),
    direction: z.enum(["like", "pass"]),
  })
  .strict();

export const swipeRemoveSchema = z
  .object({
    ideaId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, "Identifiant invalide"),
  })
  .strict();

export const sessionRequestSchema = z.object({ prefs: prefsSchema }).strict();
export const previewRequestSchema = z.object({ prefs: prefsSchema }).strict();

/** Code d'invitation : la normalisation (majuscules, espaces) est faite côté serveur. */
export const coupleJoinSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(4, "Code trop court")
      .max(12, "Code trop long")
      .regex(/^[A-Za-z0-9 -]+$/, "Code invalide"),
  })
  .strict();

/** Validation du catalogue en test : garantit des données saines au build. */
export const ideaSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(3).max(80),
    tagline: z.string().min(3).max(120),
    description: z.string().min(20).max(400),
    themes: z.array(themeSchema).min(1).max(3),
    setting: z.enum(["indoor", "outdoor", "both"]),
    time: z.enum(["day", "evening", "any"]),
    energy: z.enum(["calm", "active"]),
    budget: z.number().int().min(0).max(500),
    duration: z.string().min(1).max(32),
    emoji: z.string().min(1).max(8),
    tip: z.string().min(3).max(200),
  })
  .strict();

// ---------------------------------------------------------------------------
// Souvenirs
// ---------------------------------------------------------------------------

const choiceIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "Identifiant invalide");

const souvenirTitleSchema = z
  .string()
  .max(400)
  .transform(sanitizePlainText)
  .refine((value) => value.length >= 2 && value.length <= 80, {
    message: "Titre invalide",
  });

const souvenirBodySchema = z
  .string()
  .min(1)
  .max(2000)
  .transform(sanitizePlainText)
  .refine((value) => value.length >= 1 && value.length <= 500, {
    message: "Le moment doit contenir entre 1 et 500 caractères",
  });

const souvenirEmojiSchema = z
  .string()
  .max(32)
  .transform(sanitizePlainText)
  .refine((value) => value.length >= 1 && value.length <= 8, {
    message: "Emoji invalide",
  });

/** Identifiant de souvenir : 12 octets aléatoires en hexadécimal. */
export const souvenirIdSchema = z.string().regex(/^[a-f0-9]{24}$/);

export const souvenirPhotoIdSchema = z.string().regex(/^[a-f0-9]{24}$/);

/** Code de passage OAuth natif : 32 octets en base64url. */
export const nativeAuthExchangeSchema = z
  .object({ code: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
  .strict();

export const pushDeviceSchema = z
  .object({
    token: z.string().min(20).max(4096),
    platform: z.enum(["android", "ios", "web"]),
  })
  .strict();

export const pushDeviceDeleteSchema = z
  .object({ token: z.string().min(20).max(4096) })
  .strict();

const happenedAtSchema = z
  .number()
  .int()
  .min(946684800000) // 1er janvier 2000
  .max(4102444800000); // 1er janvier 2100

export const souvenirCreateSchema = z
  .object({
    ideaId: choiceIdSchema.optional(),
    title: souvenirTitleSchema.optional(),
    emoji: souvenirEmojiSchema.optional(),
    happenedAt: happenedAtSchema.optional(),
    body: souvenirBodySchema.optional(),
  })
  .strict();

export const souvenirNoteSchema = z
  .object({
    body: souvenirBodySchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// Choix Nourriture / Films
// ---------------------------------------------------------------------------

export const choiceCategorySchema = z.enum(CHOICE_CATEGORIES);

export const choiceSwipeSchema = z
  .object({
    category: choiceCategorySchema,
    choiceId: choiceIdSchema,
    direction: z.enum(["like", "pass"]),
  })
  .strict();

export const choiceSeenSchema = z
  .object({
    category: choiceCategorySchema,
  })
  .strict();

/** Validation du catalogue de choix en test. */
export const choiceSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    category: choiceCategorySchema,
    title: z.string().min(2).max(80),
    tagline: z.string().min(3).max(120),
    emoji: z.string().min(1).max(8),
    tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(3),
  })
  .strict();

// ---------------------------------------------------------------------------
// Tap
// ---------------------------------------------------------------------------

export const tapSeenSchema = z
  .object({
    tapId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

// ---------------------------------------------------------------------------
// Widget natif « Petit ping »
// ---------------------------------------------------------------------------

export const widgetTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Jeton d’appareil invalide.");

export const widgetPairSchema = z
  .object({
    label: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

export const widgetRevokeSchema = z
  .object({
    token: widgetTokenSchema,
  })
  .strict();
