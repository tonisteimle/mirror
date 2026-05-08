use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub async fn open_folder_in_explorer(path: String, app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| format!("open_folder_in_explorer({path}): {e}"))
}

#[tauri::command]
pub async fn open_in_browser(url: String, app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| format!("open_in_browser({url}): {e}"))
}
