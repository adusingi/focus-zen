import { describe, expect, it } from "vitest";
import {
  countByDay,
  dayBounds,
  dayKey,
  dayLabel,
  dotLevel,
  finishedCountLabel,
  groupByDay,
  monthBounds,
  monthWeeks,
  weekdayLabels,
} from "./history.js";

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

describe("dayBounds", () => {
  it("covers one local day, midnight to midnight", () => {
    const [from, to] = dayBounds(new Date(2026, 10, 6, 15, 30));
    expect(from).toEqual(new Date(2026, 10, 6));
    expect(to).toEqual(new Date(2026, 10, 7));
  });
});

describe("monthBounds", () => {
  it("covers one local month, including the year turn", () => {
    expect(monthBounds(2026, 11)).toEqual([new Date(2026, 11, 1), new Date(2027, 0, 1)]);
  });
});

describe("monthWeeks", () => {
  it("starts on Monday and pads the edges with null", () => {
    // November 2026 starts on a Sunday and has 30 days.
    const weeks = monthWeeks(2026, 10);
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0][6]).toEqual(new Date(2026, 10, 1));
    expect(weeks[5][0]).toEqual(new Date(2026, 10, 30));
    expect(weeks[5].slice(1)).toEqual([null, null, null, null, null, null]);
  });

  it("needs no padding when the month starts on Monday", () => {
    // February 2027 starts on a Monday and has 28 days.
    const weeks = monthWeeks(2027, 1);
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0]).toEqual(new Date(2027, 1, 1));
    expect(weeks.flat().includes(null)).toBe(false);
  });
});

describe("countByDay", () => {
  it("counts by local day", () => {
    const counts = countByDay([
      task("a", at(2026, 11, 5, 23, 59)),
      task("b", at(2026, 11, 6, 0, 1)),
      task("c", at(2026, 11, 6, 9)),
    ]);
    expect(Object.fromEntries(counts)).toEqual({ "2026-11-05": 1, "2026-11-06": 2 });
  });
});

describe("dotLevel", () => {
  it("steps up with the number of finished items", () => {
    expect([0, 1, 2, 3, 4, 6, 7, 30].map(dotLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe("weekdayLabels", () => {
  it("lists seven days, Monday first", () => {
    const labels = weekdayLabels("en-GB");
    expect(labels).toHaveLength(7);
    expect(labels[0]).toBe("M");
    expect(labels[6]).toBe("S");
  });
});
