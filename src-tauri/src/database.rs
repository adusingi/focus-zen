//! The local SQLite database: migrations, and where the file lives.

use std::path::PathBuf;

use tauri::plugin::TauriPlugin;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_sql::{Migration, MigrationKind, PluginConfig};

/// Must match `databaseUrl` in `src/lib/repository.js`.
const URL: &str = "sqlite:focus-zen.db";

pub fn plugin<R: Runtime>() -> TauriPlugin<R, Option<PluginConfig>> {
    let migrations = vec![Migration {
        version: 1,
        description: "create_todos_table",
        sql: include_str!("../migrations/0001_create_todos.sql"),
        kind: MigrationKind::Up,
    }];

    tauri_plugin_sql::Builder::default()
        .add_migrations(URL, migrations)
        .build()
}

/// The SQL plugin resolves a relative SQLite path against the app config folder.
fn file_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let file_name = file_name(URL);
    app.path()
        .app_config_dir()
        .map(|dir| dir.join(file_name))
        .map_err(|error| error.to_string())
}

fn file_name(url: &str) -> &str {
    url.strip_prefix("sqlite:").unwrap_or(url)
}

#[tauri::command]
pub fn database_location(app: AppHandle) -> Result<String, String> {
    file_path(&app).map(|path| path.display().to_string())
}

#[tauri::command]
pub fn reveal_database(app: AppHandle) -> Result<(), String> {
    let path = file_path(&app)?;
    tauri_plugin_opener::reveal_item_in_dir(path).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_name_drops_the_sqlite_scheme() {
        assert_eq!(file_name(URL), "focus-zen.db");
        assert_eq!(file_name("focus-zen.db"), "focus-zen.db");
    }
}
