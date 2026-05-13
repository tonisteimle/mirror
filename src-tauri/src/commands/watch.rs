// File watcher for external edits.
//
// When the user edits a project file with a tool outside Mirror Studio
// (vim, VS Code, git checkout, etc.), the in-app editor would otherwise
// silently overwrite those changes on next save. This watcher emits a
// `file:changed` event on the main window for every relevant change;
// the studio bridge picks them up and refreshes the file (or surfaces
// a conflict toast).
//
// Self-writes are filtered: `mark_self_write(path)` registers a path
// as "we just wrote this, ignore the upcoming event for ~500ms". This
// avoids an infinite reload-loop where the studio's own writes echo
// back as external changes.

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, FileIdMap};
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};

use crate::state::AppState;

const DEBOUNCE_MS: u64 = 100;
const SELF_WRITE_GRACE_MS: u128 = 500;

/// Per-project watcher state. Shared via Arc<Mutex<_>> because the
/// debounce callback runs on a worker thread distinct from Tauri's.
pub struct WatcherHandle {
    /// Active debouncer — dropping it stops the underlying threads.
    _debouncer: Debouncer<RecommendedWatcher, FileIdMap>,
}

/// Path → (timestamp ms since unix epoch) of recent self-writes. Inserted
/// from `commands::fs::write_file`, consumed in the debounce callback.
pub type SelfWriteMap = Arc<Mutex<HashMap<PathBuf, Instant>>>;

#[derive(Serialize, Clone, Debug)]
pub struct FileChangeEvent {
    /// Absolute path of the changed file.
    pub path: String,
    /// Path relative to the project root (forward-slash separated).
    pub relative: String,
    /// One of: `created`, `modified`, `removed`.
    pub kind: String,
}

/// Mark a path as just-written so the watcher's next event for it is
/// suppressed. Called from `commands::fs::write_file` before the actual
/// `tokio::fs::write` call.
pub fn mark_self_write(map: &SelfWriteMap, path: &Path) {
    if let Ok(mut guard) = map.lock() {
        guard.insert(path.to_path_buf(), Instant::now());
    }
}

/// Returns true if the path was registered as a self-write less than
/// SELF_WRITE_GRACE_MS ago. Consumes the entry on match.
fn is_self_write(map: &SelfWriteMap, path: &Path) -> bool {
    let Ok(mut guard) = map.lock() else { return false };
    let Some(when) = guard.get(path).copied() else { return false };
    if when.elapsed().as_millis() <= SELF_WRITE_GRACE_MS {
        guard.remove(path);
        return true;
    }
    // Expired — clean up so the map doesn't grow.
    guard.remove(path);
    false
}

#[tauri::command]
pub async fn start_watching(
    path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Re-use guard_path so the WebView can't ask us to watch an arbitrary
    // folder outside the project — defence in depth, the watcher itself
    // would happily monitor anything.
    let root = state.guard_path(&path)?;
    if !root.is_dir() {
        return Err(format!("start_watching: not a directory: {path}"));
    }

    let self_writes = state.self_writes();
    let root_clone = root.clone();
    let app_clone = app.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(DEBOUNCE_MS),
        None,
        move |result: DebounceEventResult| {
            let events = match result {
                Ok(events) => events,
                Err(errors) => {
                    for e in errors {
                        eprintln!("file-watcher error: {e}");
                    }
                    return;
                }
            };
            for event in events {
                for path in &event.paths {
                    if is_self_write(&self_writes, path) {
                        continue;
                    }
                    // Compute relative path; skip events outside the root
                    // (notify can occasionally surface ancestor changes
                    // when the root itself is the source).
                    let Ok(rel) = path.strip_prefix(&root_clone) else { continue };
                    let relative = rel.to_string_lossy().replace('\\', "/");
                    let kind = classify_event(&event.event.kind);
                    let payload = FileChangeEvent {
                        path: path.to_string_lossy().into_owned(),
                        relative,
                        kind: kind.to_string(),
                    };
                    if let Err(e) = app_clone.emit("file:changed", payload) {
                        eprintln!("emit file:changed failed: {e}");
                    }
                }
            }
        },
    )
    .map_err(|e| format!("start_watching: create debouncer: {e}"))?;

    debouncer
        .watcher()
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| format!("start_watching: watch {}: {e}", root.display()))?;

    state.set_watcher(WatcherHandle {
        _debouncer: debouncer,
    });
    Ok(())
}

#[tauri::command]
pub fn stop_watching(state: State<'_, AppState>) -> Result<(), String> {
    state.clear_watcher();
    Ok(())
}

fn classify_event(kind: &notify::EventKind) -> &'static str {
    use notify::EventKind;
    match kind {
        EventKind::Create(_) => "created",
        EventKind::Modify(_) => "modified",
        EventKind::Remove(_) => "removed",
        _ => "modified",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;

    #[test]
    fn mark_self_write_then_is_self_write_within_grace() {
        let map: SelfWriteMap = Arc::new(Mutex::new(HashMap::new()));
        let p = PathBuf::from("/tmp/x");
        mark_self_write(&map, &p);
        assert!(is_self_write(&map, &p));
    }

    #[test]
    fn is_self_write_consumes_on_match() {
        let map: SelfWriteMap = Arc::new(Mutex::new(HashMap::new()));
        let p = PathBuf::from("/tmp/x");
        mark_self_write(&map, &p);
        assert!(is_self_write(&map, &p));
        // Second call: entry was consumed.
        assert!(!is_self_write(&map, &p));
    }

    #[test]
    fn is_self_write_false_for_unknown_path() {
        let map: SelfWriteMap = Arc::new(Mutex::new(HashMap::new()));
        let p = PathBuf::from("/tmp/never-marked");
        assert!(!is_self_write(&map, &p));
    }

    #[test]
    fn is_self_write_expires_after_grace() {
        let map: SelfWriteMap = Arc::new(Mutex::new(HashMap::new()));
        let p = PathBuf::from("/tmp/x");
        mark_self_write(&map, &p);
        sleep(Duration::from_millis((SELF_WRITE_GRACE_MS as u64) + 50));
        assert!(!is_self_write(&map, &p));
    }
}
