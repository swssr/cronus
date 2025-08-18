use std::path::PathBuf;
use std::process::Command;
use tauri::command;
use crate::types::*;

#[command]
pub fn create_worktree(repo_path: String, branch_name: String, worktree_path: Option<String>) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    // Generate worktree path if not provided
    let final_worktree_path = if let Some(custom_path) = worktree_path {
        custom_path
    } else {
        // Create worktree in .git/worktrees/ directory
        let worktree_dir = path.join(".git").join("worktrees").join(&branch_name);
        worktree_dir.to_string_lossy().to_string()
    };
    
    // Check if worktree already exists
    if PathBuf::from(&final_worktree_path).exists() {
        return Err(format!("Worktree path '{}' already exists", final_worktree_path));
    }
    
    // Create the worktree
    let output = Command::new("git")
        .args(["worktree", "add", &final_worktree_path, &branch_name])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(format!("Worktree created for branch '{}' at '{}'", branch_name, final_worktree_path))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub fn list_worktrees(repo_path: String) -> Result<Vec<WorktreeInfo>, String> {
    let path = PathBuf::from(&repo_path);
    
    let output = Command::new("git")
        .args(["worktree", "list", "--porcelain"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let mut worktrees = Vec::new();
        let lines = String::from_utf8_lossy(&output.stdout);
        let mut current_worktree = None;
        
        for line in lines.lines() {
            if line.starts_with("worktree ") {
                if let Some(wt) = current_worktree.take() {
                    worktrees.push(wt);
                }
                current_worktree = Some(WorktreeInfo {
                    path: line[9..].to_string(),
                    branch: String::new(),
                    commit: String::new(),
                    is_detached: false,
                    is_current: false,
                });
            } else if line.starts_with("branch ") {
                if let Some(wt) = &mut current_worktree {
                    wt.branch = line[8..].to_string();
                }
            } else if line.starts_with("HEAD ") {
                if let Some(wt) = &mut current_worktree {
                    wt.commit = line[5..].to_string();
                    wt.is_detached = !line[5..].starts_with("refs/heads/");
                }
            }
        }
        
        if let Some(wt) = current_worktree {
            worktrees.push(wt);
        }
        
        // Mark current worktree
        let current_branch_output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(&path)
            .output();
            
        if let Ok(current_branch) = current_branch_output {
            if current_branch.status.success() {
                let current_branch_name = String::from_utf8_lossy(&current_branch.stdout).trim().to_string();
                for wt in &mut worktrees {
                    if wt.branch == current_branch_name {
                        wt.is_current = true;
                        break;
                    }
                }
            }
        }
        
        Ok(worktrees)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub fn checkout_worktree_commit(worktree_path: String, commit_hash: String) -> Result<String, String> {
    let path = PathBuf::from(&worktree_path);
    
    if !path.exists() {
        return Err("Worktree path does not exist".to_string());
    }
    
    let output = Command::new("git")
        .args(["checkout", &commit_hash])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(format!("Checked out commit {} in worktree", commit_hash))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub fn remove_worktree(repo_path: String, worktree_path: String) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    // First, remove the worktree directory
    let worktree_path_buf = PathBuf::from(&worktree_path);
    if worktree_path_buf.exists() {
        std::fs::remove_dir_all(&worktree_path_buf)
            .map_err(|e| e.to_string())?;
    }
    
    // Then remove the worktree reference
    let output = Command::new("git")
        .args(["worktree", "remove", &worktree_path])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(format!("Worktree removed from '{}'", worktree_path))
    } else {
        // If git worktree remove fails, we still removed the directory
        Ok(format!("Worktree directory removed from '{}'", worktree_path))
    }
}

#[command]
pub fn get_worktree_file_content(worktree_path: String, file_path: String, commit_hash: Option<String>) -> Result<String, String> {
    let path = PathBuf::from(&worktree_path);
    
    if !path.exists() {
        return Err("Worktree path does not exist".to_string());
    }
    
    let mut args = vec!["show"];
    let commit_path;
    
    if let Some(commit) = commit_hash {
        commit_path = format!("{}:{}", commit, file_path);
        args.push(&commit_path);
    } else {
        // Show current working directory version
        args.push(&file_path);
    }
    
    let output = Command::new("git")
        .args(&args)
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub fn get_worktree_commit_history(worktree_path: String, file_path: String, limit: Option<usize>) -> Result<String, String> {
    let path = PathBuf::from(&worktree_path);
    
    if !path.exists() {
        return Err("Worktree path does not exist".to_string());
    }
    
    let mut args = vec!["log", "--pretty=format:%h|%an|%ad|%s", "--date=short", "--follow"];
    let limit_str;
    
    if let Some(limit_val) = limit {
        limit_str = limit_val.to_string();
        args.push("-n");
        args.push(&limit_str);
    }
    
    args.push("--");
    args.push(&file_path);
    
    let output = Command::new("git")
        .args(&args)
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}