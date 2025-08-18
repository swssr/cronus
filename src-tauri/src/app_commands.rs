use std::path::PathBuf;
use std::fs;
use tauri::command;
use crate::types::AppState;

#[command]
pub fn get_launch_path(state: tauri::State<AppState>) -> Option<String> {
    state.launch_path.clone()
}

#[command]
pub fn open_external(url: String) -> Result<(), String> {
    // This would open the URL in the default browser
    // For now, we'll just log it
    println!("Opening external URL: {}", url);
    Ok(())
}

#[command]
pub fn write_repo_file(repo_path: String, relative_path: String, contents: String) -> Result<(), String> {
    let base = PathBuf::from(&repo_path);
    if !base.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    // Constrain writes under .cronus/working
    let safe_root = base.join(".cronus/working");
    let target = safe_root.join(relative_path);

    // Create parent dirs
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(&target, contents).map_err(|e| e.to_string())?;
    Ok(())
}