use std::path::PathBuf;
use std::process::Command;
use tauri::command;

#[derive(Clone)]
struct AppState {
    launch_path: Option<String>,
}

#[command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[command]
fn hello(value: &str) -> String {
    "Yoh ".to_owned() + &value.to_string()
}

#[command]
fn get_git_history(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    let dir = path.parent().ok_or("Invalid file path")?;

    let output = Command::new("git")
        .args(["log", "--pretty=format:%h|%an|%ad|%s", "--", &file_path])
        .current_dir(dir)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    }
}

#[command]
fn get_launch_path(state: tauri::State<AppState>) -> Option<String> {
    state.launch_path.clone()
}

#[command]
fn get_git_file_at_commit(file_path: String, commit_hash: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(&["show", &format!("{}:{}", commit_hash, file_path)])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    let launch_path = args.get(1).cloned();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            hello,
            get_git_history,
            get_launch_path,
            get_git_file_at_commit
        ])
        .manage(AppState { launch_path })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
