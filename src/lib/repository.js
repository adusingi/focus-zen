import { emit, listen } from "@tauri-apps/api/event";
import Database from "@tauri-apps/plugin-sql";

/** Must match `URL` in `src-tauri/src/database.rs`. */
const databaseUrl = "sqlite:focus-zen.db";
const changeEvent = "todos-changed";
const browserStorageKey = "focus-zen-todos-v2";
const legacyStorageKey = "focus-zen-follow-ups-v1";

const columns = "id, text, created_at, completed_at";
const searchLimit = 200;

export function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

function byCompletedNewestFirst(a, b) {
  return b.completed_at.localeCompare(a.completed_at) || b.id.localeCompare(a.id);
}

/** A LIKE pattern that matches `query` anywhere, with % _ and \\ taken literally. */
function containsPattern(query) {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Fallback for the plain browser preview (`pnpm dev`): items live in localStorage. */
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

    /** Items finished in [from, to), newest first. `from` and `to` are ISO strings. */
    async loadFinishedBetween(from, to) {
      return readAll()
        .filter((task) => task.completed_at && task.completed_at >= from && task.completed_at < to)
        .sort(byCompletedNewestFirst);
    },

    /** Finished items whose text contains `query` (any case), newest first. */
    async searchFinished(query) {
      const needle = query.toLowerCase();
      return readAll()
        .filter((task) => task.completed_at && task.text.toLowerCase().includes(needle))
        .sort(byCompletedNewestFirst)
        .slice(0, searchLimit);
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

    /** Other tabs get a `storage` event when the list changes. */
    onChange(callback) {
      const handler = (event) => {
        if (event.key === browserStorageKey) callback();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}

async function createTauriRepository() {
  const database = await Database.load(databaseUrl);

  /** Every write tells the other windows (Settings) that the list changed. */
  async function write(query, values) {
    await database.execute(query, values);
    emit(changeEvent).catch(console.error);
  }

  return {
    async loadOpen() {
      return database.select(
        `SELECT ${columns} FROM todos WHERE completed_at IS NULL ORDER BY created_at ASC, id ASC`,
      );
    },

    /** Items finished in [from, to), newest first. ISO strings compare in time order. */
    async loadFinishedBetween(from, to) {
      return database.select(
        `SELECT ${columns} FROM todos WHERE completed_at >= $1 AND completed_at < $2 ORDER BY completed_at DESC, id DESC`,
        [from, to],
      );
    },

    /** Finished items whose text contains `query` (LIKE is case-insensitive for ASCII), newest first. */
    async searchFinished(query) {
      return database.select(
        `SELECT ${columns} FROM todos WHERE completed_at IS NOT NULL AND text LIKE $1 ESCAPE '\\' ORDER BY completed_at DESC, id DESC LIMIT $2`,
        [containsPattern(query), searchLimit],
      );
    },

    async add(task) {
      await write(
        "INSERT INTO todos (id, text, created_at, completed_at) VALUES ($1, $2, $3, NULL)",
        [task.id, task.text, task.created_at],
      );
    },

    async update(id, text) {
      await write("UPDATE todos SET text = $1 WHERE id = $2", [text, id]);
    },

    async finish(id, completedAt) {
      await write("UPDATE todos SET completed_at = $1 WHERE id = $2", [completedAt, id]);
    },

    onChange(callback) {
      const stop = listen(changeEvent, () => callback());
      return () => {
        stop.then((unlisten) => unlisten()).catch(console.error);
      };
    },
  };
}

export async function createRepository() {
  return isTauri() ? createTauriRepository() : createBrowserRepository();
}
