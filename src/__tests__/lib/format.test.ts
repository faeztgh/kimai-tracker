import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  toKimaiLocal,
  toDatetimeLocalInput,
  secondsSince,
  durationOf,
  formatElapsed,
  formatTimer,
  formatDurationShort,
  formatClock,
  dayKey,
  dayLabel,
  isToday,
  keyOfDate,
  dayKeysBetween,
  weekdayShort,
  monthDayShort,
  incomeOf,
  formatMoney,
  toTagStrings,
  setWeekStartDay,
  startOfWeek,
  startOfMonth,
  recentRangeKimai,
} from "../../lib/format";
import type { KimaiTimesheet } from "../../api/types";

const FIXED_NOW = new Date(2024, 5, 5, 10, 0, 0); // Wed Jun 5 2024 10:00:00 local

function makeSheet(overrides: Partial<KimaiTimesheet> = {}): KimaiTimesheet {
  return {
    id: 1,
    begin: "2024-06-05T09:00:00",
    end: "2024-06-05T10:00:00",
    duration: 3600,
    description: null,
    project: 1,
    activity: 1,
    ...overrides,
  };
}

describe("toKimaiLocal", () => {
  it("formats a date as YYYY-MM-DDTHH:mm:ss", () => {
    const d = new Date(2024, 0, 15, 9, 5, 3);
    expect(toKimaiLocal(d)).toBe("2024-01-15T09:05:03");
  });

  it("pads single-digit month, day and time components", () => {
    const d = new Date(2024, 2, 5, 8, 3, 7);
    expect(toKimaiLocal(d)).toBe("2024-03-05T08:03:07");
  });

  it("handles midnight correctly", () => {
    const d = new Date(2024, 11, 31, 0, 0, 0);
    expect(toKimaiLocal(d)).toBe("2024-12-31T00:00:00");
  });
});

describe("toDatetimeLocalInput", () => {
  it("formats a date as YYYY-MM-DDTHH:mm (no seconds)", () => {
    const d = new Date(2024, 0, 15, 14, 30, 45);
    expect(toDatetimeLocalInput(d)).toBe("2024-01-15T14:30");
  });

  it("pads single-digit values", () => {
    const d = new Date(2024, 2, 5, 8, 3, 0);
    expect(toDatetimeLocalInput(d)).toBe("2024-03-05T08:03");
  });
});

describe("secondsSince", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns 0 for a future timestamp", () => {
    vi.setSystemTime(FIXED_NOW);
    const future = new Date(FIXED_NOW.getTime() + 60_000).toISOString();
    expect(secondsSince(future)).toBe(0);
  });

  it("returns elapsed seconds for a past timestamp", () => {
    vi.setSystemTime(FIXED_NOW);
    const past = new Date(FIXED_NOW.getTime() - 5_000).toISOString();
    expect(secondsSince(past)).toBe(5);
  });

  it("floors fractional seconds", () => {
    vi.setSystemTime(FIXED_NOW);
    const past = new Date(FIXED_NOW.getTime() - 1_700).toISOString();
    expect(secondsSince(past)).toBe(1);
  });
});

describe("durationOf", () => {
  it("returns duration field when present and positive", () => {
    expect(durationOf(makeSheet({ duration: 3600 }))).toBe(3600);
  });

  it("computes from begin/end when duration is null", () => {
    const d = makeSheet({
      begin: "2024-06-05T09:00:00+00:00",
      end: "2024-06-05T10:00:00+00:00",
      duration: null,
    });
    expect(durationOf(d)).toBe(3600);
  });

  it("ignores duration of 0 and computes from begin/end", () => {
    const d = makeSheet({
      begin: "2024-06-05T09:00:00+00:00",
      end: "2024-06-05T09:30:00+00:00",
      duration: 0,
    });
    expect(durationOf(d)).toBe(1800);
  });

  it("uses Date.now() when end is null (running timer)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    const beginMs = FIXED_NOW.getTime() - 1800_000;
    const d = makeSheet({
      begin: new Date(beginMs).toISOString(),
      end: null,
      duration: null,
    });
    expect(durationOf(d)).toBe(1800);
    vi.useRealTimers();
  });

  it("never returns negative values", () => {
    const d = makeSheet({
      begin: "2024-06-05T10:00:00",
      end: "2024-06-05T09:00:00",
      duration: null,
    });
    expect(durationOf(d)).toBeGreaterThanOrEqual(0);
  });
});

describe("formatElapsed", () => {
  it("returns m:ss when under 1 hour", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(59)).toBe("0:59");
    expect(formatElapsed(65)).toBe("1:05");
    expect(formatElapsed(3599)).toBe("59:59");
  });

  it("returns H:mm:ss when >= 1 hour", () => {
    expect(formatElapsed(3600)).toBe("1:00:00");
    expect(formatElapsed(3661)).toBe("1:01:01");
    expect(formatElapsed(7323)).toBe("2:02:03");
    expect(formatElapsed(36000)).toBe("10:00:00");
  });

  it("clamps negative input to 0", () => {
    expect(formatElapsed(-100)).toBe("0:00");
  });
});

describe("formatTimer", () => {
  it("always zero-pads to HH:mm:ss", () => {
    expect(formatTimer(0)).toBe("00:00:00");
    expect(formatTimer(65)).toBe("00:01:05");
    expect(formatTimer(3661)).toBe("01:01:01");
    expect(formatTimer(36061)).toBe("10:01:01");
  });
});

describe("formatDurationShort", () => {
  it("shows minutes when under 1 hour", () => {
    expect(formatDurationShort(0)).toBe("0 min");
    expect(formatDurationShort(60)).toBe("1 min");
    expect(formatDurationShort(3599)).toBe("59 min");
  });

  it("shows H:mm h when >= 1 hour", () => {
    expect(formatDurationShort(3600)).toBe("1:00 h");
    expect(formatDurationShort(5400)).toBe("1:30 h");
    expect(formatDurationShort(7323)).toBe("2:02 h");
  });
});

describe("formatClock", () => {
  it("formats an ISO string as local HH:mm", () => {
    const d = new Date(2024, 0, 15, 9, 5);
    const expected = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    expect(formatClock(d.toISOString())).toBe(expected);
  });
});

describe("dayKey", () => {
  it("extracts local YYYY-MM-DD from ISO string", () => {
    const d = new Date(2024, 5, 5, 12, 0, 0);
    expect(dayKey(d.toISOString())).toBe("2024-06-05");
  });
});

describe("keyOfDate", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(keyOfDate(new Date(2024, 0, 1))).toBe("2024-01-01");
    expect(keyOfDate(new Date(2024, 11, 31))).toBe("2024-12-31");
  });
});

describe("dayKeysBetween", () => {
  it("returns inclusive range of day keys", () => {
    const keys = dayKeysBetween(new Date(2024, 0, 1), new Date(2024, 0, 3));
    expect(keys).toEqual(["2024-01-01", "2024-01-02", "2024-01-03"]);
  });

  it("returns single key when begin equals end", () => {
    const d = new Date(2024, 5, 15);
    expect(dayKeysBetween(d, d)).toEqual(["2024-06-15"]);
  });

  it("returns empty array when begin is after end", () => {
    const keys = dayKeysBetween(new Date(2024, 0, 3), new Date(2024, 0, 1));
    expect(keys).toEqual([]);
  });
});

describe("weekdayShort", () => {
  it("returns correct short names", () => {
    expect(weekdayShort("2024-01-01")).toBe("Mon");
    expect(weekdayShort("2024-01-06")).toBe("Sat");
    expect(weekdayShort("2024-01-07")).toBe("Sun");
    expect(weekdayShort("2024-06-05")).toBe("Wed");
  });
});

describe("monthDayShort", () => {
  it("returns the numeric day of the month", () => {
    expect(monthDayShort("2024-01-01")).toBe("1");
    expect(monthDayShort("2024-01-15")).toBe("15");
    expect(monthDayShort("2024-01-31")).toBe("31");
  });
});

describe("dayLabel", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns "Today" for the current day', () => {
    vi.setSystemTime(new Date(2024, 5, 5, 10, 0, 0));
    expect(dayLabel("2024-06-05")).toBe("Today");
  });

  it('returns "Yesterday" for the previous day', () => {
    vi.setSystemTime(new Date(2024, 5, 5, 10, 0, 0));
    expect(dayLabel("2024-06-04")).toBe("Yesterday");
  });

  it("returns weekday + date for older dates", () => {
    vi.setSystemTime(new Date(2024, 5, 5, 10, 0, 0));
    // June 3 2024 was a Monday
    expect(dayLabel("2024-06-03")).toBe("Mon, Jun 3");
  });

  it("accepts ISO strings as well as date keys", () => {
    vi.setSystemTime(new Date(2024, 5, 5, 10, 0, 0));
    expect(dayLabel("2024-06-05T14:30:00")).toBe("Today");
  });
});

describe("isToday", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns true when the date matches today", () => {
    vi.setSystemTime(new Date(2024, 5, 5, 10, 0, 0));
    expect(isToday("2024-06-05T09:00:00")).toBe(true);
  });

  it("returns false for yesterday", () => {
    vi.setSystemTime(new Date(2024, 5, 5, 10, 0, 0));
    expect(isToday("2024-06-04T23:59:59")).toBe(false);
  });

  it("returns false for tomorrow", () => {
    vi.setSystemTime(new Date(2024, 5, 5, 10, 0, 0));
    expect(isToday("2024-06-06T00:00:00")).toBe(false);
  });
});

describe("startOfWeek", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns Monday when weekStart=1 and today is Wednesday", () => {
    vi.setSystemTime(new Date(2024, 5, 5, 10, 0, 0)); // Wed Jun 5
    setWeekStartDay(1);
    const sow = startOfWeek();
    expect(sow.getDay()).toBe(1); // Monday
    expect(sow.getDate()).toBe(3); // Jun 3
  });

  it("returns today when today is the start day", () => {
    vi.setSystemTime(new Date(2024, 5, 3, 10, 0, 0)); // Mon Jun 3
    setWeekStartDay(1);
    const sow = startOfWeek();
    expect(sow.getDate()).toBe(3);
  });

  it("handles Sunday start (weekStart=0)", () => {
    vi.setSystemTime(new Date(2024, 5, 5, 10, 0, 0)); // Wed Jun 5
    const sow = startOfWeek(0);
    expect(sow.getDay()).toBe(0); // Sunday
    expect(sow.getDate()).toBe(2); // Jun 2
  });
});

describe("startOfMonth", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the first day of the current month at midnight", () => {
    vi.setSystemTime(new Date(2024, 5, 15, 10, 0, 0)); // Jun 15
    const som = startOfMonth();
    expect(som.getDate()).toBe(1);
    expect(som.getMonth()).toBe(5); // June
    expect(som.getHours()).toBe(0);
  });
});

describe("recentRangeKimai", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns begin and end as Kimai-formatted strings", () => {
    vi.setSystemTime(new Date(2024, 5, 5, 12, 0, 0));
    const range = recentRangeKimai(7);
    expect(range.begin).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00$/);
    expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}T23:59:59$/);
  });

  it("begin is (days-1) days before today at midnight", () => {
    vi.setSystemTime(new Date(2024, 5, 5, 12, 0, 0));
    const range = recentRangeKimai(7);
    // Today is Jun 5, so 7-day range starts Jun 5 - 6 days = May 30
    expect(range.begin.startsWith("2024-05-30")).toBe(true);
  });
});

describe("incomeOf", () => {
  it("calculates income as hours × rate", () => {
    expect(incomeOf(3600, 100)).toBe(100);
    expect(incomeOf(1800, 100)).toBe(50);
    expect(incomeOf(7200, 50)).toBe(100);
    expect(incomeOf(0, 100)).toBe(0);
  });
});

describe("formatMoney", () => {
  it("single-char currency has no space", () => {
    const result = formatMoney(100, "€");
    expect(result.startsWith("€")).toBe(true);
    expect(result).toContain("100");
  });

  it("multi-char currency is separated with a space", () => {
    const result = formatMoney(100, "EUR");
    expect(result.startsWith("EUR ")).toBe(true);
    expect(result).toContain("100");
  });

  it("always formats two decimal places", () => {
    const result = formatMoney(50, "$");
    expect(result).toContain("50.00");
  });
});

describe("toTagStrings", () => {
  it("returns empty array for non-array inputs", () => {
    expect(toTagStrings(null)).toEqual([]);
    expect(toTagStrings(undefined)).toEqual([]);
    expect(toTagStrings("tag")).toEqual([]);
    expect(toTagStrings(42)).toEqual([]);
  });

  it("returns string values as-is", () => {
    expect(toTagStrings(["foo", "bar"])).toEqual(["foo", "bar"]);
  });

  it("extracts .name from tag objects", () => {
    expect(toTagStrings([{ name: "foo" }, { name: "bar" }])).toEqual([
      "foo",
      "bar",
    ]);
  });

  it("filters empty strings", () => {
    expect(toTagStrings(["", "valid", ""])).toEqual(["valid"]);
  });

  it("ignores non-string, non-object entries", () => {
    expect(toTagStrings([1, null, "valid"])).toEqual(["valid"]);
  });
});
