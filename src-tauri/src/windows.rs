//! Window lifecycle: closing the list keeps the app running in the menu bar.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent};

const MAIN: &str = "main";
const SETTINGS: &str = "settings";

pub fn show_main(app: &AppHandle) {
    reveal(app, MAIN);
}

pub fn show_settings(app: &AppHandle) {
    if app.get_webview_window(SETTINGS).is_none() {
        let built =
            WebviewWindowBuilder::new(app, SETTINGS, WebviewUrl::App("settings.html".into()))
                .title("Settings")
                .inner_size(540.0, 620.0)
                .min_inner_size(380.0, 320.0)
                .center()
                .build();

        if let Err(error) = built {
            eprintln!("could not open the Settings window: {error}");
            return;
        }
    }

    reveal(app, SETTINGS);
}

pub fn on_window_event(window: &Window, event: &WindowEvent) {
    match event {
        WindowEvent::CloseRequested { api, .. } if window.label() == MAIN => {
            api.prevent_close();
            let _ = window.hide();
            update_dock(window.app_handle(), window.label());
        }
        WindowEvent::Destroyed => update_dock(window.app_handle(), window.label()),
        _ => {}
    }
}

fn reveal(app: &AppHandle, label: &str) {
    set_dock_visible(app, true);

    if let Some(window) = app.get_webview_window(label) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Show the Dock icon only while a window is on screen. `closing` is the
/// window that is going away, which may still report itself as visible.
fn update_dock(app: &AppHandle, closing: &str) {
    let any_visible = app
        .webview_windows()
        .values()
        .filter(|window| window.label() != closing)
        .any(|window| window.is_visible().unwrap_or(false));

    set_dock_visible(app, any_visible);
}

#[cfg(target_os = "macos")]
fn set_dock_visible(app: &AppHandle, visible: bool) {
    if let Err(error) = app.set_dock_visibility(visible) {
        eprintln!("could not change Dock visibility: {error}");
    }
}

#[cfg(not(target_os = "macos"))]
fn set_dock_visible(_app: &AppHandle, _visible: bool) {}
