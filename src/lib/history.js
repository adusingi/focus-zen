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
