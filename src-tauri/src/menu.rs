//! macOS app menu: the default Tauri menu, plus "Settings…" (⌘,) in the app menu
//! and "History…" (⌘Y) at the top of the Window menu.
//!
//! Other platforms keep no menu bar, so the main window looks the same there.

use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Wry};

use crate::actions;

/// Right after "About Focus Zen" and its separator, where macOS apps put it.
const SETTINGS_POSITION: usize = 2;

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let menu = Menu::default(app)?;
    let items = menu.items()?;

    let settings = MenuItem::with_id(
        app,
        actions::SETTINGS,
        "Settings…",
        true,
        Some("CmdOrCtrl+,"),
    )?;
    let history = MenuItem::with_id(app, actions::HISTORY, "History…", true, Some("CmdOrCtrl+Y"))?;

    let app_menu = match items.first() {
        Some(MenuItemKind::Submenu(app_menu)) => Some(app_menu),
        _ => None,
    };

    if let Some(app_menu) = app_menu {
        let separator = PredefinedMenuItem::separator(app)?;
        app_menu.insert_items(&[&settings, &separator], SETTINGS_POSITION)?;
    }

    match (submenu_named(&items, "Window"), app_menu) {
        (Some(window_menu), _) => {
            let separator = PredefinedMenuItem::separator(app)?;
            window_menu.insert_items(&[&history, &separator], 0)?;
        }
        // No Window menu: keep History reachable, under Settings.
        (None, Some(app_menu)) => app_menu.insert(&history, SETTINGS_POSITION + 1)?,
        (None, None) => {}
    }

    app.set_menu(menu)?;
    Ok(())
}

fn submenu_named<'a>(items: &'a [MenuItemKind<Wry>], name: &str) -> Option<&'a Submenu<Wry>> {
    items.iter().find_map(|item| match item {
        MenuItemKind::Submenu(submenu) if submenu.text().is_ok_and(|text| text == name) => {
            Some(submenu)
        }
        _ => None,
    })
}
