use std::path::PathBuf;
use std::process::Command;
use tauri::command;
use std::fs;

#[derive(Clone)]
struct AppState {
    launch_path: Option<String>,
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
fn get_git_branches(repo_path: String) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let output = Command::new("git")
        .args(["branch", "--format=%(refname:short)"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let branches: Vec<String> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        Ok(branches)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
fn get_git_commits(repo_path: String, limit: Option<usize>) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut args = vec!["log", "--pretty=format:%h|%an|%ad|%s", "--date=short"];
    let limit_str;
    
    if let Some(limit) = limit {
        args.push("-n");
        limit_str = limit.to_string();
        args.push(&limit_str);
    }

    let output = Command::new("git")
        .args(&args)
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
fn create_virtual_branch(repo_path: String, base_commit: String, branch_name: String) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // First, check if the commit exists
    let commit_check = Command::new("git")
        .args(["rev-parse", "--verify", &base_commit])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !commit_check.status.success() {
        return Err(format!("Commit {} does not exist", base_commit));
    }

    // Create a new branch from the specified commit
    let output = Command::new("git")
        .args(["checkout", "-b", &branch_name, &base_commit])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(format!("Virtual branch '{}' created from commit {}", branch_name, base_commit))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
fn get_branch_history(repo_path: String, branch_name: String) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let output = Command::new("git")
        .args(["log", "--pretty=format:%h|%an|%ad|%s", "--date=short", &branch_name])
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
fn list_directory_files(dir_path: String) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&dir_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Check if it's a git repository
    let git_dir = path.join(".git");
    if !git_dir.exists() {
        // If not a git repo, fall back to regular file listing
        return collect_files_recursive(&path, &path);
    }

    // Use git ls-files to get tracked files, respecting .gitignore
    let output = Command::new("git")
        .args(["ls-files"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let files: Vec<String> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty() && !should_exclude_file(s))
            .collect();
        Ok(files)
    } else {
        // Fall back to regular file listing if git ls-files fails
        collect_files_recursive(&path, &path)
    }
}

fn should_exclude_file(file_path: &str) -> bool {
    let excluded_dirs = [
        "node_modules/",
        "target/",
        "build/",
        "dist/",
        "out/",
        ".next/",
        ".nuxt/",
        "coverage/",
        ".nyc_output/",
        "vendor/",
        "__pycache__/",
        ".pytest_cache/",
        ".venv/",
        "venv/",
        "env/",
        ".env/",
        ".git/",
        ".svn/",
        ".hg/",
        ".DS_Store",
        "Thumbs.db",
        ".idea/",
        ".vscode/",
        "*.log",
        "*.tmp",
        "*.cache",
    ];

    let excluded_extensions = [
        ".log", ".tmp", ".cache", ".lock", ".pid", ".swp", ".swo",
        ".orig", ".rej", ".bak", ".backup", ".old", ".temp",
    ];

    // Check if file starts with any excluded directory
    for excluded_dir in &excluded_dirs {
        if file_path.starts_with(excluded_dir) {
            return true;
        }
    }

    // Check if file has excluded extension
    for ext in &excluded_extensions {
        if file_path.ends_with(ext) {
            return true;
        }
    }

    // Check if any part of the path contains excluded directories
    let path_parts: Vec<&str> = file_path.split('/').collect();
    for part in &path_parts {
        for excluded_dir in &excluded_dirs {
            if excluded_dir.ends_with('/') {
                let dir_name = &excluded_dir[..excluded_dir.len()-1];
                if *part == dir_name {
                    println!("Excluded directory: {}", excluded_dir);
                    return true;
                }
            }
        }
    }

    false
}

fn collect_files_recursive(dir: &PathBuf, base_path: &PathBuf) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        
        // Skip hidden files and directories (starting with .)
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
            get_git_history,
            get_launch_path,
            get_git_file_at_commit,
            list_directory_files,
            get_repo_history,
            get_file_content_at_commit,
            get_branch_history,
            get_git_branches,
            get_git_commits,
            create_virtual_branch
        ])
        .manage(AppState { launch_path })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
