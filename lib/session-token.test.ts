import { describe, expect, it } from "vitest";
import {
  generateSessionToken,
  hashToken,
  isValidSessionToken,
  safeEqual,
} from "@/lib/session-token";

describe("jetons de session", () => {
  it("génère un jeton opaque au bon format", () => {
    const { token, hash } = generateSessionToken();
    expect(isValidSessionToken(token)).toBe(true);
    expect(token).toHaveLength(43);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("ne stocke jamais le jeton en clair", () => {
    const { token, hash } = generateSessionToken();
    expect(hash).not.toContain(token);
    expect(hashToken(token)).toBe(hash);
  });

  it("génère des jetons distincts", () => {
    const first = generateSessionToken();
    const second = generateSessionToken();
    expect(first.token).not.toBe(second.token);
    expect(first.hash).not.toBe(second.hash);
  });

  it("rejette les jetons forgés ou malformés", () => {
    expect(isValidSessionToken("")).toBe(false);
    expect(isValidSessionToken("abc")).toBe(false);
    expect(isValidSessionToken("a".repeat(43))).toBe(true);
    expect(isValidSessionToken("é".repeat(43))).toBe(false);
    expect(isValidSessionToken(`${"a".repeat(42)}!`)).toBe(false);
  });

  it("compare les chaînes sans erreur de longueur", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
