# Rust Module Organization

This document outlines the new modular structure of the Cronus Rust codebase.

## Module Structure

### `lib.rs` - Main Library Entry Point
- Contains the main `run()` function that initializes the Tauri application
- Imports and re-exports all command functions from other modules
- Manages the application state and plugin configuration

### `types.rs` - Type Definitions
Contains all struct definitions and data types used throughout the application:
- `GitFileStatus` - Represents the status of a file in git
- `GitStatus` - Complete git repository status
- `GitGraphNode` & `GitGraph` - Git commit graph visualization data
- `RepositoryAnalytics` - Analytics data for repositories
- `ConflictResolution` & `Conflict` - Merge conflict handling
- `RebasePlan` & `RebaseCommit` - Interactive rebase operations
- `WorktreeInfo` - Git worktree information
- `UnifiedDiff*` - Unified diff parsing structures
- `AppState` - Application state management

### `utils.rs` - Utility Functions
Common utility functions used across modules:
- `should_exclude_file()` - Determines if a file should be excluded from listings
- `collect_files_recursive()` - Recursively collects files from directories
- `calculate_node_positions()` - Calculates positions for git graph nodes

### `git.rs` - Core Git Commands
Basic git operations:
- `get_git_history()` - Get file history
- `get_git_branches()` - List repository branches
- `get_git_commits()` - Get commit history
- `get_git_status()` - Get repository status
- `stage_file()` / `unstage_file()` - Stage/unstage files
- `list_directory_files()` - List files in a directory
- And other fundamental git operations

### `git_advanced.rs` - Advanced Git Operations
More complex git functionality:
- `create_commit()` - Create new commits
- `suggest_commit_message()` - AI-assisted commit message generation
- `get_file_diff()` / `get_staged_diff()` - File diff operations
- `get_git_graph()` - Generate commit graph visualization
- `checkout_commit()` - Checkout specific commits
- `fetch_repo()` / `pull_repo()` / `push_repo()` - Remote operations
- `apply_index_patch()` - Apply patches to git index
- `get_unified_diff()` - Generate unified diff format

### `git_analytics.rs` - Repository Analytics
Analytics and reporting functionality:
- `get_repository_analytics()` - Generate comprehensive repository analytics
- `get_merge_conflicts()` - Detect and analyze merge conflicts
- `resolve_conflict()` - Resolve merge conflicts
- `get_rebase_plan()` / `execute_rebase()` - Interactive rebase operations

### `git_worktrees.rs` - Git Worktree Management
Git worktree functionality:
- `create_worktree()` - Create new worktrees
- `list_worktrees()` - List existing worktrees
- `remove_worktree()` - Remove worktrees
- `checkout_worktree_commit()` - Checkout commits in worktrees
- `get_worktree_file_content()` - Get file content from worktrees
- `get_worktree_commit_history()` - Get commit history in worktrees

### `app_commands.rs` - Application Commands
Non-git application functionality:
- `get_launch_path()` - Get application launch path
- `open_external()` - Open external URLs
- `write_repo_file()` - Write files to repository

## Benefits of This Organization

1. **Separation of Concerns**: Each module has a clear, focused responsibility
2. **Maintainability**: Easier to find and modify specific functionality
3. **Reusability**: Modules can be imported and used independently
4. **Testing**: Each module can be unit tested in isolation
5. **Scalability**: New functionality can be added to appropriate modules or new modules can be created
6. **Code Navigation**: Developers can quickly locate relevant code
7. **Reduced Compile Times**: Changes to one module only require recompiling that module and its dependents

## Development Guidelines

- Keep types in `types.rs` - all struct definitions should be centralized
- Put utility functions that are used across multiple modules in `utils.rs`
- Group related git commands in the appropriate git module
- Use `pub` for functions that need to be exported from modules
- Import types with `use crate::types::*` for convenience
- Follow the existing error handling patterns with `Result<T, String>`

## Future Enhancements

- Consider splitting large modules further if they grow too large
- Add integration tests for each module
- Consider creating a `config.rs` module for configuration management
- Add a `cache.rs` module for caching frequently accessed data