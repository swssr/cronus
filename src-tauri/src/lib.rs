// Module declarations
mod types;
mod utils;
mod git;
mod git_advanced;
mod git_analytics;
mod git_worktrees;
mod app_commands;

// Re-export types for use in main app
use types::AppState;

// Import all command functions from modules
use git::*;
use git_advanced::*;
use git_analytics::*;
use git_worktrees::*;
use app_commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    let launch_path = args.get(1).cloned();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Git commands
            get_git_history,
            get_git_file_at_commit,
            get_git_branches,
            get_git_commits,
            create_virtual_branch,
            get_branch_history,
            list_directory_files,
            get_git_status,
            get_last_fetch_time,
            unstage_all,
            stage_file,
            unstage_file,
            
            // Git advanced commands
            full_branch_history,
            create_commit,
            suggest_commit_message,
            get_file_diff,
            get_staged_diff,
            get_repo_history,
            get_file_content_at_commit,
            get_git_graph,
            checkout_commit,
            fetch_repo,
            pull_repo,
            push_repo,
            undo_last_commit,
            apply_index_patch,
            get_unified_diff,
            
            // Git analytics commands
            get_repository_analytics,
            get_merge_conflicts,
            resolve_conflict,
            get_rebase_plan,
            execute_rebase,
            
            // Git worktree commands
            create_worktree,
            list_worktrees,
            checkout_worktree_commit,
            remove_worktree,
            get_worktree_file_content,
            get_worktree_commit_history,
            
            // App commands
            get_launch_path,
            open_external,
            write_repo_file
        ])
        .manage(AppState { launch_path })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}