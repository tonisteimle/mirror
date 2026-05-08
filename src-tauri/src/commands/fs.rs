use serde::Serialize;
use std::path::Path;
use tauri::State;

use crate::state::AppState;

/// Hard cap on file size (read + write). Mirror sources are KB-scale; even
/// the biggest realistic projects don't approach this. The limit exists to
/// keep a malicious or buggy WebView from blocking the Tokio runtime with
/// a multi-GB read/write — `tokio::fs::read_to_string` would happily
/// allocate the whole file into a single String.
///
/// 16 MiB is ~3 orders of magnitude above any real Mirror file. Bump if
/// a legitimate use case appears (and add a test to pin the new value).
pub const MAX_FILE_BYTES: u64 = 16 * 1024 * 1024;

/// Pure boundary check — extracted so tests can exercise it without
/// constructing a full Tauri runtime. `op` is `"read"` or `"write"` for
/// the error message; the real commands pass their own labels.
fn check_size(op: &str, path: &str, size: u64) -> Result<(), String> {
    if size > MAX_FILE_BYTES {
        Err(format!(
            "{op}_file({path}): {size} bytes exceeds {MAX_FILE_BYTES}-byte limit"
        ))
    } else {
        Ok(())
    }
}

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

#[tauri::command]
pub async fn read_file(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let resolved = state.guard_path(&path)?;
    let metadata = tokio::fs::metadata(&resolved)
        .await
        .map_err(|e| format!("read_file metadata({path}): {e}"))?;
    check_size("read", &path, metadata.len())?;
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
    check_size("write", &path, content.len() as u64)?;
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

// `get_file_info` removed — was exposed via the bridge but never called
// from studio code. If a real consumer appears, restore via git history
// and add an integration test that pins the actual call site.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn check_size_accepts_values_at_or_below_limit() {
        assert!(check_size("read", "tiny.mir", 0).is_ok());
        assert!(check_size("read", "small.mir", 1024).is_ok());
        assert!(check_size("write", "exact.mir", MAX_FILE_BYTES).is_ok());
    }

    #[test]
    fn check_size_rejects_one_byte_over_limit() {
        // Off-by-one matters here — exactly the limit must be allowed,
        // exactly one byte more must fail.
        let err = check_size("read", "boundary.mir", MAX_FILE_BYTES + 1).unwrap_err();
        assert!(err.contains("exceeds"), "got: {err}");
        assert!(err.contains("16777217"), "got: {err}");
    }

    #[test]
    fn check_size_rejects_obvious_dos_payload() {
        let err = check_size("write", "huge.bin", 5 * 1024 * 1024 * 1024).unwrap_err();
        assert!(err.contains("write_file(huge.bin)"), "got: {err}");
        assert!(err.contains("5368709120"), "got: {err}");
    }

    #[test]
    fn check_size_labels_op_correctly() {
        let read_err = check_size("read", "x", MAX_FILE_BYTES + 1).unwrap_err();
        assert!(read_err.starts_with("read_file"), "got: {read_err}");
        let write_err = check_size("write", "x", MAX_FILE_BYTES + 1).unwrap_err();
        assert!(write_err.starts_with("write_file"), "got: {write_err}");
    }
}
