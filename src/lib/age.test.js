import { describe, expect, it } from "vitest";
import { ageDescription, ageLabel } from "./age.js";

const now = new Date("2026-11-10T12:00:00Z");
const ago = (milliseconds) => new Date(now.getTime() - milliseconds).toISOString();

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;

describe("ageLabel", () => {
  it.each([
    [0, "now"],
    [59 * second, "now"],
    [minute, "1m"],
    [59 * minute + 59 * second, "59m"],
    [hour, "1h"],
    [23 * hour + 59 * minute, "23h"],
    [day, "1d"],
    [45 * day + 3 * hour, "45d"],
  ])("shows %i ms as %s", (elapsed, label) => {
    expect(ageLabel(ago(elapsed), now)).toBe(label);
  });

  it("shows a timestamp from the future (clock change) as now", () => {
    expect(ageLabel(ago(-5 * minute), now)).toBe("now");
  });
});

describe("ageDescription", () => {
  it.each([
    [10 * second, "added just now"],
    [minute, "added 1 minute ago"],
    [12 * minute, "added 12 minutes ago"],
    [hour, "added 1 hour ago"],
    [5 * hour, "added 5 hours ago"],
    [day, "added 1 day ago"],
    [3 * day, "added 3 days ago"],
  ])("describes %i ms as %s", (elapsed, description) => {
    expect(ageDescription(ago(elapsed), now)).toBe(description);
  });
});
