import { describe, expect, it } from "vitest";
import { readWidgetToken } from "@/lib/widget-token";

const TOKEN = "A".repeat(43);

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/widget/ping", { headers });
}

describe("jeton du widget natif", () => {
  it("lit un en-tête Authorization Bearer", () => {
    expect(
      readWidgetToken(requestWith({ authorization: `Bearer ${TOKEN}` })),
    ).toBe(TOKEN);
    expect(
      readWidgetToken(requestWith({ authorization: `bearer ${TOKEN}` })),
    ).toBe(TOKEN);
  });

  it("accepte le repli X-Widget-Token", () => {
    expect(
      readWidgetToken(requestWith({ "x-widget-token": TOKEN })),
    ).toBe(TOKEN);
  });

  it("refuse un jeton absent, mal formé ou d'une autre longueur", () => {
    expect(readWidgetToken(requestWith({}))).toBeNull();
    expect(
      readWidgetToken(requestWith({ authorization: "Bearer" })),
    ).toBeNull();
    expect(
      readWidgetToken(requestWith({ authorization: "Basic abc" })),
    ).toBeNull();
    expect(
      readWidgetToken(requestWith({ authorization: "Bearer trop-court" })),
    ).toBeNull();
    expect(
      readWidgetToken(
        requestWith({ authorization: `Bearer ${"A".repeat(44)}` }),
      ),
    ).toBeNull();
    expect(
      readWidgetToken(requestWith({ authorization: `Bearer ${TOKEN} extra` })),
    ).toBeNull();
  });

  it("n'accepte jamais un jeton dans l'URL", () => {
    const request = new Request(
      `http://localhost/api/widget/ping?token=${TOKEN}`,
    );
    expect(readWidgetToken(request)).toBeNull();
  });
});
