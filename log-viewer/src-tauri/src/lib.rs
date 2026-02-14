mod models;
mod storage;
mod loader;
mod search;
mod commands;

use std::sync::Arc;
use commands::AppState;
use storage::Database;
use loader::FileLoader;
use search::SearchEngine;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("log-viewer");

    let db = Arc::new(Database::new(app_data_dir).expect("Failed to init database"));
    let loader = Arc::new(FileLoader::new(db.clone()));
    let search_engine = Arc::new(SearchEngine::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            loader,
            search_engine,
            db,
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::build_index,
            commands::get_index_status,
            commands::read_lines,
            commands::search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
