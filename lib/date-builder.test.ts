import { describe, expect, it } from "vitest";
import {
  buildIcs,
  buildTicketText,
  formatBuilderDate,
  nextSaturday,
  type BuilderItem,
} from "@/lib/date-builder";

const items: BuilderItem[] = [
  { slot: "activity", label: "Activité", emoji: "✨", title: "Bataille de paintball" },
  { slot: "food", label: "Food", emoji: "🍕", title: "Pizza, maison; test" },
];

describe("Date Builder", () => {
  it("place la soirée au prochain samedi à 19 h 30", () => {
    const monday = new Date(2026, 10, 16, 10, 0, 0);
    const date = nextSaturday(monday);
    expect(date.getDay()).toBe(6);
    expect(date.getDate()).toBe(21);
    expect(date.getHours()).toBe(19);
    expect(date.getMinutes()).toBe(30);

    const saturday = new Date(2026, 10, 21, 12, 0, 0);
    expect(nextSaturday(saturday).getDate()).toBe(28);
  });

  it("formate la date du ticket en français", () => {
    const label = formatBuilderDate(new Date(2026, 10, 21, 19, 30));
    expect(label).toContain("Samedi");
    expect(label).toContain("21");
    expect(label).toContain("novembre");
    expect(label).toContain("19 h 30");
  });

  it("génère un ticket lisible", () => {
    const text = buildTicketText(new Date(2026, 10, 21, 19, 30), items);
    expect(text).toContain("Notre soirée À deux");
    expect(text).toContain("✨ Bataille de paintball");
    expect(text).toContain("🍕 Pizza, maison; test");
  });

  it("génère un fichier iCalendar valide sur 2 h 30", () => {
    const ics = buildIcs(new Date(2026, 10, 21, 19, 30), items);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20261121T193000");
    expect(ics).toContain("DTEND:20261121T220000");
    expect(ics).toContain("SUMMARY:Notre soirée À deux");
    expect(ics).toContain("Activité : Bataille de paintball");
    expect(ics).toContain("Food : Pizza\\, maison\\; test");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });
});
