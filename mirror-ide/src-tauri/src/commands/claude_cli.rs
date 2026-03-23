use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentOutput {
    pub session_id: String,
    pub agent_type: String,
    pub content: String,
    pub is_complete: bool,
    pub is_error: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResult {
    pub session_id: String,
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

/// Get the system prompt for a specific agent type
fn get_system_prompt(agent_type: &str) -> String {
    match agent_type {
        "fixer" => r#"You are a Mirror DSL expert. Your task is to generate Mirror DSL code based on user descriptions.

Mirror is a DSL for rapid UI prototyping. Key syntax:
- Components: Box, Text, Button, Input, etc.
- Layout: hor, ver, gap N, center, spread, wrap
- Size: w/h hug/full/N, minw, maxw
- Spacing: pad N, margin N
- Colors: bg #hex, col #hex
- Border: bor N, rad N
- States: hover, focus, active, disabled, state selected
- Events: onclick, onhover, onfocus
- Actions: show, hide, toggle, select, highlight

Example:
Card pad 16 bg #1a1a23 rad 8
  H3 "Title" col #fff
  Text "Description" col #888
  Button "Click me" bg #3b82f6 col #fff pad 8 rad 4

Generate clean, well-structured Mirror code based on the user's description."#.to_string(),

        "builder" => r#"You are a web app builder. Take Mirror DSL specifications and generate complete, working web applications.

Generate:
1. index.html - Clean HTML structure
2. styles.css - Modern CSS with the specified design
3. app.js - Vanilla JavaScript for interactivity

The output should be production-ready, responsive, and follow modern web standards.
Write all files to the ./output directory."#.to_string(),

        _ => "You are a helpful assistant.".to_string(),
    }
}

/// Run a Claude agent with streaming output
#[tauri::command]
pub async fn run_agent(
    app: AppHandle,
    prompt: String,
    agent_type: String,
    project_path: String,
    session_id: Option<String>,
) -> Result<AgentResult, String> {
    let system_prompt = get_system_prompt(&agent_type);
    let generated_session_id = session_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let mut args = vec![
        "-p".to_string(),
        prompt.clone(),
        "--append-system-prompt".to_string(),
        system_prompt,
        "--output-format".to_string(),
        "stream-json".to_string(),
    ];

    // Add working directory if provided
    if !project_path.is_empty() {
        args.push("--cwd".to_string());
        args.push(project_path);
    }

    let mut child = Command::new("claude")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Claude CLI: {}", e))?;

    let stdout = child
        .stdout
        .take()
        .ok_or("Failed to capture stdout")?;

    let stderr = child
        .stderr
        .take()
        .ok_or("Failed to capture stderr")?;

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    let mut full_output = String::new();
    let mut error_output = String::new();

    // Read stdout
    loop {
        tokio::select! {
            line = stdout_reader.next_line() => {
                match line {
                    Ok(Some(line)) => {
                        full_output.push_str(&line);
                        full_output.push('\n');

                        let _ = app.emit("agent:output", AgentOutput {
                            session_id: generated_session_id.clone(),
                            agent_type: agent_type.clone(),
                            content: line,
                            is_complete: false,
                            is_error: false,
                        });
                    }
                    Ok(None) => break,
                    Err(e) => {
                        error_output.push_str(&format!("Read error: {}\n", e));
                        break;
                    }
                }
            }
            line = stderr_reader.next_line() => {
                match line {
                    Ok(Some(line)) => {
                        error_output.push_str(&line);
                        error_output.push('\n');

                        let _ = app.emit("agent:output", AgentOutput {
                            session_id: generated_session_id.clone(),
                            agent_type: agent_type.clone(),
                            content: line,
                            is_complete: false,
                            is_error: true,
                        });
                    }
                    Ok(None) => {}
                    Err(_) => {}
                }
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait for Claude CLI: {}", e))?;

    let success = status.success();

    // Emit completion event
    let _ = app.emit("agent:output", AgentOutput {
        session_id: generated_session_id.clone(),
        agent_type: agent_type.clone(),
        content: String::new(),
        is_complete: true,
        is_error: !success,
    });

    Ok(AgentResult {
        session_id: generated_session_id,
        success,
        output: full_output,
        error: if error_output.is_empty() {
            None
        } else {
            Some(error_output)
        },
    })
}

/// Check if Claude CLI is installed
#[tauri::command]
pub async fn check_claude_cli() -> Result<bool, String> {
    match Command::new("claude")
        .arg("--version")
        .output()
        .await
    {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
}

/// Cancel a running agent (placeholder - would need process tracking)
#[tauri::command]
pub fn cancel_agent(_session_id: String) -> Result<(), String> {
    // TODO: Implement proper process tracking and cancellation
    Ok(())
}
