//! Native Desktop Menu for Mirror IDE
//!
//! Provides File, Edit, View, and Help menus for the desktop app.

use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder, PredefinedMenuItem},
    AppHandle, Emitter, Manager, Wry,
};

/// Create the application menu
pub fn create_menu(app: &AppHandle) -> Result<Menu<Wry>, tauri::Error> {
    // File submenu
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&MenuItemBuilder::with_id("open_folder", "Open Folder...")
            .accelerator("CmdOrCtrl+O")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("new_project", "New Project...")
            .accelerator("CmdOrCtrl+Shift+N")
            .build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("new_file", "New File")
            .accelerator("CmdOrCtrl+N")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("new_folder", "New Folder")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("save", "Save")
            .accelerator("CmdOrCtrl+S")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("save_all", "Save All")
            .accelerator("CmdOrCtrl+Shift+S")
            .build(app)?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, Some("Close Window"))?)
        .build()?;

    // Edit submenu
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, Some("Undo"))?)
        .item(&PredefinedMenuItem::redo(app, Some("Redo"))?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, Some("Cut"))?)
        .item(&PredefinedMenuItem::copy(app, Some("Copy"))?)
        .item(&PredefinedMenuItem::paste(app, Some("Paste"))?)
        .item(&PredefinedMenuItem::select_all(app, Some("Select All"))?)
        .build()?;

    // View submenu - Panel toggles
    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&MenuItemBuilder::with_id("toggle_prompt", "Prompt Panel")
            .accelerator("CmdOrCtrl+1")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("toggle_files", "Files Panel")
            .accelerator("CmdOrCtrl+2")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("toggle_code", "Code Panel")
            .accelerator("CmdOrCtrl+3")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("toggle_components", "Components Panel")
            .accelerator("CmdOrCtrl+4")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("toggle_preview", "Preview Panel")
            .accelerator("CmdOrCtrl+5")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("toggle_property", "Property Panel")
            .accelerator("CmdOrCtrl+6")
            .build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("zoom_in", "Zoom In")
            .accelerator("CmdOrCtrl+Plus")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("zoom_out", "Zoom Out")
            .accelerator("CmdOrCtrl+Minus")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("zoom_reset", "Reset Zoom")
            .accelerator("CmdOrCtrl+0")
            .build(app)?)
        .build()?;

    // Help submenu
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("documentation", "Documentation")
            .build(app)?)
        .item(&MenuItemBuilder::with_id("keyboard_shortcuts", "Keyboard Shortcuts")
            .build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("about", "About Mirror IDE")
            .build(app)?)
        .build()?;

    // Build the complete menu
    let menu = MenuBuilder::new(app)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&help_menu)
        .build()?;

    Ok(menu)
}

/// Handle menu events
pub fn handle_menu_event(app: &AppHandle, event_id: &str) {
    // Emit event to frontend
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("menu", event_id);
    }

    // Handle some events directly in Rust
    match event_id {
        "about" => {
            // Could show a native about dialog
            println!("[Menu] About Mirror IDE");
        }
        "documentation" => {
            // Open documentation URL
            let _ = open::that("https://mirror-dsl.dev/docs");
        }
        _ => {
            // All other events are handled by the frontend
            println!("[Menu] Event: {}", event_id);
        }
    }
}
