//! macOS app menu: the default Tauri menu, plus "Settings…" (⌘,).
//!
//! Other platforms keep no menu bar, so the main window looks the same there.

use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem};
use tauri::AppHandle;

use crate::actions;

/// Right after "About Focus Zen" and its separator, where macOS apps put it.
const SETTINGS_POSITION: usize = 2;

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let menu = Menu::default(app)?;

    if let Some(MenuItemKind::Submenu(app_menu)) = menu.items()?.into_iter().next() {
        let settings = MenuItem::with_id(
            app,
            actions::SETTINGS,
            "Settings…",
            true,
            Some("CmdOrCtrl+,"),
        )?;
        let separator = PredefinedMenuItem::separator(app)?;
        app_menu.insert_items(&[&settings, &separator], SETTINGS_POSITION)?;
    }

    app.set_menu(menu)?;
    Ok(())
}
