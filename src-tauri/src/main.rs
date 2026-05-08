// Prevent additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod state;

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager};

use crate::state::AppState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            // Load persisted recents (best-effort; missing file is fine).
            if let Ok(dir) = app.path().app_data_dir() {
                let state: tauri::State<AppState> = app.state();
                state.load_recents(&dir);
            }

            // Native menu — IDs match studio/ui/desktop-menu.ts dispatch
            // table and studio/app.ts (⌘O handler).
            let file_menu = SubmenuBuilder::new(app, "File")
                .item(
                    &MenuItemBuilder::with_id("open_folder", "Open Folder…")
                        .accelerator("CmdOrCtrl+O")
                        .build(app)?,
                )
                .item(
                    &MenuItemBuilder::with_id("new_file", "New File")
                        .accelerator("CmdOrCtrl+N")
                        .build(app)?,
                )
                .item(&MenuItemBuilder::with_id("new_folder", "New Folder").build(app)?)
                .separator()
                .item(
                    &MenuItemBuilder::with_id("save", "Save")
                        .accelerator("CmdOrCtrl+S")
                        .build(app)?,
                )
                .item(
                    &MenuItemBuilder::with_id("save_all", "Save All")
                        .accelerator("CmdOrCtrl+Shift+S")
                        .build(app)?,
                )
                .build()?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&MenuItemBuilder::with_id("toggle_prompt", "Prompt").build(app)?)
                .item(&MenuItemBuilder::with_id("toggle_files", "Files").build(app)?)
                .item(&MenuItemBuilder::with_id("toggle_code", "Code").build(app)?)
                .item(
                    &MenuItemBuilder::with_id("toggle_components", "Components")
                        .build(app)?,
                )
                .item(&MenuItemBuilder::with_id("toggle_preview", "Preview").build(app)?)
                .item(
                    &MenuItemBuilder::with_id("toggle_property", "Properties")
                        .build(app)?,
                )
                .build()?;

            let menu = MenuBuilder::new(app)
                .items(&[&file_menu, &view_menu])
                .build()?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app, event| {
                let id = event.id().0.as_str();
                if let Err(e) = app.emit("menu", id) {
                    eprintln!("emit menu event failed: {e}");
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // FS
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::list_directory,
            commands::fs::create_directory,
            commands::fs::delete_path,
            commands::fs::rename_path,
            commands::fs::path_exists,
            commands::fs::get_file_info,
            // Project
            commands::project::open_project,
            commands::project::create_project,
            commands::project::get_recent_projects,
            // Shell
            commands::shell::open_folder_in_explorer,
            commands::shell::open_in_browser,
            // Window
            commands::window::set_window_title,
            // Agent (Claude CLI bridge)
            commands::agent::check_claude_cli,
            commands::agent::run_agent,
            commands::agent::cancel_agent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
