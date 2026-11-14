/**
 * Nettoyage du texte libre saisi par les membres (souvenirs).
 *
 * Le stockage reste du texte brut : le rendu React échappe déjà les caractères
 * HTML. On retire donc uniquement ce qui n'a aucun sens dans une phrase
 * (contrôles, caractères invisibles, espaces multiples) sans dénaturer le texte.
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const INVISIBLE_CHARS = /[\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;

export function sanitizePlainText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\t/g, " ")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
