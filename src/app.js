import { createRepository } from "./lib/repository.js";

const page = document.querySelector("#page");
const taskList = document.querySelector("#tasks");
const draft = document.querySelector("#draft");
const announcer = document.querySelector("#announcer");

let repository;
let tasks = [];

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function cleanText(element) {
  return element.textContent.replace(/\s+/g, " ").trim();
}

function focusDraft() {
  draft.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(draft);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function reportSaveError(error) {
  console.error(error);
  announcer.textContent = "The item could not be saved";
}

function makeTaskElement(task) {
  const item = document.createElement("li");
  const checkboxLabel = document.createElement("label");
  const checkbox = document.createElement("input");
  const box = document.createElement("span");
  const text = document.createElement("div");
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

  checkbox.addEventListener("change", () => finishTask(task.id, item, checkbox));

  text.addEventListener("focus", () => {
    previousText = task.text;
  });

  text.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      text.blur();
      focusDraft();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      task.text = previousText;
      text.textContent = previousText;
      text.blur();
    }
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
  item.append(checkboxLabel, text);
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
    tasks.splice(index, 1);
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
  if (event.key !== "Enter") return;

  event.preventDefault();
  commitDraft();
  focusDraft();
});

draft.addEventListener("blur", commitDraft);

page.addEventListener("click", (event) => {
  if (event.target === page) focusDraft();
});

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

