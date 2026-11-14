import { describe, expect, it } from "vitest";
import { readLaunchAction, stripLaunchParams } from "@/lib/launch-action";

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
  });
});
