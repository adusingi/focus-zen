/**
 * The list window's link to the Rust side: hide the window, and hear when
 * the window was opened (from ⌥Space, the menu bar icon, or the Dock) so the
 * cursor can go to the empty line. In the plain browser preview both do
 * nothing.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isTauri } from "./repository.js";

/** Must match `OPENED_EVENT` in `src-tauri/src/windows.rs`. */
const openedEvent = "list-opened";

/** Hide the list and give the keyboard back to the app that was in front before. */
export function hideList() {
  if (!isTauri()) return;
  invoke("hide_list").catch(console.error);
}

export function onListOpened(callback) {
  if (!isTauri()) return;
  listen(openedEvent, () => callback()).catch(console.error);
}
