use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

use crate::state::AppState;

#[tauri::command]
pub fn open_project(
    path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let canonical = PathBuf::from(&path)
        .canonicalize()
        .map_err(|e| format!("open_project canonicalize({path}): {e}"))?;

    if !canonical.is_dir() {
        return Err(format!("not a directory: {path}"));
    }

    state.set_base_path(canonical.clone());
    state.push_recent(canonical);

    if let Ok(dir) = app.path().app_data_dir() {
        if let Err(e) = state.persist_recents(&dir) {
            eprintln!("persist_recents: {e}");
        }
    }
    Ok(())
}

#[tauri::command]
pub fn create_project(name: String, path: String) -> Result<String, String> {
    let parent = PathBuf::from(&path);
    if !parent.is_dir() {
        return Err(format!("parent directory does not exist: {path}"));
    }

    let project_dir = parent.join(&name);
    std::fs::create_dir_all(&project_dir)
        .map_err(|e| format!("create_project dir: {e}"))?;

    let index = project_dir.join("index.mir");
    let body = format!("// {name}\n\ncanvas mobile, bg #1a1a1a\n\nText \"Hello, {name}\", col white\n");
    std::fs::write(&index, body).map_err(|e| format!("create_project index.mir: {e}"))?;

    Ok(project_dir.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn get_recent_projects(state: State<'_, AppState>) -> Vec<String> {
    state
        .recents()
        .into_iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect()
}
