#[tauri::command]
pub fn set_window_title(title: String, window: tauri::Window) -> Result<(), String> {
    window.set_title(&title).map_err(|e| format!("set_window_title: {e}"))
}
