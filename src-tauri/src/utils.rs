use std::path::PathBuf;
use std::fs;

pub fn should_exclude_file(file_path: &str) -> bool {
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

pub fn collect_files_recursive(dir: &PathBuf, base_path: &PathBuf) -> Result<Vec<String>, String> {
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

pub fn calculate_node_positions(nodes: &mut Vec<crate::types::GitGraphNode>) {
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