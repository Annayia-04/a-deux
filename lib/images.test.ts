import { describe, expect, it } from "vitest";
import {
  detectImageMime,
  isPhotoTooLarge,
  MAX_PHOTO_BYTES,
} from "@/lib/images";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

describe("detectImageMime", () => {
  it("reconnaît un JPEG", () => {
    expect(detectImageMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00))).toBe(
      "image/jpeg",
    );
  });

  it("reconnaît un PNG", () => {
    expect(
      detectImageMime(
        bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00),
      ),
    ).toBe("image/png");
  });

  it("reconnaît un WebP", () => {
    const header = [
      0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ];
    expect(detectImageMime(bytes(...header))).toBe("image/webp");
  });

  it("refuse un type inconnu ou un faux en-tête", () => {
    expect(detectImageMime(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull();
    expect(detectImageMime(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0, 0, 0, 0))).toBeNull();
    expect(detectImageMime(bytes())).toBeNull();
  });
});

describe("isPhotoTooLarge", () => {
  it("accepte la limite exacte et refuse au-delà", () => {
    expect(isPhotoTooLarge(MAX_PHOTO_BYTES)).toBe(false);
    expect(isPhotoTooLarge(MAX_PHOTO_BYTES + 1)).toBe(true);
  });
});
