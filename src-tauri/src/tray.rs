//! The menu bar icon (system tray on Windows and Linux).

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::AppHandle;

use crate::{actions, shortcut};

/// Monochrome template image: macOS tints it to match the menu bar.
const ICON: &[u8] = include_bytes!("../icons/tray-template.png");

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(
                app,
                actions::SHOW,
                "Open Focus Zen",
                true,
                Some(shortcut::ACCELERATOR),
            )?,
            &MenuItem::with_id(app, actions::HISTORY, "History…", true, None::<&str>)?,
            &MenuItem::with_id(app, actions::SETTINGS, "Settings…", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, actions::QUIT, "Quit Focus Zen", true, None::<&str>)?,
        ],
    )?;

    TrayIconBuilder::with_id("main")
        .icon(Image::from_bytes(ICON)?)
        .icon_as_template(true)
        .tooltip("Focus Zen")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .build(app)?;

    Ok(())
}
