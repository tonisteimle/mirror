use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub name: String,
    pub path: String,
    pub has_mirror_files: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentProject {
    pub name: String,
    pub path: String,
    pub last_opened: u64,
}

/// Open a project from a directory
#[tauri::command]
pub fn open_project(path: String) -> Result<Project, String> {
    let path_obj = Path::new(&path);

    if !path_obj.exists() {
        return Err("Project path does not exist".to_string());
    }

    if !path_obj.is_dir() {
        return Err("Project path is not a directory".to_string());
    }

    let name = path_obj
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Untitled".to_string());

    // Check if project has Mirror files
    let has_mirror_files = fs::read_dir(&path)
        .map(|entries| {
            entries.filter_map(|e| e.ok()).any(|entry| {
                entry
                    .path()
                    .extension()
                    .map(|ext| ext == "mirror" || ext == "mir")
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false);

    Ok(Project {
        name,
        path,
        has_mirror_files,
    })
}

/// Create a new project
#[tauri::command]
pub fn create_project(name: String, path: String) -> Result<Project, String> {
    let project_path = Path::new(&path).join(&name);

    // Create project directory
    fs::create_dir_all(&project_path)
        .map_err(|e| format!("Failed to create project directory: {}", e))?;

    // Create default app.mirror file
    let default_mirror = r#"// Mirror App
// Created with Mirror IDE

App w full h full bg #0f0f17
  Header hor pad 16 bg #1a1a23
    H2 "My App" col #fff

  Main pad 24 ver gap 16
    Card pad 16 bg #1a1a23 rad 8
      H3 "Welcome" col #fff
      Text "Start building your UI" col #888

    Button "Get Started" bg #3b82f6 col #fff pad 12 rad 6
"#;

    let mirror_file_path = project_path.join("app.mirror");
    fs::write(&mirror_file_path, default_mirror)
        .map_err(|e| format!("Failed to create app.mirror: {}", e))?;

    // Create tokens.mirror file
    let default_tokens = r#"// Design Tokens
$colors.bg: #0f0f17
$colors.surface: #1a1a23
$colors.primary: #3b82f6
$colors.text: #ffffff
$colors.muted: #888888

$spacing.xs: 4
$spacing.sm: 8
$spacing.md: 16
$spacing.lg: 24
$spacing.xl: 32

$radius.sm: 4
$radius.md: 8
$radius.lg: 12
"#;

    let tokens_file_path = project_path.join("tokens.mirror");
    fs::write(&tokens_file_path, default_tokens)
        .map_err(|e| format!("Failed to create tokens.mirror: {}", e))?;

    // Create output directory
    let output_path = project_path.join("output");
    fs::create_dir_all(&output_path)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    Ok(Project {
        name,
        path: project_path.to_string_lossy().to_string(),
        has_mirror_files: true,
    })
}

/// Get recent projects (stored in app data)
#[tauri::command]
pub fn get_recent_projects() -> Vec<RecentProject> {
    // TODO: Implement persistent storage for recent projects
    Vec::new()
}

/// Open a folder in the system file explorer
#[tauri::command]
pub fn open_folder_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

/// Open a URL in the default browser
#[tauri::command]
pub fn open_in_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    Ok(())
}
