mod actions;
mod database;
#[cfg(target_os = "macos")]
mod menu;
mod tray;
mod windows;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(database::plugin())
        .invoke_handler(tauri::generate_handler![
            database::database_location,
            database::reveal_database
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            menu::install(app.handle())?;
            tray::install(app.handle())?;
            Ok(())
        })
        .on_menu_event(|app, event| actions::run(app, event.id().as_ref()))
        .on_window_event(windows::on_window_event)
        .build(tauri::generate_context!())
        .expect("error while building Focus Zen");

    app.run(|app, event| {
        // Clicking the Dock icon, or opening the app again from Finder while it
        // runs in the menu bar, brings the list back.
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            windows::show_main(app);
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (app, event);
    });
}
