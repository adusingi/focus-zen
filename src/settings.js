import { invoke } from "@tauri-apps/api/core";
import {
  dateTimeLabel,
  dayLabel,
  finishedCountLabel,
  groupByDay,
  timeLabel,
} from "./lib/history.js";
import { createRepository, isTauri } from "./lib/repository.js";

const history = document.querySelector("#history");
const historyEmpty = document.querySelector("#history-empty");
const historyTotal = document.querySelector("#history-total");
const databasePath = document.querySelector("#database-path");
const revealButton = document.querySelector("#database-reveal");
const status = document.querySelector("#status");

let repository;

function fileManagerName() {
  const agent = navigator.userAgent;
  if (agent.includes("Mac")) return "Finder";
  if (agent.includes("Windows")) return "File Explorer";
  return "file manager";
}

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

function renderDay(day) {
  const section = document.createElement("section");
  const title = document.createElement("h2");
  const label = document.createElement("span");
  const count = document.createElement("span");
  const list = document.createElement("ul");

  section.className = "day";
  section.dataset.day = day.key;
  title.className = "day-title";
  label.textContent = dayLabel(day.date);
  count.className = "day-count";
  count.textContent = finishedCountLabel(day.items.length);
  list.className = "done-list";
  list.append(...day.items.map(renderItem));

  title.append(label, count);
  section.append(title, list);
  return section;
}

async function refreshHistory() {
  try {
    const finished = await repository.loadFinished();
    history.replaceChildren(...groupByDay(finished).map(renderDay));
    historyEmpty.hidden = finished.length > 0;
    historyTotal.textContent = finished.length ? finishedCountLabel(finished.length) : "";
  } catch (error) {
    console.error(error);
    status.textContent = "The history could not be loaded";
  }
}

function showDatabaseNote(text) {
  databasePath.className = "database-note";
  databasePath.textContent = text;
}

async function showDatabase() {
  if (!isTauri()) {
    showDatabaseNote("This browser preview keeps items in localStorage.");
    return;
  }

  try {
    databasePath.textContent = await invoke("database_location");
    revealButton.textContent = `Show in ${fileManagerName()}`;
    revealButton.hidden = false;
  } catch (error) {
    console.error(error);
    showDatabaseNote("The database location is not available.");
  }
}

revealButton.addEventListener("click", async () => {
  try {
    await invoke("reveal_database");
  } catch (error) {
    console.error(error);
    status.textContent = "The database file could not be shown";
  }
});

async function start() {
  try {
    repository = await createRepository();
  } catch (error) {
    console.error(error);
    status.textContent = "The database could not be opened";
    return;
  }

  repository.onChange(refreshHistory);
  // "Today" and "Yesterday" move at midnight; recheck when the window comes back.
  window.addEventListener("focus", refreshHistory);

  await Promise.all([refreshHistory(), showDatabase()]);
}

void start();
