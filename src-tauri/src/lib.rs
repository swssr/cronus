use std::path::PathBuf;
use std::process::Command;
use tauri::command;
use std::fs;
use serde::{Serialize, Deserialize};

#[derive(Clone, Serialize, Deserialize)]
struct GitFileStatus {
    path: String,
    status: String, // "modified", "added", "deleted", "untracked", "staged"
    additions: Option<i32>,
    deletions: Option<i32>,
}

#[derive(Clone, Serialize, Deserialize)]
struct GitStatus {
    staged: Vec<GitFileStatus>,
    unstaged: Vec<GitFileStatus>,
    untracked: Vec<String>,
    current_branch: String,
    ahead: i32,
    behind: i32,
}

#[derive(Clone, Serialize, Deserialize)]
struct GitGraphNode {
    hash: String,
    author: String,
    date: String,
    message: String,
    parents: Vec<String>,
    children: Vec<String>,
    branches: Vec<String>,
    tags: Vec<String>,
    x: i32,
    y: i32,
}

#[derive(Clone, Serialize, Deserialize)]
struct GitGraph {
    nodes: Vec<GitGraphNode>,
    edges: Vec<GraphEdge>,
}

#[derive(Clone, Serialize, Deserialize)]
struct GraphEdge {
    from: String,
    to: String,
    edge_type: String, // "parent", "merge", "rebase"
}

#[derive(Clone, Serialize, Deserialize)]
struct RepositoryAnalytics {
    commit_frequency: CommitFrequency,
    top_authors: Vec<AuthorStats>,
    file_change_patterns: Vec<FileChangePattern>,
    branch_activity: Vec<BranchActivity>,
    technical_debt: Vec<TechnicalDebt>,
}

#[derive(Clone, Serialize, Deserialize)]
struct CommitFrequency {
    daily: i32,
    weekly: i32,
    monthly: i32,
}

#[derive(Clone, Serialize, Deserialize)]
struct AuthorStats {
    name: String,
    commits: i32,
    additions: i32,
    deletions: i32,
}

#[derive(Clone, Serialize, Deserialize)]
struct FileChangePattern {
    file: String,
    changes: i32,
    last_modified: String,
    churn: f64,
}

#[derive(Clone, Serialize, Deserialize)]
struct BranchActivity {
    name: String,
    commits: i32,
    last_commit: String,
    is_active: bool,
}

#[derive(Clone, Serialize, Deserialize)]
struct TechnicalDebt {
    file: String,
    issues: Vec<String>,
    severity: String, // "low", "medium", "high"
}

#[derive(Clone, Serialize, Deserialize)]
struct ConflictResolution {
    file: String,
    conflicts: Vec<Conflict>,
    resolved: bool,
}

#[derive(Clone, Serialize, Deserialize)]
struct Conflict {
    start: i32,
    end: i32,
    ours: String,
    theirs: String,
    base: String,
}

#[derive(Clone, Serialize, Deserialize)]
struct RebasePlan {
    commits: Vec<RebaseCommit>,
    conflicts: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize)]
struct RebaseCommit {
    hash: String,
    message: String,
    action: String, // "pick", "edit", "squash", "drop"
}

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

#[command]
fn get_git_status(repo_path: String) -> Result<GitStatus, String> {
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

    // Get ahead/behind info
    let ahead_behind_output = Command::new("git")
        .args(["rev-list", "--left-right", "--count", "origin/main...HEAD"])
        .current_dir(&path)
        .output();

    let (ahead, behind) = if let Ok(output) = ahead_behind_output {
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
    };

    Ok(GitStatus {
        staged,
        unstaged,
        untracked,
        current_branch,
        ahead,
        behind,
    })
}

#[command]
fn stage_file(repo_path: String, file_path: String) -> Result<(), String> {
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
fn unstage_file(repo_path: String, file_path: String) -> Result<(), String> {
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


#[command]
fn full_branch_history(repo_path: String) -> Result<String, String> {
    let path: PathBuf = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let output = Command::new("git")
        .args(["log", "--pretty=format:%h|%an|%ad|%s", "--date=short", "--all"])
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
fn create_commit(repo_path: String, message: String, files: Vec<String>) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Stage specific files if provided
    if !files.is_empty() {
        let mut add_args = vec!["add"];
        add_args.extend(files.iter().map(|s| s.as_str()));
        
        let add_output = Command::new("git")
            .args(&add_args)
            .current_dir(&path)
            .output()
            .map_err(|e| e.to_string())?;

        if !add_output.status.success() {
            return Err(String::from_utf8_lossy(&add_output.stderr).to_string());
        }
    }

    // Create commit
    let output = Command::new("git")
        .args(["commit", "-m", &message])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let commit_hash = String::from_utf8_lossy(&output.stdout)
            .lines()
            .find(|line| line.contains("[") && line.contains("]"))
            .and_then(|line| {
                line.split_whitespace()
                    .find(|word| word.len() == 7 && word.chars().all(|c| c.is_alphanumeric()))
            })
            .unwrap_or("unknown")
            .to_string();
        
        Ok(commit_hash)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
fn suggest_commit_message(repo_path: String, staged_files: Vec<String>) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Analyze staged files to suggest commit type
    let mut file_types = Vec::new();
    let mut has_src_changes = false;
    let mut has_docs_changes = false;
    let mut has_config_changes = false;

    for file in &staged_files {
        let file_lower = file.to_lowercase();
        
        if file_lower.contains("src/") || file_lower.ends_with(".ts") || file_lower.ends_with(".js") || 
           file_lower.ends_with(".tsx") || file_lower.ends_with(".jsx") || file_lower.ends_with(".py") ||
           file_lower.ends_with(".rs") || file_lower.ends_with(".go") || file_lower.ends_with(".java") {
            has_src_changes = true;
            file_types.push("code");
        } else if file_lower.contains("readme") || file_lower.ends_with(".md") || file_lower.contains("docs/") {
            has_docs_changes = true;
            file_types.push("docs");
        } else if file_lower.contains("package.json") || file_lower.contains("cargo.toml") || 
                  file_lower.contains("requirements.txt") || file_lower.ends_with(".toml") ||
                  file_lower.ends_with(".json") || file_lower.ends_with(".yaml") || file_lower.ends_with(".yml") {
            has_config_changes = true;
            file_types.push("config");
        }
    }

    // Determine commit type based on changes
    let commit_type = if has_src_changes {
        "feat"
    } else if has_docs_changes {
        "docs"
    } else if has_config_changes {
        "chore"
    } else {
        "update"
    };

    // Generate a simple message based on file count and types
    let file_count = staged_files.len();
    let unique_types: std::collections::HashSet<_> = file_types.into_iter().collect();
    
    let scope = if unique_types.len() == 1 {
        match unique_types.iter().next().unwrap() {
            &"code" => "src",
            &"docs" => "docs",
            &"config" => "config",
            _ => "files"
        }
    } else {
        "project"
    };

    let message = if file_count == 1 {
        let file_name = staged_files[0].split('/').last().unwrap_or("file");
        format!("{}: update {}", commit_type, file_name)
    } else {
        format!("{}: update {} {} files", commit_type, scope, file_count)
    };

    Ok(message)
}

#[command]
fn get_file_diff(repo_path: String, file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let output = Command::new("git")
        .args(["diff", "--", &file_path])
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
fn get_staged_diff(repo_path: String, file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let output = Command::new("git")
        .args(["diff", "--cached", "--", &file_path])
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

#[command]
fn get_git_graph(repo_path: String) -> Result<GitGraph, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Get git log with graph format
    let output = Command::new("git")
        .args([
            "log", 
            "--graph", 
            "--pretty=format:%h|%an|%ad|%s|%p", 
            "--date=short",
            "--all"
        ])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    let mut node_map = std::collections::HashMap::new();

    let lines = String::from_utf8_lossy(&output.stdout);
    for (y, line) in lines.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }

        // Parse graph line
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 5 {
            let hash = parts[0].trim();
            let author = parts[1].trim();
            let date = parts[2].trim();
            let message = parts[3].trim();
            let parents = parts[4].trim().split_whitespace().map(|s| s.to_string()).collect();

            let node = GitGraphNode {
                hash: hash.to_string(),
                author: author.to_string(),
                date: date.to_string(),
                message: message.to_string(),
                parents,
                children: Vec::new(),
                branches: Vec::new(),
                tags: Vec::new(),
                x: 0, // Will be calculated based on graph structure
                y: y as i32,
            };

            node_map.insert(hash.to_string(), nodes.len());
            nodes.push(node);
        }
    }

    // Calculate edges and positions
    for (_i, node) in nodes.iter().enumerate() {
        for parent_hash in &node.parents {
            if node_map.get(parent_hash).is_some() {
                edges.push(GraphEdge {
                    from: parent_hash.clone(),
                    to: node.hash.clone(),
                    edge_type: "parent".to_string(),
                });
            }
        }
    }

    // Collect children updates to avoid borrowing issues
    let mut children_updates: Vec<(usize, String)> = Vec::new();
    for (_i, node) in nodes.iter().enumerate() {
        for parent_hash in &node.parents {
            if let Some(&parent_idx) = node_map.get(parent_hash) {
                if parent_idx < nodes.len() {
                    children_updates.push((parent_idx, node.hash.clone()));
                }
            }
        }
    }

    // Apply children updates
    for (parent_idx, child_hash) in children_updates {
        nodes[parent_idx].children.push(child_hash);
    }

    // Calculate x positions based on graph structure
    calculate_node_positions(&mut nodes);

    Ok(GitGraph { nodes, edges })
}

fn calculate_node_positions(nodes: &mut Vec<GitGraphNode>) {
    // Simple positioning algorithm
    let mut column_map = std::collections::HashMap::new();
    let mut current_column = 0;

    for node in nodes.iter_mut() {
        if node.parents.is_empty() {
            // Root node
            node.x = current_column;
            column_map.insert(node.hash.clone(), current_column);
            current_column += 1;
        } else {
            // Find the most recent parent's column
            let mut parent_column = 0;
            for parent_hash in &node.parents {
                if let Some(&col) = column_map.get(parent_hash) {
                    parent_column = col;
                    break;
                }
            }
            node.x = parent_column;
            column_map.insert(node.hash.clone(), parent_column);
        }
    }
}

#[command]
fn get_repository_analytics(repo_path: String) -> Result<RepositoryAnalytics, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Get commit statistics
    let commit_stats = Command::new("git")
        .args([
            "log", 
            "--pretty=format:%an|%ad", 
            "--date=short",
            "--numstat"
        ])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !commit_stats.status.success() {
        return Err(String::from_utf8_lossy(&commit_stats.stderr).to_string());
    }

    let mut author_stats = std::collections::HashMap::new();
    let mut file_stats = std::collections::HashMap::new();
    let mut daily_commits = 0;
    let mut weekly_commits = 0;
    let mut monthly_commits = 0;

    let lines = String::from_utf8_lossy(&commit_stats.stdout);
    let mut current_author = String::new();
    let mut current_date = String::new();

    for line in lines.lines() {
        if line.contains('|') {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 2 {
                current_author = parts[0].to_string();
                current_date = parts[1].to_string();
                
                // Count commits by frequency
                let date = chrono::NaiveDate::parse_from_str(&current_date, "%Y-%m-%d")
                    .unwrap_or_else(|_| chrono::Utc::now().naive_utc().date());
                let now = chrono::Utc::now().naive_utc().date();
                let days_diff = (now - date).num_days();

                if days_diff <= 1 {
                    daily_commits += 1;
                }
                if days_diff <= 7 {
                    weekly_commits += 1;
                }
                if days_diff <= 30 {
                    monthly_commits += 1;
                }

                // Update author stats
                let entry = author_stats.entry(current_author.clone()).or_insert(AuthorStats {
                    name: current_author.clone(),
                    commits: 0,
                    additions: 0,
                    deletions: 0,
                });
                entry.commits += 1;
            }
        } else if line.matches('\t').count() >= 2 {
            // This is a file change line
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                let additions: i32 = parts[0].parse().unwrap_or(0);
                let deletions: i32 = parts[1].parse().unwrap_or(0);
                let file = parts[2];

                // Update author stats
                if let Some(author_stat) = author_stats.get_mut(&current_author) {
                    author_stat.additions += additions;
                    author_stat.deletions += deletions;
                }

                // Update file stats
                let entry = file_stats.entry(file.to_string()).or_insert(FileChangePattern {
                    file: file.to_string(),
                    changes: 0,
                    last_modified: current_date.clone(),
                    churn: 0.0,
                });
                entry.changes += 1;
                entry.last_modified = current_date.clone();
                entry.churn = (additions + deletions) as f64;
            }
        }
    }

    // Get branch activity
    let branch_output = Command::new("git")
        .args(["branch", "-r", "--format=%(refname:short)|%(committerdate:short)"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    let mut branch_activity = Vec::new();
    if branch_output.status.success() {
        let branch_lines = String::from_utf8_lossy(&branch_output.stdout);
        for line in branch_lines.lines() {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 2 {
                let branch_name = parts[0].trim();
                let last_commit = parts[1].trim();
                
                // Skip origin/ prefix for remote branches
                let clean_name = if branch_name.starts_with("origin/") {
                    &branch_name[7..]
                } else {
                    branch_name
                };

                branch_activity.push(BranchActivity {
                    name: clean_name.to_string(),
                    commits: 0, // Would need additional query to get commit count
                    last_commit: last_commit.to_string(),
                    is_active: true,
                });
            }
        }
    }

    // Convert to sorted vectors
    let mut top_authors: Vec<AuthorStats> = author_stats.into_values().collect();
    top_authors.sort_by(|a, b| b.commits.cmp(&a.commits));
    top_authors.truncate(10); // Top 10 authors

    let mut file_change_patterns: Vec<FileChangePattern> = file_stats.into_values().collect();
    file_change_patterns.sort_by(|a, b| b.changes.cmp(&a.changes));
    file_change_patterns.truncate(20); // Top 20 files

    // Simple technical debt detection
    let technical_debt = file_change_patterns
        .iter()
        .filter(|f| f.churn > 100.0 || f.changes > 50)
        .map(|f| TechnicalDebt {
            file: f.file.clone(),
            issues: vec![
                if f.churn > 100.0 { "High code churn".to_string() } else { String::new() },
                if f.changes > 50 { "Frequent changes".to_string() } else { String::new() },
            ].into_iter().filter(|s| !s.is_empty()).collect(),
            severity: if f.churn > 200.0 { "high".to_string() } else if f.churn > 100.0 { "medium".to_string() } else { "low".to_string() },
        })
        .collect();

    Ok(RepositoryAnalytics {
        commit_frequency: CommitFrequency {
            daily: daily_commits,
            weekly: weekly_commits,
            monthly: monthly_commits,
        },
        top_authors,
        file_change_patterns,
        branch_activity,
        technical_debt,
    })
}

#[command]
fn get_merge_conflicts(repo_path: String) -> Result<Vec<ConflictResolution>, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Check if there are any merge conflicts
    let status_output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !status_output.status.success() {
        return Err(String::from_utf8_lossy(&status_output.stderr).to_string());
    }

    let mut conflicts = Vec::new();
    let status_lines = String::from_utf8_lossy(&status_output.stdout);
    
    for line in status_lines.lines() {
        if line.starts_with("UU ") || line.starts_with("AA ") || line.starts_with("DD ") {
            let file_path = &line[3..];
            
            // Get the conflict markers
            let file_content = fs::read_to_string(path.join(file_path))
                .map_err(|e| e.to_string())?;

            let mut conflict_blocks = Vec::new();
            let lines: Vec<&str> = file_content.lines().collect();
            let mut i = 0;

            while i < lines.len() {
                if lines[i].starts_with("<<<<<<<") {
                    let start = i;
                    let mut ours = Vec::new();
                    let mut theirs = Vec::new();
                    let base: Vec<String> = Vec::new();
                    
                    i += 1; // Skip <<<<<<<
                    
                    // Parse our version
                    while i < lines.len() && !lines[i].starts_with("=======") {
                        ours.push(lines[i]);
                        i += 1;
                    }
                    
                    if i < lines.len() {
                        i += 1; // Skip =======
                        
                        // Parse their version
                        while i < lines.len() && !lines[i].starts_with(">>>>>>>") {
                            theirs.push(lines[i]);
                            i += 1;
                        }
                        
                        if i < lines.len() {
                            i += 1; // Skip >>>>>>>
                            
                            conflict_blocks.push(Conflict {
                                start: start as i32,
                                end: i as i32,
                                ours: ours.join("\n"),
                                theirs: theirs.join("\n"),
                                base: base.join("\n"),
                            });
                        }
                    }
                } else {
                    i += 1;
                }
            }

            if !conflict_blocks.is_empty() {
                conflicts.push(ConflictResolution {
                    file: file_path.to_string(),
                    conflicts: conflict_blocks,
                    resolved: false,
                });
            }
        }
    }

    Ok(conflicts)
}

#[command]
fn resolve_conflict(repo_path: String, file_path: String, resolution: String) -> Result<(), String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Write the resolved content to the file
    fs::write(path.join(&file_path), resolution)
        .map_err(|e| e.to_string())?;

    // Stage the resolved file
    let output = Command::new("git")
        .args(["add", &file_path])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

#[command]
fn get_rebase_plan(repo_path: String, base_commit: String) -> Result<RebasePlan, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Get commits that would be rebased
    let output = Command::new("git")
        .args([
            "log", 
            "--pretty=format:%h|%s", 
            "--oneline",
            &format!("{}..HEAD", base_commit)
        ])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let mut commits = Vec::new();
    let lines = String::from_utf8_lossy(&output.stdout);
    
    for line in lines.lines() {
        if line.contains('|') {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 2 {
                commits.push(RebaseCommit {
                    hash: parts[0].trim().to_string(),
                    message: parts[1].trim().to_string(),
                    action: "pick".to_string(),
                });
            }
        }
    }

    // Reverse the order for rebase (oldest first)
    commits.reverse();

    Ok(RebasePlan {
        commits,
        conflicts: Vec::new(), // Would be populated during actual rebase
    })
}

#[command]
fn execute_rebase(repo_path: String, base_commit: String, plan: Vec<RebaseCommit>) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // For now, return a placeholder message
    // In a real implementation, this would execute the rebase plan
    Ok(format!("Rebase plan executed for {} commits", plan.len()))
}

#[command]
fn checkout_commit(repo_path: String, commit_hash: String) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // First, check if the commit exists
    let commit_check = Command::new("git")
        .args(["rev-parse", "--verify", &commit_hash])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !commit_check.status.success() {
        return Err(format!("Commit {} does not exist", commit_hash));
    }

    // Checkout the specific commit
    let output = Command::new("git")
        .args(["checkout", &commit_hash])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(format!("Successfully checked out commit {}", commit_hash))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
fn open_external(url: String) -> Result<(), String> {
    // This would open the URL in the default browser
    // For now, we'll just log it
    println!("Opening external URL: {}", url);
    Ok(())
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
            create_virtual_branch,
            get_git_status,
            stage_file,
            unstage_file,
            create_commit,
            suggest_commit_message,
            get_file_diff,
            get_staged_diff,
            get_git_graph,
            get_repository_analytics,
            get_merge_conflicts,
            resolve_conflict,
            get_rebase_plan,
            execute_rebase,
            checkout_commit,
            open_external,
            full_branch_history
        ])
        .manage(AppState { launch_path })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
