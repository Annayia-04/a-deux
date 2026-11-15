export type BuilderSlot = "activity" | "food" | "movie";

export type BuilderItem = {
  slot: BuilderSlot;
  label: string;
  emoji: string;
  title: string;
};

const EVENT_MINUTES = 150;

/** Prochain samedi à 19 h 30, au moins une semaine plus tard si on est samedi. */
export function nextSaturday(from: Date = new Date()): Date {
  const date = new Date(from);
  date.setHours(19, 30, 0, 0);
  const day = date.getDay();
  let delta = (6 - day + 7) % 7;
  if (delta === 0) delta = 7;
  date.setDate(date.getDate() + delta);
  return date;
}

export function formatBuilderDate(date: Date): string {
  const day = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · 19 h 30`;
}

export function icsStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function icsEscape(value: string): string {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildTicketText(date: Date, items: BuilderItem[]): string {
  return [
    `Notre soirée À deux — ${formatBuilderDate(date)}`,
    ...items.map((item) => `${item.emoji} ${item.title}`),
    "Préparé avec À deux.",
  ].join("\n");
}

/** Fichier iCalendar universel, sur le prochain samedi à 19 h 30. */
export function buildIcs(date: Date, items: BuilderItem[]): string {
  const end = new Date(date.getTime() + EVENT_MINUTES * 60 * 1000);
  const description = [
    "Soirée composée avec À deux.",
    ...items.map((item) => `${item.label} : ${item.title}`),
  ].join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//A deux//Date Builder//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${date.getTime()}@a-deux`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(date)}`,
    `DTEND:${icsStamp(end)}`,
    "SUMMARY:Notre soirée À deux",
    `DESCRIPTION:${icsEscape(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
