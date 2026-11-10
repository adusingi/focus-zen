/**
 * How long an open item has been on the list, in the short form the list
 * shows at the end of each line: "now", "12m", "5h", "3d".
 */

const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

export function ageLabel(createdAt, now = new Date()) {
  const elapsed = Math.max(0, now.getTime() - new Date(createdAt).getTime());

  if (elapsed < minute) return "now";
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m`;
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h`;
  return `${Math.floor(elapsed / day)}d`;
}

/** The same age in words, for screen readers: "added 3 days ago". */
export function ageDescription(createdAt, now = new Date()) {
  const label = ageLabel(createdAt, now);
  if (label === "now") return "added just now";

  const count = Number.parseInt(label, 10);
  const unit = { m: "minute", h: "hour", d: "day" }[label.at(-1)];
  return `added ${count} ${unit}${count === 1 ? "" : "s"} ago`;
}
