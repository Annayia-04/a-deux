import { describe, expect, it } from "vitest";
import {
  generateCoupleCode,
  isValidCoupleCode,
  normalizeCoupleCode,
} from "@/lib/couple-code";

describe("code d'invitation du duo", () => {
  it("normalise la saisie (majuscules, espaces, tirets)", () => {
    expect(normalizeCoupleCode(" abc-123 ")).toBe("ABC123");
    expect(normalizeCoupleCode("ab c 23")).toBe("ABC23");
    expect(normalizeCoupleCode("ABCDEF")).toBe("ABCDEF");
  });

  it("accepte uniquement le format attendu", () => {
    expect(isValidCoupleCode("ABC234")).toBe(true);
    expect(isValidCoupleCode("ZZZZZZ")).toBe(true);
    expect(isValidCoupleCode("ABCD2345")).toBe(true);
    expect(isValidCoupleCode("abc234")).toBe(false);
    expect(isValidCoupleCode("ABC123")).toBe(false); // 1 et 0 sont exclus
    expect(isValidCoupleCode("ABC23")).toBe(false);
    expect(isValidCoupleCode("ABCDEFG")).toBe(true);
    expect(isValidCoupleCode("ABCDEFGHJ")).toBe(false);
  });

  it("génère des codes lisibles et toujours valides", () => {
    for (let index = 0; index < 50; index += 1) {
      const code = generateCoupleCode();
      expect(code).toHaveLength(8);
      expect(isValidCoupleCode(code), code).toBe(true);
      expect(code).not.toMatch(/[01IO]/);
    }
  });
});
