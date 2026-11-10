//! Window lifecycle: closing the list keeps the app running in the menu bar.

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent};

const MAIN: &str = "main";
/// Tells the list that it was opened, so it puts the cursor on the empty line.
/// Must match `openedEvent` in `src/lib/list-window.js`.
const OPENED_EVENT: &str = "list-opened";
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
    if let Err(error) = app.emit_to(MAIN, OPENED_EVENT, ()) {
        eprintln!("could not tell the list it was opened: {error}");
    }
}

/// Hide the list, and give the keyboard back to the app that was in front
/// before, so a quick capture ends where it started.
pub fn hide_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN) {
        let _ = window.hide();
    }

    let any_visible = any_visible_except(app, MAIN);
    set_dock_visible(app, any_visible);
    if !any_visible {
        hide_app(app);
    }
}

/// ⌥Space: open the list, or hide it when it is already in front.
pub fn toggle_main(app: &AppHandle) {
    let in_front = app.get_webview_window(MAIN).is_some_and(|window| {
        window.is_visible().unwrap_or(false) && window.is_focused().unwrap_or(false)
    });

    if in_front {
        hide_main(app);
    } else {
        show_main(app);
    }
}

/// Esc in the list.
#[tauri::command]
pub fn hide_list(app: AppHandle) {
    hide_main(&app);
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
            hide_main(window.app_handle());
        }
        WindowEvent::Destroyed => {
            let app = window.app_handle();
            set_dock_visible(app, any_visible_except(app, window.label()));
        }
        _ => {}
    }
}

fn reveal(app: &AppHandle, label: &str) {
    set_dock_visible(app, true);
    show_app(app);

    if let Some(window) = app.get_webview_window(label) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Whether a window other than `closing` is on screen. `closing` is the
/// window that is going away, which may still report itself as visible.
/// The Dock icon shows only while a window is on screen.
fn any_visible_except(app: &AppHandle, closing: &str) -> bool {
    app.webview_windows()
        .values()
        .filter(|window| window.label() != closing)
        .any(|window| window.is_visible().unwrap_or(false))
}

/// Hiding the whole app makes macOS activate the app that was in front before.
#[cfg(target_os = "macos")]
fn hide_app(app: &AppHandle) {
    if let Err(error) = app.hide() {
        eprintln!("could not hide Focus Zen: {error}");
    }
}

#[cfg(not(target_os = "macos"))]
fn hide_app(_app: &AppHandle) {}

/// Undo `hide_app`, or the window would stay hidden after `show`.
#[cfg(target_os = "macos")]
fn show_app(app: &AppHandle) {
    if let Err(error) = app.show() {
        eprintln!("could not show Focus Zen: {error}");
    }
}

#[cfg(not(target_os = "macos"))]
fn show_app(_app: &AppHandle) {}

#[cfg(target_os = "macos")]
fn set_dock_visible(app: &AppHandle, visible: bool) {
    if let Err(error) = app.set_dock_visibility(visible) {
        eprintln!("could not change Dock visibility: {error}");
    }
}

#[cfg(not(target_os = "macos"))]
fn set_dock_visible(_app: &AppHandle, _visible: bool) {}
