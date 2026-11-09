/**
 * Pure helpers for the History list: group finished items by the local
 * calendar day they were finished on, and format days and times.
 */

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Local calendar day as `YYYY-MM-DD`. */
export function dayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Finished items grouped by the local day of `completed_at`, newest day
 * first and newest item first inside each day.
 */
export function groupByDay(tasks) {
  const days = new Map();

  for (const task of tasks) {
    const finished = new Date(task.completed_at);
    const key = dayKey(finished);
    if (!days.has(key)) days.set(key, { key, date: startOfDay(finished), items: [] });
    days.get(key).items.push(task);
  }

  return [...days.values()]
    .sort((a, b) => b.date - a.date)
    .map((day) => ({
      ...day,
      items: day.items.sort((a, b) => b.completed_at.localeCompare(a.completed_at)),
    }));
}

/** "Today", "Yesterday", or a full date; the year only when it is not this year. */
export function dayLabel(date, now = new Date(), locale = undefined) {
  const day = startOfDay(date).getTime();
  const today = startOfDay(now);

  if (day === today.getTime()) return "Today";
  if (day === addDays(today, -1).getTime()) return "Yesterday";

  const options = { weekday: "long", day: "numeric", month: "long" };
  if (date.getFullYear() !== now.getFullYear()) options.year = "numeric";
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function timeLabel(iso, locale = undefined) {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function dateTimeLabel(iso, locale = undefined) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function finishedCountLabel(count) {
  return `${count} finished`;
}

/** Local midnight at the start of `date`'s day and of the next day: [from, to). */
export function dayBounds(date) {
  const from = startOfDay(date);
  return [from, addDays(from, 1)];
}

/** Local midnight at the start of the month and of the next month: [from, to). */
export function monthBounds(year, month) {
  return [new Date(year, month, 1), new Date(year, month + 1, 1)];
}

/**
 * The month as calendar weeks, Monday first. Each week has 7 cells; cells
 * outside the month are null.
 */
export function monthWeeks(year, month) {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const length = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(lead).fill(null),
    ...Array.from({ length }, (_, index) => new Date(year, month, index + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  const weeks = [];
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7));
  return weeks;
}

/** Finished items per local day, keyed by `dayKey`. */
export function countByDay(tasks) {
  const counts = new Map();
  for (const task of tasks) {
    const key = dayKey(new Date(task.completed_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** How bright a day's dot is: 0 nothing, 1 one item, 2 two or three, 3 four to six, 4 seven or more. */
export function dotLevel(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

export function monthLabel(year, month, locale = undefined) {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

/** One-letter weekday names, Monday first. */
export function weekdayLabels(locale = undefined) {
  const format = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  // 2 November 2026 is a Monday.
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 10, 2 + index)));
}

/** Full date for a calendar button's accessible name, e.g. "Monday 2 November 2026". */
export function fullDateLabel(date, locale = undefined) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
