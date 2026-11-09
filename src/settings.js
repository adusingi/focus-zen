import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./lib/repository.js";

const databasePath = document.querySelector("#database-path");
const revealButton = document.querySelector("#database-reveal");
const status = document.querySelector("#status");

function fileManagerName() {
  const agent = navigator.userAgent;
  if (agent.includes("Mac")) return "Finder";
  if (agent.includes("Windows")) return "File Explorer";
  return "file manager";
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

void showDatabase();
