import { ageDescription, ageLabel } from "./lib/age.js";
import { caretOnFirstLine, caretOnLastLine, placeCaretAtEnd } from "./lib/caret.js";
import { dateTimeLabel } from "./lib/history.js";
import { hideList, onListOpened } from "./lib/list-window.js";
import { createRepository } from "./lib/repository.js";

const page = document.querySelector("#page");
const taskList = document.querySelector("#tasks");
const draft = document.querySelector("#draft");
const announcer = document.querySelector("#announcer");

const ageRefreshInterval = 60 * 1000;

let repository;
let tasks = [];

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function cleanText(element) {
  return element.textContent.replace(/\s+/g, " ").trim();
}

function focusDraft() {
  placeCaretAtEnd(draft);
}

function reportSaveError(error) {
  console.error(error);
  announcer.textContent = "The item could not be saved";
}

/** Every line the caret can be on, top to bottom: the open items, then the empty line. */
function lines() {
  return [...taskList.querySelectorAll(".task:not(.is-leaving) .task-text"), draft];
}

/** Put the caret on the line `step` lines away from `from`. Returns false at the top or bottom. */
function moveCaret(from, step) {
  const all = lines();
  const target = all[all.indexOf(from) + step];
  if (!target) return false;

  placeCaretAtEnd(target);
  return true;
}

/** ↑ and ↓ between lines, shared by the items and the empty line. */
function handleArrowKeys(event, field) {
  if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;

  if (event.key === "ArrowUp" && caretOnFirstLine(field) && moveCaret(field, -1)) {
    event.preventDefault();
  }

  if (event.key === "ArrowDown" && caretOnLastLine(field) && moveCaret(field, 1)) {
    event.preventDefault();
  }
}

function setAge(age, task, now = new Date()) {
  age.textContent = ageLabel(task.created_at, now);
  age.setAttribute("aria-label", ageDescription(task.created_at, now));
}

function refreshAges() {
  const now = new Date();
  for (const age of taskList.querySelectorAll(".task-age")) {
    const task = tasks.find((candidate) => candidate.id === age.dataset.id);
    if (task) setAge(age, task, now);
  }
}

function makeTaskElement(task) {
  const item = document.createElement("li");
  const checkboxLabel = document.createElement("label");
  const checkbox = document.createElement("input");
  const box = document.createElement("span");
  const text = document.createElement("div");
  const age = document.createElement("time");
  let previousText = task.text;

  item.className = "task";
  item.dataset.id = task.id;
  checkboxLabel.className = "checkbox";
  checkbox.type = "checkbox";
  checkbox.setAttribute("aria-label", `Finish ${task.text}`);
  box.className = "box";
  box.setAttribute("aria-hidden", "true");
  text.className = "task-text";
  text.contentEditable = "plaintext-only";
  text.setAttribute("role", "textbox");
  text.setAttribute("aria-label", `Edit ${task.text}`);
  text.spellcheck = true;
  text.textContent = task.text;
  age.className = "task-age";
  age.dataset.id = task.id;
  age.dateTime = task.created_at;
  age.title = `Added ${dateTimeLabel(task.created_at)}`;
  setAge(age, task);

  checkbox.addEventListener("change", () => finishTask(task.id, item, checkbox));

  // ⌘Enter finishes the item, from its text or its checkbox.
  item.addEventListener("keydown", (event) => {
    if (event.isComposing || event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;

    event.preventDefault();
    event.stopPropagation();
    if (checkbox.disabled) return;

    // Stay where you are in the list: the item below takes this place, or the
    // item above when this was the last one. Only an empty list sends the
    // caret to the empty line.
    const items = lines().filter((line) => line !== draft);
    const index = items.indexOf(text);
    placeCaretAtEnd(items[index + 1] ?? items[index - 1] ?? draft);
    checkbox.checked = true;
    void finishTask(task.id, item, checkbox);
  });

  text.addEventListener("focus", () => {
    previousText = task.text;
  });

  text.addEventListener("keydown", (event) => {
    if (event.isComposing) return;

    // ⌘Enter is for the item as a whole; see above.
    if (event.key === "Enter" && !(event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      focusDraft();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      task.text = previousText;
      text.textContent = previousText;
      focusDraft();
    }

    handleArrowKeys(event, text);
  });

  text.addEventListener("blur", async () => {
    const nextText = cleanText(text);
    if (!nextText) {
      task.text = previousText;
      text.textContent = previousText;
      return;
    }

    if (nextText === previousText) return;

    try {
      await repository.update(task.id, nextText);
      task.text = nextText;
      text.textContent = nextText;
      checkbox.setAttribute("aria-label", `Finish ${nextText}`);
      text.setAttribute("aria-label", `Edit ${nextText}`);
    } catch (error) {
      task.text = previousText;
      text.textContent = previousText;
      reportSaveError(error);
    }
  });

  checkboxLabel.append(checkbox, box);
  item.append(checkboxLabel, text, age);
  return item;
}

function renderTasks() {
  taskList.replaceChildren(...tasks.map(makeTaskElement));
}

async function addTask(text) {
  const task = {
    id: createId(),
    text,
    created_at: new Date().toISOString(),
    completed_at: null,
  };

  tasks.push(task);
  const item = makeTaskElement(task);
  taskList.append(item);
  announcer.textContent = `${text} added`;

  try {
    await repository.add(task);
  } catch (error) {
    tasks = tasks.filter((candidate) => candidate.id !== task.id);
    item.remove();
    reportSaveError(error);
  }
}

function commitDraft() {
  const text = cleanText(draft);
  if (!text) return;

  draft.replaceChildren();
  void addTask(text);
}

async function finishTask(id, item, checkbox) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return;

  checkbox.disabled = true;
  const task = tasks[index];

  try {
    await repository.finish(id, new Date().toISOString());
    tasks = tasks.filter((candidate) => candidate.id !== id);
    item.classList.add("is-leaving");
    announcer.textContent = `${task.text} finished`;
    window.setTimeout(() => item.remove(), 180);
  } catch (error) {
    checkbox.checked = false;
    checkbox.disabled = false;
    reportSaveError(error);
  }
}

draft.addEventListener("keydown", (event) => {
  if (event.isComposing) return;

  if (event.key === "Enter") {
    event.preventDefault();
    commitDraft();
    focusDraft();
  }

  // Esc saves what you typed, then hides the list.
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    commitDraft();
    hideList();
  }

  handleArrowKeys(event, draft);
});

draft.addEventListener("blur", commitDraft);

// Esc with no line in focus (for example on a checkbox) also hides the list.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !event.isComposing) hideList();
});

page.addEventListener("click", (event) => {
  if (event.target === page) focusDraft();
});

onListOpened(focusDraft);
window.setInterval(refreshAges, ageRefreshInterval);
window.addEventListener("focus", refreshAges);

async function start() {
  try {
    repository = await createRepository();
    tasks = await repository.loadOpen();
    renderTasks();
  } catch (error) {
    reportSaveError(error);
  } finally {
    focusDraft();
  }
}

void start();
