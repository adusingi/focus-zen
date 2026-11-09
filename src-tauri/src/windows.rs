//! Window lifecycle: closing the list keeps the app running in the menu bar.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent};

const MAIN: &str = "main";
const HISTORY: &str = "history";
const SETTINGS: &str = "settings";

/// A secondary window, opened on demand and shown again if it already exists.
struct Page {
    label: &'static str,
    url: &'static str,
    title: &'static str,
    size: (f64, f64),
    min_size: (f64, f64),
}

const HISTORY_PAGE: Page = Page {
    label: HISTORY,
    url: "history.html",
    title: "History",
    size: (800.0, 580.0),
    min_size: (420.0, 420.0),
};

const SETTINGS_PAGE: Page = Page {
    label: SETTINGS,
    url: "settings.html",
    title: "Settings",
    size: (520.0, 240.0),
    min_size: (380.0, 200.0),
};

pub fn show_main(app: &AppHandle) {
    reveal(app, MAIN);
}

pub fn show_history(app: &AppHandle) {
    open(app, &HISTORY_PAGE);
}

pub fn show_settings(app: &AppHandle) {
    open(app, &SETTINGS_PAGE);
}

fn open(app: &AppHandle, page: &Page) {
    if app.get_webview_window(page.label).is_none() {
        let built = WebviewWindowBuilder::new(app, page.label, WebviewUrl::App(page.url.into()))
            .title(page.title)
            .inner_size(page.size.0, page.size.1)
            .min_inner_size(page.min_size.0, page.min_size.1)
            .center()
            .build();

        if let Err(error) = built {
            eprintln!("could not open the {} window: {error}", page.title);
            return;
        }
    }

    reveal(app, page.label);
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
