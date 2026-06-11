import type { KimaiTimesheet } from "../api/types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toKimaiLocal(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function toDatetimeLocalInput(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function secondsSince(beginIso: string): number {
  const start = new Date(beginIso).getTime();
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

export function durationOf(t: KimaiTimesheet): number {
  if (typeof t.duration === "number" && t.duration > 0) return t.duration;
  const start = new Date(t.begin).getTime();
  const end = t.end ? new Date(t.end).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function parseDuration(input: string): number | null {
  const s = input.trim();
  // H:MM:SS or H:MM
  const hms = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (hms) {
    const h = parseInt(hms[1], 10);
    const m = parseInt(hms[2], 10);
    const sec = hms[3] ? parseInt(hms[3], 10) : 0;
    if (m >= 60 || sec >= 60) return null;
    return h * 3600 + m * 60 + sec;
  }
  // "1.5h" or "1.5 h"
  const hDecimal = /^(\d+(?:\.\d+)?)\s*h$/i.exec(s);
  if (hDecimal) return Math.round(parseFloat(hDecimal[1]) * 3600);
  // "90m" or "90 min"
  const mins = /^(\d+(?:\.\d+)?)\s*m(?:in)?$/i.exec(s);
  if (mins) return Math.round(parseFloat(mins[1]) * 60);
  // plain minutes (a bare number like "90")
  const plain = /^(\d+)$/.exec(s);
  if (plain) return parseInt(plain[1], 10) * 60;
  return null;
}

export function formatDurationShort(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}:${pad(m)}h`;
  return `${m} min`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let formatLang = "en";
export function setFormatLang(lng: string): void {
  formatLang = lng;
}

export function dayLabel(isoOrKey: string): string {
  const d = new Date(isoOrKey.length <= 10 ? `${isoOrKey}T00:00:00` : isoOrKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86_400_000);
  if (diffDays === 0) return "__TODAY__";
  if (diffDays === 1) return "__YESTERDAY__";
  try {
    return new Intl.DateTimeFormat(formatLang, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(that);
  } catch {
    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${WEEKDAYS[that.getDay()]}, ${MONTHS[that.getMonth()]} ${that.getDate()}`;
  }
}

export function recentRangeKimai(days: number): { begin: string; end: string } {
  const begin = new Date();
  begin.setDate(begin.getDate() - (days - 1));
  begin.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 0);
  return { begin: toKimaiLocal(begin), end: toKimaiLocal(end) };
}

let defaultWeekStart = 1;
export function setWeekStartDay(day: number): void {
  defaultWeekStart = ((Math.trunc(day) % 7) + 7) % 7;
}

export function startOfWeek(weekStart: number = defaultWeekStart): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

export function monthRangeKimai(): { begin: string; end: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 0);
  return { begin: toKimaiLocal(startOfMonth()), end: toKimaiLocal(end) };
}

export function isToday(iso: string): boolean {
  return dayKey(iso) === dayKey(new Date().toISOString());
}

export function keyOfDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dayKeysBetween(begin: Date, end: Date): string[] {
  const out: string[] = [];
  const d = new Date(begin);
  d.setHours(0, 0, 0, 0);
  const stop = new Date(end);
  stop.setHours(0, 0, 0, 0);
  while (d.getTime() <= stop.getTime()) {
    out.push(keyOfDate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function weekdayShort(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  try {
    return new Intl.DateTimeFormat(formatLang, { weekday: "short" }).format(d);
  } catch {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  }
}

export function monthDayShort(key: string): string {
  return String(new Date(`${key}T00:00:00`).getDate());
}

export function formatDateShort(d: Date): string {
  try {
    return new Intl.DateTimeFormat(formatLang, {
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    const MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
}

export function incomeOf(seconds: number, ratePerHour: number): number {
  return (seconds / 3600) * ratePerHour;
}

export function formatMoney(amount: number, currency: string): string {
  const n = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sym = currency.trim();
  return sym.length > 1 ? `${sym} ${n}` : `${sym}${n}`;
}

export function toTagStrings(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (typeof t === "string" ? t : (t as { name?: unknown })?.name))
    .filter((t): t is string => typeof t === "string" && t.length > 0);
}
