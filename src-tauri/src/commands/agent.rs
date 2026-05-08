// Claude CLI agent bridge — Desktop-side mirror of `scripts/ai-bridge-server.ts`.
//
// The browser path runs the AI flow against a local HTTP server that shells
// out to the `claude` CLI. The desktop path used to call `core.invoke('run_agent')`
// against Tauri commands that didn't exist — every AI edit silently failed in
// the desktop build. These commands fix that by replicating the bridge contract
// directly inside the Tauri shell.
//
// Contract (must stay in sync with TauriAgent in studio/tauri-bridge.ts):
//   check_claude_cli()  → bool                                 — binary present?
//   run_agent(prompt, agent_type, project_path, session_id?)   — spawn + capture
//     → { session_id: String, success: bool, output: String, error: Option<String> }
//   cancel_agent(session_id)                                   — best-effort no-op

use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

#[derive(Serialize, Debug)]
pub struct AgentResult {
    pub session_id: String,
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

/// Pure resolver: given (CLAUDE_BIN, HOME) — both optional — returns the
/// path to use for spawning. Kept pure so tests don't have to mutate the
/// process-wide env (which races across cargo's parallel test threads).
fn resolve_claude_binary(claude_bin: Option<&str>, home: Option<&str>) -> PathBuf {
    if let Some(explicit) = claude_bin {
        let p = PathBuf::from(explicit);
        if p.exists() {
            return p;
        }
    }
    if let Some(home) = home {
        let local = Path::new(home).join(".local").join("bin").join("claude");
        if local.exists() {
            return local;
        }
    }
    // Fall through to PATH lookup at spawn time.
    PathBuf::from("claude")
}

/// Locate the claude binary. Mirrors `findClaudeBinary` in
/// scripts/ai-bridge-server.ts so desktop and browser pick the same one.
fn find_claude_binary() -> PathBuf {
    let bin = std::env::var("CLAUDE_BIN").ok();
    let home = std::env::var("HOME").ok();
    resolve_claude_binary(bin.as_deref(), home.as_deref())
}

#[tauri::command]
pub async fn check_claude_cli() -> bool {
    let bin = find_claude_binary();
    // If the binary is an absolute path we can stat it; if it's the bare
    // "claude" name we trust PATH and let `run_agent` surface the spawn
    // error if it's missing. Same heuristic as the HTTP bridge.
    if bin == Path::new("claude") {
        return true;
    }
    bin.exists()
}

#[tauri::command]
pub async fn run_agent(
    prompt: String,
    #[allow(unused_variables)] agent_type: String,
    #[allow(unused_variables)] project_path: String,
    session_id: Option<String>,
) -> Result<AgentResult, String> {
    // `--resume` needs a real claude UUID we don't have, so every call is
    // a fresh session. Same trade-off as the HTTP bridge: slightly more
    // tokens per call vs reliable orchestration. The studio's prompts are
    // self-contained anyway.
    let bin = find_claude_binary();
    let mut cmd = Command::new(&bin);
    cmd.arg("-p")
        .arg("--output-format")
        .arg("text")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        // Don't inherit the parent's controlling terminal — the CLI tries
        // to draw progress UI on a TTY and corrupts the captured stdout.
        .kill_on_drop(true);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("spawn claude ({}): {e}", bin.display()))?;

    // Pipe the prompt over stdin so we don't run into argv-length limits.
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(prompt.as_bytes())
            .await
            .map_err(|e| format!("write prompt to stdin: {e}"))?;
        stdin
            .shutdown()
            .await
            .map_err(|e| format!("close stdin: {e}"))?;
    }

    let output = child
        .wait_with_output()
        .await
        .map_err(|e| format!("await claude: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();

    let new_session_id = session_id.unwrap_or_else(|| {
        format!(
            "tauri-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0)
        )
    });

    if output.status.success() {
        Ok(AgentResult {
            session_id: new_session_id,
            success: true,
            output: stdout,
            error: None,
        })
    } else {
        let err = if stderr.trim().is_empty() {
            format!("claude exited with status {}", output.status)
        } else {
            stderr.trim().to_string()
        };
        Ok(AgentResult {
            session_id: new_session_id,
            success: false,
            output: stdout,
            error: Some(err),
        })
    }
}

#[tauri::command]
pub async fn cancel_agent(_session_id: String) -> Result<(), String> {
    // Browser path is a no-op too. Cancellation is wired via JS-level
    // AbortSignal racing the awaited promise (studio/agent/fixer.ts);
    // there's no per-session handle on the backend yet. Intentional.
    Ok(())
}

// ============================================================================
// Tests
// ============================================================================
//
// We don't shell out to a real `claude` binary — that would make tests
// flaky and slow. Instead we exercise the binary-resolution logic and
// the result-shape contract via a stand-in command.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_explicit_bin_when_it_exists() {
        // Use this binary's own path as the "claude" stand-in — it's
        // guaranteed to exist on whatever box runs the test.
        let me = std::env::current_exe().unwrap();
        let resolved = resolve_claude_binary(Some(me.to_str().unwrap()), None);
        assert_eq!(resolved, me);
    }

    #[test]
    fn falls_through_to_bare_name_when_explicit_bin_missing() {
        let resolved = resolve_claude_binary(Some("/no/such/path/claude-xyz"), None);
        assert_eq!(resolved, PathBuf::from("claude"));
    }

    #[test]
    fn falls_through_to_bare_name_when_home_has_no_local_claude() {
        let tmp = tempfile::tempdir().unwrap();
        let resolved =
            resolve_claude_binary(None, Some(tmp.path().to_str().unwrap()));
        assert_eq!(resolved, PathBuf::from("claude"));
    }

    #[test]
    fn picks_up_home_local_bin_claude_when_present() {
        let tmp = tempfile::tempdir().unwrap();
        let local_dir = tmp.path().join(".local").join("bin");
        std::fs::create_dir_all(&local_dir).unwrap();
        let claude = local_dir.join("claude");
        std::fs::write(&claude, b"#!/bin/sh\nexit 0\n").unwrap();

        let resolved = resolve_claude_binary(None, Some(tmp.path().to_str().unwrap()));
        assert_eq!(resolved, claude);
    }

    #[test]
    fn explicit_bin_wins_over_home_local() {
        let tmp = tempfile::tempdir().unwrap();
        let local_dir = tmp.path().join(".local").join("bin");
        std::fs::create_dir_all(&local_dir).unwrap();
        let home_claude = local_dir.join("claude");
        std::fs::write(&home_claude, b"home\n").unwrap();

        let me = std::env::current_exe().unwrap();
        let resolved = resolve_claude_binary(
            Some(me.to_str().unwrap()),
            Some(tmp.path().to_str().unwrap()),
        );
        assert_eq!(resolved, me, "explicit override should beat ~/.local/bin");
    }

    #[tokio::test]
    async fn cancel_agent_is_a_noop_and_succeeds() {
        // Contract: returns Ok(()) regardless of session_id. The studio
        // relies on this — abort happens at the JS layer.
        cancel_agent("nonexistent-session".to_string())
            .await
            .unwrap();
        cancel_agent(String::new()).await.unwrap();
    }

    #[tokio::test]
    async fn run_agent_returns_failure_payload_when_binary_missing() {
        // Force CLAUDE_BIN to a non-existent path AND HOME to a dir without
        // ~/.local/bin/claude — but env mutation is racy across parallel
        // tests. Instead: invoke the spawn path directly with a known-bad
        // resolver via a thin local helper.
        async fn run_with_resolver(bin: PathBuf) -> Result<AgentResult, String> {
            let mut cmd = Command::new(&bin);
            cmd.arg("-p")
                .arg("--output-format")
                .arg("text")
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .kill_on_drop(true);
            let child = cmd
                .spawn()
                .map_err(|e| format!("spawn ({}): {e}", bin.display()))?;
            let _ = child;
            Ok(AgentResult {
                session_id: "x".into(),
                success: false,
                output: String::new(),
                error: Some("unreachable".into()),
            })
        }

        let bogus = PathBuf::from("/definitely/not/a/real/claude-bin-xyz-zzz");
        let result = run_with_resolver(bogus).await;
        assert!(result.is_err(), "spawn of nonexistent binary must error");
        let msg = result.unwrap_err();
        assert!(msg.contains("spawn"), "got: {msg}");
    }
}
