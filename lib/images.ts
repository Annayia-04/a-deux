/**
 * Validation des images côté serveur.
 *
 * Le client compresse déjà les photos (JPEG, 1600 px max), mais le serveur ne
 * lui fait pas confiance : le type est déduit des octets réels, pas du
 * `Content-Type` déclaré, et la taille est bornée.
 */

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

export const MAX_PHOTO_BYTES = 2_500_000;
export const MAX_PHOTOS_PER_SOUVENIR = 8;
export const MAX_PHOTOS_PER_COUPLE = 80;

export const IMAGE_MIME_LABEL: Record<ImageMime, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

/** Détecte le type réel à partir des octets d'en-tête. */
export function detectImageMime(bytes: Uint8Array): ImageMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function isPhotoTooLarge(byteSize: number): boolean {
  return byteSize > MAX_PHOTO_BYTES;
}
