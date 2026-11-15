import { describe, expect, it } from "vitest";
import {
  readInviteCode,
  readLaunchAction,
  stripLaunchParams,
} from "@/lib/launch-action";

describe("actions de lancement PWA", () => {
  it("reconnaît le raccourci petit ping", () => {
    expect(readLaunchAction("?ping=1")).toBe("ping");
    expect(readLaunchAction("ping=1")).toBe("ping");
    expect(readLaunchAction("?ping=1&utm=home")).toBe("ping");
  });

  it("reconnaît le raccourci duo", () => {
    expect(readLaunchAction("?duo=1")).toBe("duo");
  });

  it("ignore les valeurs inattendues", () => {
    expect(readLaunchAction("")).toBeNull();
    expect(readLaunchAction("?ping=0")).toBeNull();
    expect(readLaunchAction("?ping=true")).toBeNull();
    expect(readLaunchAction("?duo")).toBeNull();
    expect(readLaunchAction("?autre=1")).toBeNull();
  });

  it("retire uniquement les paramètres d'action de l'URL", () => {
    expect(stripLaunchParams("?ping=1")).toBe("");
    expect(stripLaunchParams("?ping=1&duo=1")).toBe("");
    expect(stripLaunchParams("?ping=1&ref=ecran")).toBe("ref=ecran");
    expect(stripLaunchParams("?ref=ecran")).toBe("ref=ecran");
    expect(stripLaunchParams("")).toBe("");
    expect(stripLaunchParams("?code=abc234&ref=ecran")).toBe("ref=ecran");
  });
});

describe("code d'invitation", () => {
  it("normalise un code en majuscules sans espaces", () => {
    expect(readInviteCode("?code=abc234")).toBe("ABC234");
    expect(readInviteCode("?code=%20ab-c2%2034%20")).toBe("ABC234");
  });

  it("refuse un code absent, trop court ou trop long", () => {
    expect(readInviteCode("")).toBeNull();
    expect(readInviteCode("?code=abc")).toBeNull();
    expect(readInviteCode("?code=ABCDEFGHI")).toBeNull();
  });
});
