use std::path::PathBuf;
use std::process::Command;
use tauri::command;
use crate::types::*;
use crate::utils::{should_exclude_file, collect_files_recursive};

#[command]
pub fn get_git_history(file_path: String) -> Result<String, String> {
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
pub fn undo_last_commit(repo_path: String, keep_changes: Option<bool>) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // If keep_changes is true, equivalent to `git reset --soft HEAD~1`
    // else default to `git reset --mixed HEAD~1` which unstages but keeps working tree
    let args = if keep_changes.unwrap_or(true) {
        vec!["reset", "--soft", "HEAD~1"]
    } else {
        vec!["reset", "--mixed", "HEAD~1"]
    };

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
pub fn get_git_file_at_commit(file_path: String, commit_hash: String) -> Result<String, String> {
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
pub fn get_git_branches(repo_path: String) -> Result<Vec<String>, String> {
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
pub fn get_git_commits(repo_path: String, limit: Option<usize>) -> Result<String, String> {
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
pub fn create_virtual_branch(repo_path: String, base_commit: String, branch_name: String) -> Result<String, String> {
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
pub fn get_branch_history(repo_path: String, branch_name: String) -> Result<String, String> {
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
pub fn list_directory_files(dir_path: String) -> Result<Vec<String>, String> {
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

#[command]
pub fn get_git_status(repo_path: String) -> Result<GitStatus, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Get current branch
    let branch_output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    let current_branch = if branch_output.status.success() {
        String::from_utf8_lossy(&branch_output.stdout).trim().to_string()
    } else {
        "main".to_string()
    };

    // Get status in porcelain format
    let status_output = Command::new("git")
        .args(["status", "--porcelain", "-v"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !status_output.status.success() {
        return Err(String::from_utf8_lossy(&status_output.stderr).to_string());
    }

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();

    let status_lines = String::from_utf8_lossy(&status_output.stdout);
    for line in status_lines.lines() {
        if line.len() < 3 {
            continue;
        }

        let status_code = &line[0..2];
        let file_path = &line[3..];

        match status_code {
            "M " => staged.push(GitFileStatus {
                path: file_path.to_string(),
                status: "modified".to_string(),
                additions: None,
                deletions: None,
            }),
            "A " => staged.push(GitFileStatus {
                path: file_path.to_string(),
                status: "added".to_string(),
                additions: None,
                deletions: None,
            }),
            "D " => staged.push(GitFileStatus {
                path: file_path.to_string(),
                status: "deleted".to_string(),
                additions: None,
                deletions: None,
            }),
            " M" => unstaged.push(GitFileStatus {
                path: file_path.to_string(),
                status: "modified".to_string(),
                additions: None,
                deletions: None,
            }),
            " D" => unstaged.push(GitFileStatus {
                path: file_path.to_string(),
                status: "deleted".to_string(),
                additions: None,
                deletions: None,
            }),
            "??" => untracked.push(file_path.to_string()),
            _ => {}
        }
    }

    // Get upstream branch info
    let upstream_output = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
        .current_dir(&path)
        .output();

    let (upstream_branch, has_upstream) = if let Ok(output) = upstream_output {
        if output.status.success() {
            let upstream = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !upstream.is_empty() {
                (Some(upstream), true)
            } else {
                (None, false)
            }
        } else {
            (None, false)
        }
    } else {
        (None, false)
    };

    // Get ahead/behind info
    let (ahead, behind) = if has_upstream {
        let head = "{}...HEAD";
        let ahead_behind_output = Command::new("git")
            .args(["rev-list", "--left-right", "--count", &format!("{} {}", &head, upstream_branch.as_ref().unwrap())])
            .current_dir(&path)
            .output();

        if let Ok(output) = ahead_behind_output {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let counts: Vec<&str> = output_str.trim().split('\t').collect();
                if counts.len() == 2 {
                    (counts[1].parse().unwrap_or(0), counts[0].parse().unwrap_or(0))
                } else {
                    (0, 0)
                }
            } else {
                (0, 0)
            }
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };

    Ok(GitStatus {
        staged,
        unstaged,
        untracked,
        current_branch,
        ahead,
        behind,
        upstream_branch,
        has_upstream,
    })
}

#[command]
pub fn get_last_fetch_time(repo_path: String) -> Result<Option<String>, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Get the last fetch time from reflog
    let reflog_output = Command::new("git")
        .args(["reflog", "--format=format:%at", "refs/remotes/origin/HEAD"])
        .current_dir(&path)
        .output();

    if let Ok(output) = reflog_output {
        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = output_str.lines().next() {
                if let Ok(timestamp) = first_line.parse::<i64>() {
                    let datetime = chrono::DateTime::from_timestamp(timestamp, 0);
                    if let Some(dt) = datetime {
                        return Ok(Some(dt.format("%Y-%m-%d %H:%M").to_string()));
                    }
                }
            }
        }
    }

    Ok(None)
}

#[command]
pub fn unstage_all(repo_path: String) -> Result<(), String> {
    let path = PathBuf::from(&repo_path);
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Reset index to HEAD (keep working tree)
    let output = Command::new("git")
        .args(["reset"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub fn stage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let output = Command::new("git")
        .args(["add", &file_path])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub fn unstage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let output = Command::new("git")
        .args(["reset", "HEAD", &file_path])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}