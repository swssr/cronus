use std::path::PathBuf;
use std::process::Command;
use std::fs;
use tauri::command;
use crate::types::*;
use serde::{Serialize, Deserialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct FileRelation {
    pub source: String,
    pub target: String,
    pub relation_type: String,
    pub strength: f64,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub path: String,
    pub name: String,
    pub file_type: String,
    pub size: u64,
    pub last_modified: String,
    pub import_count: u32,
    pub export_count: u32,
    pub centrality: f64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FileGraph {
    pub nodes: Vec<FileNode>,
    pub edges: Vec<FileRelation>,
    pub metadata: FileGraphMetadata,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FileGraphMetadata {
    pub total_files: usize,
    pub total_relations: usize,
    pub graph_density: f64,
    pub average_centrality: f64,
    pub analysis_timestamp: String,
}

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

#[command]
pub fn analyze_file_relationships(repo_path: String, _file_path: Option<String>) -> Result<FileGraph, String> {
    let path = PathBuf::from(&repo_path);
    
    if !path.exists() {
        return Err("Repository path does not exist".to_string());
    }
    
    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    
    // Get all source files in the repository
    let files = get_all_source_files(&repo_path)?;
    
    println!("Found {} source files for analysis", files.len());
    println!("Files: {:?}", files);
    
    // Analyze each file for relationships
    for file in &files {
        let file_path_buf = PathBuf::from(file);
        if !file_path_buf.exists() {
            continue;
        }
        
        // Get file metadata
        let metadata = fs::metadata(&file_path_buf)
            .map_err(|e| e.to_string())?;
        
        let file_type = get_file_extension(file);
        let name = file_path_buf.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        // Analyze file content for imports/exports
        let (imports, exports) = analyze_file_dependencies(&file_path_buf)?;
        
        let node = FileNode {
            path: file.clone(),
            name,
            file_type,
            size: metadata.len(),
            last_modified: format!("{:?}", metadata.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH)),
            import_count: imports.len() as u32,
            export_count: exports.len() as u32,
            centrality: 0.0, // Will be calculated later
        };
        
        nodes.push(node);
        
        // Create edges for imports
        for import in imports {
            if files.contains(&import) {
                edges.push(FileRelation {
                    source: file.clone(),
                    target: import,
                    relation_type: "import".to_string(),
                    strength: 1.0,
                    metadata: None,
                });
            }
        }
    }
    
    // Calculate centrality scores
    calculate_centrality_scores(&mut nodes, &edges);
    
    // Calculate graph metadata
    let metadata = FileGraphMetadata {
        total_files: nodes.len(),
        total_relations: edges.len(),
        graph_density: calculate_graph_density(nodes.len(), edges.len()),
        average_centrality: nodes.iter().map(|n| n.centrality).sum::<f64>() / nodes.len() as f64,
        analysis_timestamp: chrono::Utc::now().to_rfc3339(),
    };
    
    Ok(FileGraph {
        nodes,
        edges,
        metadata,
    })
}

#[command]
pub fn get_file_dependencies(file_path: String) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    
    let (imports, _) = analyze_file_dependencies(&path)?;
    Ok(imports)
}

#[command]
pub fn debug_list_source_files(repo_path: String) -> Result<Vec<String>, String> {
    get_all_source_files(&repo_path)
}

fn get_all_source_files(repo_path: &str) -> Result<Vec<String>, String> {
    let path = PathBuf::from(repo_path);
    
    if !path.exists() {
        return Err("Repository path does not exist".to_string());
    }
    
    let mut files = Vec::new();
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        
        // Skip hidden directories but include hidden files (like .gitignore)
        if entry_path.is_dir() {
            if let Some(name) = entry_path.file_name() {
                if let Some(name_str) = name.to_str() {
                    if name_str.starts_with('.') && name_str != ".git" {
                        continue;
                    }
                }
            }
        }
        
        if entry_path.is_file() {
            if let Ok(relative_path) = entry_path.strip_prefix(&path) {
                if let Some(path_str) = relative_path.to_str() {
                    // Only include source code files and important config files
                    if is_source_file(path_str) {
                        files.push(path_str.to_string());
                    }
                }
            }
        } else if entry_path.is_dir() {
            let mut sub_files = get_all_source_files_recursive(&entry_path, &path)?;
            files.append(&mut sub_files);
        }
    }
    
    files.sort();
    Ok(files)
}

fn get_all_source_files_recursive(dir: &PathBuf, base_path: &PathBuf) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        
        // Skip build and dependency directories
        if entry_path.is_dir() {
            if let Some(name) = entry_path.file_name() {
                if let Some(name_str) = name.to_str() {
                    if should_skip_directory(name_str) {
                        continue;
                    }
                }
            }
        }
        
        if entry_path.is_file() {
            if let Ok(relative_path) = entry_path.strip_prefix(base_path) {
                if let Some(path_str) = relative_path.to_str() {
                    // Only include source code files and important config files
                    if is_source_file(path_str) {
                        files.push(path_str.to_string());
                    }
                }
            }
        } else if entry_path.is_dir() {
            let mut sub_files = get_all_source_files_recursive(&entry_path, base_path)?;
            files.append(&mut sub_files);
        }
    }
    
    Ok(files)
}

fn should_skip_directory(dir_name: &str) -> bool {
    let skip_dirs = [
        "node_modules", "target", "build", "dist", "out", ".next", ".nuxt",
        "coverage", ".nyc_output", "vendor", "__pycache__", ".pytest_cache",
        ".venv", "venv", "env", ".env", ".git", ".svn", ".hg", ".idea", ".vscode"
    ];
    
    skip_dirs.contains(&dir_name)
}

fn is_source_file(file_path: &str) -> bool {
    let source_extensions = [
        // Source code files
        "ts", "tsx", "js", "jsx", "rs", "py", "go", "java", "cpp", "c", "h", "hpp",
        "cs", "php", "rb", "swift", "kt", "scala", "clj", "hs", "ml", "fs", "vb",
        "html", "css", "scss", "sass", "less", "xml", "json", "yaml", "yml", "toml",
        "ini", "cfg", "conf", "config", "md", "txt", "rst", "tex", "sql", "sh", "bat",
        "ps1", "fish", "zsh", "bash", "dockerfile", "makefile", "cmake", "gradle",
        "pom", "sbt", "cargo", "package", "requirements", "setup", "pyproject"
    ];
    
    let file_lower = file_path.to_lowercase();
    
    // Check if it's a source file by extension
    for ext in &source_extensions {
        if file_lower.ends_with(&format!(".{}", ext)) {
            return true;
        }
    }
    
    // Check for files without extensions that are commonly source files
    let no_ext_files = [
        "dockerfile", "makefile", "readme", "license", "changelog", "contributing",
        "package", "requirements", "setup", "pyproject", "cargo", "gradle", "pom"
    ];
    
    for no_ext in &no_ext_files {
        if file_lower == *no_ext {
            return true;
        }
    }
    
    // Include important config files
    let config_files = [
        ".gitignore", ".gitattributes", ".editorconfig", ".eslintrc", ".prettierrc",
        ".babelrc", "tsconfig.json", "package.json", "cargo.toml", "pyproject.toml",
        "requirements.txt", "setup.py", "pom.xml", "build.gradle", "cmake.txt"
    ];
    
    for config in &config_files {
        if file_lower.ends_with(config) {
            return true;
        }
    }
    
    false
}

fn analyze_file_dependencies(file_path: &PathBuf) -> Result<(Vec<String>, Vec<String>), String> {
    let content = fs::read_to_string(file_path)
        .map_err(|e| e.to_string())?;
    
    let mut imports = Vec::new();
    let mut exports = Vec::new();
    
    let extension = file_path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    match extension.as_str() {
        "ts" | "tsx" | "js" | "jsx" => {
            // TypeScript/JavaScript imports
            let import_patterns = vec![
                r#"import\s+.*\s+from\s+['"]([^'"]+)['"]"#,
                r#"import\s+['"]([^'"]+)['"]"#,
                r#"require\s*\(\s*['"]([^'"]+)['"]"#,
            ];
            
            for pattern in import_patterns {
                let re = regex::Regex::new(pattern)
                    .map_err(|e| e.to_string())?;
                
                for cap in re.captures_iter(&content) {
                    if let Some(import_path) = cap.get(1) {
                        imports.push(import_path.as_str().to_string());
                    }
                }
            }
            
            // Exports
            let export_patterns = vec![
                r#"export\s+.*\s+from\s+['"]([^'"]+)['"]"#,
                r#"export\s+\{[^}]*\}"#,
                r#"export\s+default"#,
            ];
            
            for pattern in export_patterns {
                let re = regex::Regex::new(pattern)
                    .map_err(|e| e.to_string())?;
                
                if re.is_match(&content) {
                    exports.push("export".to_string());
                }
            }
        },
        "rs" => {
            // Rust imports
            let import_patterns = vec![
                r#"use\s+([a-zA-Z0-9_:]+)"#,
                r#"extern\s+crate\s+([a-zA-Z0-9_]+)"#,
            ];
            
            for pattern in import_patterns {
                let re = regex::Regex::new(pattern)
                    .map_err(|e| e.to_string())?;
                
                for cap in re.captures_iter(&content) {
                    if let Some(import_path) = cap.get(1) {
                        imports.push(import_path.as_str().to_string());
                    }
                }
            }
            
            // Exports
            if content.contains("pub ") {
                exports.push("public".to_string());
            }
        },
        "py" => {
            // Python imports
            let import_patterns = vec![
                r#"import\s+([a-zA-Z0-9_]+)"#,
                r#"from\s+([a-zA-Z0-9_.]+)\s+import"#,
            ];
            
            for pattern in import_patterns {
                let re = regex::Regex::new(pattern)
                    .map_err(|e| e.to_string())?;
                
                for cap in re.captures_iter(&content) {
                    if let Some(import_path) = cap.get(1) {
                        imports.push(import_path.as_str().to_string());
                    }
                }
            }
        },
        _ => {
            // Generic file analysis - look for common patterns
            if content.contains("import") || content.contains("require") || content.contains("use") {
                imports.push("generic_import".to_string());
            }
        }
    }
    
    Ok((imports, exports))
}

fn get_file_extension(file_path: &str) -> String {
    PathBuf::from(file_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("unknown")
        .to_lowercase()
}

fn calculate_centrality_scores(nodes: &mut Vec<FileNode>, edges: &[FileRelation]) {
    // Simple degree centrality calculation
    for node in nodes.iter_mut() {
        let in_degree = edges.iter()
            .filter(|e| e.target == node.path)
            .count();
        let out_degree = edges.iter()
            .filter(|e| e.source == node.path)
            .count();
        
        node.centrality = (in_degree + out_degree) as f64;
    }
}

fn calculate_graph_density(node_count: usize, edge_count: usize) -> f64 {
    if node_count <= 1 {
        return 0.0;
    }
    
    let max_edges = node_count * (node_count - 1);
    edge_count as f64 / max_edges as f64
}