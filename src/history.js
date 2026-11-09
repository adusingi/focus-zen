import {
  countByDay,
  dateTimeLabel,
  dayBounds,
  dayKey,
  dayLabel,
  dotLevel,
  finishedCountLabel,
  fullDateLabel,
  groupByDay,
  monthBounds,
  monthLabel,
  monthWeeks,
  timeLabel,
  weekdayLabels,
} from "./lib/history.js";
import { createRepository } from "./lib/repository.js";

const search = document.querySelector("#search");
const monthTitle = document.querySelector("#month-title");
const prevMonth = document.querySelector("#prev-month");
const nextMonth = document.querySelector("#next-month");
const weekdays = document.querySelector("#weekdays");
const grid = document.querySelector("#month-grid");
const monthTotal = document.querySelector("#month-total");
const todayButton = document.querySelector("#today");
const dayTitle = document.querySelector("#day-title");
const dayCount = document.querySelector("#day-count");
const dayItems = document.querySelector("#day-items");
const dayEmpty = document.querySelector("#day-empty");
const status = document.querySelector("#status");

let repository;
// The month on screen, the selected day, and the finished items of that month.
let view = { year: 0, month: 0 };
let selected = new Date();
let monthItems = [];
let searchTimer;

const iso = (date) => date.toISOString();
const sameDay = (a, b) => dayKey(a) === dayKey(b);
const isFutureMonth = (year, month, now = new Date()) =>
  year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

function renderItem(task) {
  const item = document.createElement("li");
  const box = document.createElement("span");
  const text = document.createElement("span");
  const time = document.createElement("time");

  item.className = "done";
  item.title = `Added ${dateTimeLabel(task.created_at)} · Finished ${dateTimeLabel(task.completed_at)}`;
  box.className = "box";
  box.setAttribute("aria-hidden", "true");
  text.className = "done-text";
  text.textContent = task.text;
  time.className = "done-time";
  time.dateTime = task.completed_at;
  time.textContent = timeLabel(task.completed_at);

  item.append(box, text, time);
  return item;
}

function renderList(tasks) {
  const list = document.createElement("ul");
  list.className = "done-list";
  list.append(...tasks.map(renderItem));
  return list;
}

/** The calendar: one button per day, its dot as bright as the day was busy. */
function renderMonth() {
  const { year, month } = view;
  const counts = countByDay(monthItems);
  const now = new Date();

  monthTitle.textContent = monthLabel(year, month);
  monthTotal.textContent = monthItems.length ? `${finishedCountLabel(monthItems.length)} this month` : "";
  nextMonth.disabled = isFutureMonth(year, month + 1);
  todayButton.hidden = year === now.getFullYear() && month === now.getMonth() && sameDay(selected, now);

  const cells = monthWeeks(year, month).flat().map((date) => {
    if (!date) return Object.assign(document.createElement("span"), { className: "day-cell is-blank" });

    const count = counts.get(dayKey(date)) ?? 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.dataset.key = dayKey(date);
    button.dataset.level = String(dotLevel(count));
    button.disabled = date > now;
    button.classList.toggle("is-today", sameDay(date, now));
    button.setAttribute("aria-pressed", String(sameDay(date, selected) && !search.value.trim()));
    button.setAttribute("aria-label", `${fullDateLabel(date)}, ${finishedCountLabel(count)}`);
    button.innerHTML = `<span class="day-number">${date.getDate()}</span><span class="day-dot"></span>`;
    button.addEventListener("click", () => selectDay(date));
    return button;
  });

  grid.replaceChildren(...cells);
}

function showDay(tasks) {
  dayTitle.textContent = dayLabel(selected);
  dayCount.textContent = tasks.length ? finishedCountLabel(tasks.length) : "";
  dayItems.replaceChildren(...(tasks.length ? [renderList(tasks)] : []));
  dayEmpty.hidden = tasks.length > 0;
  dayEmpty.textContent = sameDay(selected, new Date())
    ? "Nothing finished yet today."
    : "Nothing finished on this day.";
}

async function renderDay() {
  const inView = selected.getFullYear() === view.year && selected.getMonth() === view.month;
  if (inView) {
    showDay(monthItems.filter((task) => dayKey(new Date(task.completed_at)) === dayKey(selected)));
    return;
  }
  const [from, to] = dayBounds(selected);
  showDay(await repository.loadFinishedBetween(iso(from), iso(to)));
}

/** Search results replace the day, grouped by the day they were finished. */
async function renderSearch(query) {
  const results = await repository.searchFinished(query);
  dayTitle.textContent = `“${query}”`;
  dayCount.textContent = results.length === 1 ? "1 result" : `${results.length} results`;
  dayEmpty.hidden = results.length > 0;
  dayEmpty.textContent = "No finished item matches.";

  const days = groupByDay(results).map((day) => {
    const section = document.createElement("section");
    const title = document.createElement("h3");
    section.className = "result-day";
    title.className = "result-day-title";
    title.textContent = dayLabel(day.date);
    section.append(title, renderList(day.items));
    return section;
  });
  dayItems.replaceChildren(...days);
}

async function loadMonth() {
  const [from, to] = monthBounds(view.year, view.month);
  monthItems = await repository.loadFinishedBetween(iso(from), iso(to));
}

async function refresh() {
  try {
    await loadMonth();
    renderMonth();
    const query = search.value.trim();
    await (query ? renderSearch(query) : renderDay());
  } catch (error) {
    console.error(error);
    status.textContent = "The history could not be loaded";
  }
}

function selectDay(date) {
  selected = date;
  search.value = "";
  view = { year: date.getFullYear(), month: date.getMonth() };
  void refresh();
}

function moveMonth(step) {
  const next = new Date(view.year, view.month + step, 1);
  if (isFutureMonth(next.getFullYear(), next.getMonth())) return;
  view = { year: next.getFullYear(), month: next.getMonth() };
  void refresh();
}

/** Arrow keys move the selected day (←/→ one day, ↑/↓ one week), across months too. */
grid.addEventListener("keydown", (event) => {
  const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  if (!(event.key in steps)) return;
  event.preventDefault();

  const next = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + steps[event.key]);
  if (next > new Date()) return;
  selectDay(next);
  requestAnimationFrame(() => grid.querySelector(`[data-key="${dayKey(next)}"]`)?.focus());
});

search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void refresh(), 150);
});

search.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && search.value) {
    event.preventDefault();
    search.value = "";
    void refresh();
  }
});

// ⌘F (Ctrl+F elsewhere) jumps to the search field.
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
    event.preventDefault();
    search.focus();
    search.select();
  }
});

prevMonth.addEventListener("click", () => moveMonth(-1));
nextMonth.addEventListener("click", () => moveMonth(1));
todayButton.addEventListener("click", () => selectDay(new Date()));

async function start() {
  try {
    repository = await createRepository();
  } catch (error) {
    console.error(error);
    status.textContent = "The database could not be opened";
    return;
  }

  weekdays.replaceChildren(
    ...weekdayLabels().map((label) => Object.assign(document.createElement("span"), { textContent: label })),
  );
  view = { year: selected.getFullYear(), month: selected.getMonth() };

  repository.onChange(refresh);
  // "Today" moves at midnight; recheck when the window comes back.
  window.addEventListener("focus", refresh);
  await refresh();
}

void start();
