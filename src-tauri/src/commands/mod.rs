use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use crate::loader::FileLoader;
use crate::search::{SearchEngine, SearchOptions, MatchResult};
use crate::models::{FileMeta, IndexStatus, FileIndex};
use crate::storage::Database;

pub struct AppState {
    pub loader: Arc<FileLoader>,
    pub search_engine: Arc<SearchEngine>,
    pub db: Arc<Database>,
}

#[tauri::command]
pub async fn open_file(
    path: String,
    state: State<'_, AppState>,
) -> Result<FileMeta, String> {
    let path = PathBuf::from(&path);
    state.loader.get_file_meta(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn build_index(
    path: String,
    state: State<'_, AppState>,
) -> Result<FileIndex, String> {
    let path = PathBuf::from(&path);
    state.loader.build_index(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_index_status(
    path: String,
    state: State<'_, AppState>,
) -> Result<IndexStatus, String> {
    state.db.get_index_status(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_lines(
    path: String,
    start: u64,
    count: u64,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&path);
    state.loader.read_lines(&path, start, count)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search(
    path: String,
    options: SearchOptions,
    state: State<'_, AppState>,
) -> Result<Vec<MatchResult>, String> {
    let path = PathBuf::from(&path);
    state.search_engine.search(&path, &options)
        .map_err(|e| e.to_string())
}
