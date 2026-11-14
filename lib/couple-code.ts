import { randomInt } from "node:crypto";

/**
 * Alphabet sans caractères ambigus (pas de 0/O ni 1/I) :
 * un code se lit et se recopie sans erreur au téléphone.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

/** Retire espaces et tirets, puis passe en majuscules. */
export function normalizeCoupleCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidCoupleCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

export function generateCoupleCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}
