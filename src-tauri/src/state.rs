use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const RECENTS_FILE: &str = "recents.json";
const RECENTS_MAX: usize = 10;

#[derive(Default)]
pub struct AppState {
    base_path: Mutex<Option<PathBuf>>,
    recents: Mutex<Vec<PathBuf>>,
}

#[derive(Serialize, Deserialize, Default)]
struct RecentsFile {
    paths: Vec<PathBuf>,
}

impl AppState {
    pub fn set_base_path(&self, path: PathBuf) {
        *self.base_path.lock().unwrap() = Some(path);
    }

    pub fn base_path(&self) -> Option<PathBuf> {
        self.base_path.lock().unwrap().clone()
    }

    /// Verify that `target` resolves to a path inside the currently-open
    /// project. Prevents the WebView from reaching outside the project
    /// folder via crafted relative paths.
    ///
    /// Both sides are canonicalized so symlink games don't bypass the
    /// check. If the target doesn't yet exist (write into a not-yet-
    /// created file), we canonicalize the parent directory instead.
    pub fn guard_path(&self, target: &str) -> Result<PathBuf, String> {
        let base = self
            .base_path()
            .ok_or_else(|| "no project open".to_string())?;
        let base_canon = base
            .canonicalize()
            .map_err(|e| format!("base path canonicalize: {e}"))?;

        let target_path = Path::new(target);
        let probe = if target_path.exists() {
            target_path.canonicalize().map_err(|e| format!("path canonicalize: {e}"))?
        } else if let Some(parent) = target_path.parent() {
            let parent_canon = parent
                .canonicalize()
                .map_err(|e| format!("parent canonicalize: {e}"))?;
            parent_canon.join(target_path.file_name().unwrap_or_default())
        } else {
            return Err("invalid target path".into());
        };

        if !probe.starts_with(&base_canon) {
            return Err(format!("path outside project: {target}"));
        }
        Ok(probe)
    }

    pub fn push_recent(&self, path: PathBuf) {
        let mut recents = self.recents.lock().unwrap();
        recents.retain(|p| p != &path);
        recents.insert(0, path);
        recents.truncate(RECENTS_MAX);
    }

    pub fn recents(&self) -> Vec<PathBuf> {
        self.recents.lock().unwrap().clone()
    }

    pub fn load_recents(&self, app_data_dir: &Path) {
        let file = app_data_dir.join(RECENTS_FILE);
        let Ok(text) = std::fs::read_to_string(&file) else { return };
        let Ok(parsed) = serde_json::from_str::<RecentsFile>(&text) else { return };
        // Drop entries whose folders no longer exist on disk.
        let valid: Vec<PathBuf> = parsed.paths.into_iter().filter(|p| p.exists()).collect();
        *self.recents.lock().unwrap() = valid;
    }

    pub fn persist_recents(&self, app_data_dir: &Path) -> Result<(), String> {
        std::fs::create_dir_all(app_data_dir)
            .map_err(|e| format!("create app_data_dir: {e}"))?;
        let file = app_data_dir.join(RECENTS_FILE);
        let body = RecentsFile { paths: self.recents() };
        let json = serde_json::to_string_pretty(&body)
            .map_err(|e| format!("serialize recents: {e}"))?;
        std::fs::write(&file, json).map_err(|e| format!("write recents: {e}"))
    }
}

// ============================================================================
// Tests
// ============================================================================
//
// `guard_path` is the only thing standing between the Tauri WebView and the
// rest of the user's filesystem. Anything that sneaks past it could read
// `/etc/passwd`, write to `~/.ssh/authorized_keys`, etc. So: hammer it.

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn open_state(base: &Path) -> AppState {
        let state = AppState::default();
        // The real `open_project` command canonicalizes; mirror that here so
        // the test setup matches production code paths.
        state.set_base_path(base.canonicalize().unwrap());
        state
    }

    #[test]
    fn rejects_when_no_project_open() {
        let state = AppState::default();
        let err = state.guard_path("/tmp/anything").unwrap_err();
        assert!(err.contains("no project open"), "got: {err}");
    }

    #[test]
    fn accepts_existing_path_inside_base() {
        let dir = tempdir().unwrap();
        let inner = dir.path().join("foo.mir");
        fs::write(&inner, "Text \"hi\"").unwrap();

        let state = open_state(dir.path());
        let resolved = state.guard_path(inner.to_str().unwrap()).unwrap();

        assert!(resolved.starts_with(dir.path().canonicalize().unwrap()));
        assert_eq!(resolved.file_name().unwrap(), "foo.mir");
    }

    #[test]
    fn rejects_existing_path_outside_base() {
        let base = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let outside_file = outside.path().join("secret.txt");
        fs::write(&outside_file, "shh").unwrap();

        let state = open_state(base.path());
        let err = state.guard_path(outside_file.to_str().unwrap()).unwrap_err();
        assert!(err.contains("outside project"), "got: {err}");
    }

    #[test]
    fn rejects_dotdot_traversal() {
        let parent = tempdir().unwrap();
        let project = parent.path().join("project");
        fs::create_dir(&project).unwrap();
        let sibling = parent.path().join("sibling.txt");
        fs::write(&sibling, "leak").unwrap();

        let state = open_state(&project);
        // `<project>/../sibling.txt` resolves outside the project after
        // canonicalize — must be rejected even though the path "looks like"
        // it starts inside the project.
        let traversal = project.join("..").join("sibling.txt");
        let err = state.guard_path(traversal.to_str().unwrap()).unwrap_err();
        assert!(err.contains("outside project"), "got: {err}");
    }

    #[test]
    fn accepts_nonexistent_file_inside_base_for_write() {
        // Writing a not-yet-created file inside the project is the
        // common "save new file" path. guard_path must accept it via
        // the parent-canonicalize fallback.
        let dir = tempdir().unwrap();
        let new_file = dir.path().join("new.mir");
        assert!(!new_file.exists());

        let state = open_state(dir.path());
        let resolved = state.guard_path(new_file.to_str().unwrap()).unwrap();
        assert_eq!(resolved.file_name().unwrap(), "new.mir");
    }

    #[test]
    fn rejects_nonexistent_file_outside_base() {
        let base = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let phantom = outside.path().join("not-yet.txt");

        let state = open_state(base.path());
        let err = state.guard_path(phantom.to_str().unwrap()).unwrap_err();
        // Either canonicalize-the-parent succeeds and we hit the
        // `outside project` branch, or it fails outright. Both are fine
        // — what matters is we DON'T silently accept.
        assert!(
            err.contains("outside project") || err.contains("canonicalize"),
            "got: {err}"
        );
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlink_pointing_outside_base() {
        use std::os::unix::fs as unix_fs;

        let base = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let secret = outside.path().join("secret.txt");
        fs::write(&secret, "leak").unwrap();

        // Symlink lives inside the project but resolves outside via
        // canonicalize. This is the classic sandbox escape.
        let link = base.path().join("escape");
        unix_fs::symlink(&secret, &link).unwrap();

        let state = open_state(base.path());
        let err = state.guard_path(link.to_str().unwrap()).unwrap_err();
        assert!(err.contains("outside project"), "got: {err}");
    }

    #[test]
    fn recents_pushes_unique_and_caps_at_max() {
        let state = AppState::default();
        for i in 0..(RECENTS_MAX + 5) {
            state.push_recent(PathBuf::from(format!("/tmp/p{i}")));
        }
        let recents = state.recents();
        assert_eq!(recents.len(), RECENTS_MAX);
        // Most recently pushed is first.
        assert_eq!(
            recents[0],
            PathBuf::from(format!("/tmp/p{}", RECENTS_MAX + 4))
        );
    }

    #[test]
    fn recents_dedupes_when_pushing_same_path_twice() {
        let state = AppState::default();
        state.push_recent(PathBuf::from("/tmp/a"));
        state.push_recent(PathBuf::from("/tmp/b"));
        state.push_recent(PathBuf::from("/tmp/a")); // Re-push moves to front.

        let recents = state.recents();
        assert_eq!(recents.len(), 2);
        assert_eq!(recents[0], PathBuf::from("/tmp/a"));
        assert_eq!(recents[1], PathBuf::from("/tmp/b"));
    }

    #[test]
    fn recents_load_drops_missing_paths() {
        let dir = tempdir().unwrap();
        let real = dir.path().join("real-project");
        fs::create_dir(&real).unwrap();

        let payload = serde_json::json!({
            "paths": [real.to_str().unwrap(), "/tmp/does-not-exist-xyz-9999"]
        });
        fs::write(dir.path().join(RECENTS_FILE), payload.to_string()).unwrap();

        let state = AppState::default();
        state.load_recents(dir.path());

        let recents = state.recents();
        assert_eq!(recents.len(), 1);
        assert_eq!(recents[0], real);
    }

    #[test]
    fn recents_persist_and_load_roundtrip() {
        let dir = tempdir().unwrap();
        let project = dir.path().join("project");
        fs::create_dir(&project).unwrap();

        let state = AppState::default();
        state.push_recent(project.clone());
        state.persist_recents(dir.path()).unwrap();

        let reloaded = AppState::default();
        reloaded.load_recents(dir.path());
        assert_eq!(reloaded.recents(), vec![project]);
    }
}
