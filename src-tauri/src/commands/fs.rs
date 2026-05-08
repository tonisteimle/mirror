use serde::Serialize;
use std::path::Path;
use tauri::State;

use crate::state::AppState;

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub is_dir: bool,
}

#[derive(Serialize)]
pub struct DirListing {
    pub path: String,
    pub files: Vec<DirEntry>,
}

#[derive(Serialize)]
pub struct FileInfo {
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub is_file: bool,
}

#[tauri::command]
pub async fn read_file(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let resolved = state.guard_path(&path)?;
    tokio::fs::read_to_string(&resolved)
        .await
        .map_err(|e| format!("read_file({path}): {e}"))
}

#[tauri::command]
pub async fn write_file(
    path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let resolved = state.guard_path(&path)?;
    if let Some(parent) = resolved.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("create parent dirs: {e}"))?;
    }
    tokio::fs::write(&resolved, content)
        .await
        .map_err(|e| format!("write_file({path}): {e}"))
}

#[tauri::command]
pub async fn list_directory(
    path: String,
    state: State<'_, AppState>,
) -> Result<DirListing, String> {
    let resolved = state.guard_path(&path)?;
    let mut rd = tokio::fs::read_dir(&resolved)
        .await
        .map_err(|e| format!("list_directory({path}): {e}"))?;

    let mut files = Vec::new();
    while let Some(entry) = rd
        .next_entry()
        .await
        .map_err(|e| format!("read entry: {e}"))?
    {
        let ft = entry
            .file_type()
            .await
            .map_err(|e| format!("file_type: {e}"))?;
        let name = entry.file_name().to_string_lossy().into_owned();
        files.push(DirEntry {
            name,
            is_dir: ft.is_dir(),
        });
    }

    Ok(DirListing { path, files })
}

#[tauri::command]
pub async fn create_directory(
    path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let resolved = state.guard_path(&path)?;
    tokio::fs::create_dir_all(&resolved)
        .await
        .map_err(|e| format!("create_directory({path}): {e}"))
}

#[tauri::command]
pub async fn delete_path(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let resolved = state.guard_path(&path)?;
    let metadata = tokio::fs::metadata(&resolved)
        .await
        .map_err(|e| format!("delete_path metadata({path}): {e}"))?;
    if metadata.is_dir() {
        tokio::fs::remove_dir_all(&resolved)
            .await
            .map_err(|e| format!("delete_path remove_dir_all({path}): {e}"))
    } else {
        tokio::fs::remove_file(&resolved)
            .await
            .map_err(|e| format!("delete_path remove_file({path}): {e}"))
    }
}

#[tauri::command]
pub async fn rename_path(
    from: String,
    to: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let from_resolved = state.guard_path(&from)?;
    let to_resolved = state.guard_path(&to)?;
    if let Some(parent) = to_resolved.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("create parent dirs: {e}"))?;
    }
    tokio::fs::rename(&from_resolved, &to_resolved)
        .await
        .map_err(|e| format!("rename_path({from} -> {to}): {e}"))
}

#[tauri::command]
pub async fn path_exists(path: String, state: State<'_, AppState>) -> Result<bool, String> {
    // For exists() we don't strictly need the sandbox guard — but checking
    // membership of arbitrary fs paths is also a leak vector. Stay strict.
    let Ok(resolved) = state.guard_path(&path) else {
        return Ok(false);
    };
    Ok(Path::new(&resolved).exists())
}

#[tauri::command]
pub async fn get_file_info(
    path: String,
    state: State<'_, AppState>,
) -> Result<FileInfo, String> {
    let resolved = state.guard_path(&path)?;
    let metadata = tokio::fs::metadata(&resolved)
        .await
        .map_err(|e| format!("get_file_info({path}): {e}"))?;
    Ok(FileInfo {
        path,
        size: metadata.len(),
        is_dir: metadata.is_dir(),
        is_file: metadata.is_file(),
    })
}
