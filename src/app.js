import Database from "@tauri-apps/plugin-sql";

const databaseUrl = "sqlite:focus-zen.db";
const browserStorageKey = "focus-zen-todos-v2";
const legacyStorageKey = "focus-zen-follow-ups-v1";

const page = document.querySelector("#page");
const taskList = document.querySelector("#tasks");
const draft = document.querySelector("#draft");
const announcer = document.querySelector("#announcer");

let repository;
let tasks = [];

function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

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

function createBrowserRepository() {
  function readAll() {
    try {
      const saved = JSON.parse(localStorage.getItem(browserStorageKey));
      if (Array.isArray(saved)) return saved;

      const legacy = JSON.parse(localStorage.getItem(legacyStorageKey));
      if (!Array.isArray(legacy)) return [];

      const migratedAt = new Date().toISOString();
      const migrated = legacy.map((task) => ({
        id: task.id,
        text: task.text,
        created_at: migratedAt,
        completed_at: null,
      }));
      localStorage.setItem(browserStorageKey, JSON.stringify(migrated));
      return migrated;
    } catch {
      return [];
    }
  }

  function writeAll(records) {
    localStorage.setItem(browserStorageKey, JSON.stringify(records));
  }

  return {
    async loadOpen() {
      return readAll().filter((task) => !task.completed_at);
    },

    async add(task) {
      writeAll([...readAll(), task]);
    },

    async update(id, text) {
      writeAll(readAll().map((task) => (task.id === id ? { ...task, text } : task)));
    },

    async finish(id, completedAt) {
      writeAll(
        readAll().map((task) => (task.id === id ? { ...task, completed_at: completedAt } : task)),
      );
    },
  };
}

async function createRepository() {
  if (!isTauri()) return createBrowserRepository();

  const database = await Database.load(databaseUrl);
  return {
    async loadOpen() {
      return database.select(
        "SELECT id, text, created_at, completed_at FROM todos WHERE completed_at IS NULL ORDER BY created_at ASC, id ASC",
      );
    },

    async add(task) {
      await database.execute(
        "INSERT INTO todos (id, text, created_at, completed_at) VALUES ($1, $2, $3, NULL)",
        [task.id, task.text, task.created_at],
      );
    },

    async update(id, text) {
      await database.execute("UPDATE todos SET text = $1 WHERE id = $2", [text, id]);
    },

    async finish(id, completedAt) {
      await database.execute("UPDATE todos SET completed_at = $1 WHERE id = $2", [completedAt, id]);
    },
  };
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

