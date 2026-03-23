mod commands;
mod menu;

use commands::{
    // File system commands
    read_file, write_file, list_directory, create_directory,
    delete_path, rename_path, path_exists, get_file_info,
    // Claude CLI commands
    run_agent, check_claude_cli, cancel_agent,
    // Project commands
    open_project, create_project, get_recent_projects,
    open_folder_in_explorer, open_in_browser,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Create and set the native menu
            let menu = menu::create_menu(app.handle())?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event.id().as_ref());
        })
        .invoke_handler(tauri::generate_handler![
            // File system
            read_file,
            write_file,
            list_directory,
            create_directory,
            delete_path,
            rename_path,
            path_exists,
            get_file_info,
            // Claude CLI
            run_agent,
            check_claude_cli,
            cancel_agent,
            // Project
            open_project,
            create_project,
            get_recent_projects,
            open_folder_in_explorer,
            open_in_browser,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
