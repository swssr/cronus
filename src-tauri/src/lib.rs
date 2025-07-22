use std::path::PathBuf;
use std::process::Command;
use tauri::command;
use std::fs;

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
    let path = PathBuf::from(&file_path);
    
    let mut current_dir = path.parent().unwrap_or(&path);
    let mut git_root = None;
    
    loop {
        if current_dir.join(".git").exists() {
            git_root = Some(current_dir);
            break;
        }
        match current_dir.parent() {
            Some(parent) => current_dir = parent,
            None => break,
        }
    }
    
    let git_root = git_root.ok_or("Not in a git repository")?;
    
    let relative_path = path.strip_prefix(git_root)
        .map_err(|_| "File is not within git repository")?;
    
    let output = Command::new("git")
        .args(&["show", &format!("{}:{}", commit_hash, relative_path.to_string_lossy())])
        .current_dir(git_root)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
fn list_directory_files(dir_path: String) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&dir_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    fn collect_files_recursive(dir: &PathBuf, base_path: &PathBuf) -> Result<Vec<String>, String> {
        let mut files = Vec::new();
        let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let entry_path = entry.path();
            
            if let Some(name) = entry_path.file_name() {
                if let Some(name_str) = name.to_str() {
                    if name_str.starts_with('.') {
                        continue;
                    }
                }
            }
            
            if entry_path.is_file() {
                if let Ok(relative_path) = entry_path.strip_prefix(base_path) {
                    if let Some(path_str) = relative_path.to_str() {
                        files.push(path_str.to_string());
                    }
                }
            } else if entry_path.is_dir() {
                let mut sub_files = collect_files_recursive(&entry_path, base_path)?;
                files.append(&mut sub_files);
            }
        }
        
        Ok(files)
    }
    
    let mut files = collect_files_recursive(&path, &path)?;
    files.sort();
    Ok(files)
}

#[command]
fn get_repo_history(repo_path: String) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let output = Command::new("git")
        .args([
            "log", 
            "--pretty=format:%h|%an|%ad|%s",
            "--name-only",
            "--max-count=20" 
        ])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    }
}

#[command]
fn get_file_content_at_commit(repo_path: String, file_path: String, commit_hash: String) -> Result<String, String> {
    let repo = PathBuf::from(&repo_path);
    
    let output = Command::new("git")
        .args(&["show", &format!("{}:{}", commit_hash, file_path)])
        .current_dir(&repo)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err("File not found at this commit".to_string())
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
            get_git_file_at_commit,
            list_directory_files,
            get_repo_history,
            get_file_content_at_commit
        ])
        .manage(AppState { launch_path })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
