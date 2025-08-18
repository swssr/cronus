use std::path::PathBuf;
use std::process::Command;
use std::fs;
use tauri::command;
use crate::types::*;
use crate::utils::calculate_node_positions;

#[command]
pub fn full_branch_history(repo_path: String) -> Result<String, String> {
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
pub fn create_commit(repo_path: String, message: String, files: Vec<String>) -> Result<String, String> {
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
        // Retrieve last commit hash safely
        let rev_parse = Command::new("git")
            .args(["rev-parse", "--short", "HEAD"])
            .current_dir(&path)
            .output()
            .map_err(|e| e.to_string())?;

        let commit_hash = if rev_parse.status.success() {
            String::from_utf8_lossy(&rev_parse.stdout).trim().to_string()
        } else {
            "unknown".to_string()
        };
        
        Ok(commit_hash)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[command]
pub fn suggest_commit_message(repo_path: String, staged_files: Vec<String>) -> Result<String, String> {
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
pub fn get_file_diff(repo_path: String, file_path: String) -> Result<String, String> {
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
pub fn get_staged_diff(repo_path: String, file_path: String) -> Result<String, String> {
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
pub fn get_repo_history(repo_path: String) -> Result<String, String> {
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
pub fn get_file_content_at_commit(repo_path: String, file_path: String, commit_hash: String) -> Result<String, String> {
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
pub fn get_git_graph(repo_path: String) -> Result<GitGraph, String> {
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

#[command]
pub fn checkout_commit(repo_path: String, commit_hash: String) -> Result<String, String> {
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
pub fn fetch_repo(repo_path: String) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    if !path.is_dir() { return Err("Path is not a directory".to_string()); }
    let output = Command::new("git")
        .args(["fetch", "--all", "--prune"])
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
pub fn pull_repo(repo_path: String, rebase: Option<bool>) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    if !path.is_dir() { return Err("Path is not a directory".to_string()); }
    let mut args: Vec<&str> = vec!["pull"]; 
    if rebase.unwrap_or(false) { args.push("--rebase"); }
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
pub fn push_repo(repo_path: String, force_with_lease: Option<bool>) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    if !path.is_dir() { return Err("Path is not a directory".to_string()); }
    let mut args: Vec<&str> = vec!["push"]; 
    if force_with_lease.unwrap_or(false) { args.push("--force-with-lease"); }
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
pub fn apply_index_patch(repo_path: String, patch: String, reverse: Option<bool>) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Write patch to a temporary file
    let mut tmp = std::env::temp_dir();
    tmp.push("cronus_hunk.patch");
    if let Err(e) = fs::write(&tmp, patch.as_bytes()) {
        return Err(e.to_string());
    }

    let mut args: Vec<String> = vec!["apply".into(), "--cached".into(), "--unidiff-zero".into()];
    if reverse.unwrap_or(false) {
        args.push("-R".into());
    }
    args.push(tmp.to_string_lossy().to_string());

    let output = Command::new("git")
        .args(args.iter().map(|s| s.as_str()))
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    // Best-effort cleanup
    let _ = fs::remove_file(&tmp);

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    }
}

#[command]
pub fn get_unified_diff(repo_path: String, file_path: String, staged: Option<bool>) -> Result<UnifiedDiff, String> {
    let path = PathBuf::from(&repo_path);
    if !path.is_dir() { return Err("Path is not a directory".to_string()); }

    // Build git diff args
    let mut args: Vec<String> = vec!["diff".into(), "-U0".into()]; // zero context to simplify line selection
    if staged.unwrap_or(false) { args.push("--cached".into()); }
    args.push("--".into());
    args.push(file_path.clone());

    let output = Command::new("git")
        .args(args.iter().map(|s| s.as_str()))
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }

    let diff_str = String::from_utf8_lossy(&output.stdout);
    let mut header_lines: Vec<String> = Vec::new();
    let mut hunks: Vec<UnifiedDiffHunk> = Vec::new();
    let mut cur_hunk: Option<UnifiedDiffHunk> = None;
    let mut is_binary = false;

    for line in diff_str.lines() {
        if line.starts_with("Binary files") {
            is_binary = true;
        }
        if line.starts_with("@@") {
            if let Some(h) = cur_hunk.take() { hunks.push(h); }
            // Parse header: @@ -a,b +c,d @@ optional
            let header = line.to_string();
            let nums: Vec<i32> = header
                .split(' ')
                .filter(|s| s.starts_with('-') || s.starts_with('+'))
                .flat_map(|part| {
                    let part = part.trim_matches('@');
                    let nums: Vec<&str> = part[1..].split(',').collect();
                    if nums.len() == 2 {
                        vec![nums[0].parse().unwrap_or(0), nums[1].parse().unwrap_or(0)]
                    } else { vec![] }
                })
                .collect();
            let (old_start, old_lines, new_start, new_lines) = if nums.len() >= 4 { (nums[0], nums[1], nums[2], nums[3]) } else { (0,0,0,0) };
            cur_hunk = Some(UnifiedDiffHunk { old_start, old_lines, new_start, new_lines, header, lines: Vec::new() });
        } else if line.starts_with("diff --git") || line.starts_with("--- ") || line.starts_with("+++ ") {
            header_lines.push(line.to_string());
        } else if let Some(ref mut h) = cur_hunk {
            let t = if line.starts_with('+') { "add" } else if line.starts_with('-') { "del" } else { "ctx" };
            h.lines.push(UnifiedDiffLine { r#type: t.to_string(), text: line.to_string() });
        }
    }
    if let Some(h) = cur_hunk { hunks.push(h); }

    Ok(UnifiedDiff { file_path, is_binary, header: header_lines.join("\n"), hunks })
}