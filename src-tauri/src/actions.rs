//! Commands shared by the menu bar icon and the macOS app menu.

use tauri::AppHandle;

use crate::windows;

pub const SHOW: &str = "show";
pub const HISTORY: &str = "history";
pub const SETTINGS: &str = "settings";
pub const QUIT: &str = "quit";

pub fn run(app: &AppHandle, id: &str) {
    match id {
        SHOW => windows::show_main(app),
        HISTORY => windows::show_history(app),
        SETTINGS => windows::show_settings(app),
        QUIT => app.exit(0),
        _ => {}
    }
}
