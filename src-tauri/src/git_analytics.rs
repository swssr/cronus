use std::path::PathBuf;
use std::process::Command;
use std::fs;
use tauri::command;
use crate::types::*;

#[command]
pub fn get_repository_analytics(repo_path: String) -> Result<RepositoryAnalytics, String> {
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
pub fn get_merge_conflicts(repo_path: String) -> Result<Vec<ConflictResolution>, String> {
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
pub fn resolve_conflict(repo_path: String, file_path: String, resolution: String) -> Result<(), String> {
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
pub fn get_rebase_plan(repo_path: String, base_commit: String) -> Result<RebasePlan, String> {
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
pub fn execute_rebase(repo_path: String, base_commit: String, plan: Vec<RebaseCommit>) -> Result<String, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Execute the rebase plan
    let mut command = Command::new("git");
    command.args(["rebase", "-i", &base_commit]);
    command.current_dir(&path);

    let output = command.output().map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(format!("Rebase plan executed for {} commits", plan.len()))
}