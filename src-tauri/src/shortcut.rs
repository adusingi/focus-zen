//! ⌥Space from any app opens the list with the cursor on the empty line, and
//! closes it again when it is in front. The shortcut is system-wide.

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::windows;

/// Shown next to "Open Focus Zen" in the menu bar icon's menu.
pub const ACCELERATOR: &str = "Alt+Space";

fn capture() -> Shortcut {
    Shortcut::new(Some(Modifiers::ALT), Code::Space)
}

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    app.plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, shortcut, event| {
                if *shortcut == capture() && event.state() == ShortcutState::Pressed {
                    windows::toggle_main(app);
                }
            })
            .build(),
    )?;

    // Another app may own ⌥Space already. The list still opens from the menu
    // bar icon, so this is not a reason to stop.
    if let Err(error) = app.global_shortcut().register(capture()) {
        eprintln!("could not register ⌥Space: {error}");
    }

    Ok(())
}
