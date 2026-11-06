import { describe, expect, it } from "vitest";
import { dayKey, dayLabel, finishedCountLabel, groupByDay } from "./history.js";

// Build timestamps from local wall-clock times, so the tests pass in any time zone.
const at = (year, month, day, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).toISOString();

const task = (id, completedAt) => ({ id, text: id, created_at: at(2026, 1, 1), completed_at: completedAt });

describe("groupByDay", () => {
  it("groups by the local day an item was finished, newest day first", () => {
    const days = groupByDay([
      task("a", at(2026, 11, 4, 9)),
      task("b", at(2026, 11, 6, 8)),
      task("c", at(2026, 11, 6, 17)),
      task("d", at(2026, 11, 5, 23, 59)),
    ]);

    expect(days.map((day) => day.key)).toEqual(["2026-11-06", "2026-11-05", "2026-11-04"]);
    expect(days[0].items.map((item) => item.id)).toEqual(["c", "b"]);
  });

  it("splits items on each side of local midnight", () => {
    const days = groupByDay([task("late", at(2026, 11, 5, 23, 59)), task("early", at(2026, 11, 6, 0, 1))]);

    expect(days.map((day) => [day.key, day.items.map((item) => item.id)])).toEqual([
      ["2026-11-06", ["early"]],
      ["2026-11-05", ["late"]],
    ]);
  });

  it("returns no days for no items", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("dayKey", () => {
  it("pads month and day", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("dayLabel", () => {
  const now = new Date(2026, 10, 6, 10, 30);

  it("names today and yesterday", () => {
    expect(dayLabel(new Date(2026, 10, 6, 0, 0), now)).toBe("Today");
    expect(dayLabel(new Date(2026, 10, 5, 23, 59), now)).toBe("Yesterday");
  });

  it("knows yesterday across a month boundary", () => {
    expect(dayLabel(new Date(2026, 9, 31, 20), new Date(2026, 10, 1, 8))).toBe("Yesterday");
  });

  // Check the parts, not the punctuation: ICU versions differ on commas.
  it("writes older days in full, with the year only for other years", () => {
    const thisYear = dayLabel(new Date(2026, 10, 2), now, "en-GB");
    expect(thisYear).toMatch(/Monday/);
    expect(thisYear).toMatch(/\b2 November\b/);
    expect(thisYear).not.toMatch(/2026/);

    const lastYear = dayLabel(new Date(2025, 11, 31), now, "en-GB");
    expect(lastYear).toMatch(/Wednesday/);
    expect(lastYear).toMatch(/\b31 December 2025\b/);
  });
});

describe("finishedCountLabel", () => {
  it("counts finished items", () => {
    expect(finishedCountLabel(1)).toBe("1 finished");
    expect(finishedCountLabel(12)).toBe("12 finished");
  });
});
