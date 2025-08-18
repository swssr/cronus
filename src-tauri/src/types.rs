use serde::{Serialize, Deserialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // "modified", "added", "deleted", "untracked", "staged"
    pub additions: Option<i32>,
    pub deletions: Option<i32>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub staged: Vec<GitFileStatus>,
    pub unstaged: Vec<GitFileStatus>,
    pub untracked: Vec<String>,
    pub current_branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub upstream_branch: Option<String>,
    pub has_upstream: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct GitGraphNode {
    pub hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
    pub parents: Vec<String>,
    pub children: Vec<String>,
    pub branches: Vec<String>,
    pub tags: Vec<String>,
    pub x: i32,
    pub y: i32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct GitGraph {
    pub nodes: Vec<GitGraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
    pub edge_type: String, // "parent", "merge", "rebase"
}

#[derive(Clone, Serialize, Deserialize)]
pub struct RepositoryAnalytics {
    pub commit_frequency: CommitFrequency,
    pub top_authors: Vec<AuthorStats>,
    pub file_change_patterns: Vec<FileChangePattern>,
    pub branch_activity: Vec<BranchActivity>,
    pub technical_debt: Vec<TechnicalDebt>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct CommitFrequency {
    pub daily: i32,
    pub weekly: i32,
    pub monthly: i32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct AuthorStats {
    pub name: String,
    pub commits: i32,
    pub additions: i32,
    pub deletions: i32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FileChangePattern {
    pub file: String,
    pub changes: i32,
    pub last_modified: String,
    pub churn: f64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct BranchActivity {
    pub name: String,
    pub commits: i32,
    pub last_commit: String,
    pub is_active: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct TechnicalDebt {
    pub file: String,
    pub issues: Vec<String>,
    pub severity: String, // "low", "medium", "high"
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ConflictResolution {
    pub file: String,
    pub conflicts: Vec<Conflict>,
    pub resolved: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Conflict {
    pub start: i32,
    pub end: i32,
    pub ours: String,
    pub theirs: String,
    pub base: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct RebasePlan {
    pub commits: Vec<RebaseCommit>,
    pub conflicts: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct RebaseCommit {
    pub hash: String,
    pub message: String,
    pub action: String, // "pick", "edit", "squash", "drop"
}

#[derive(Clone)]
pub struct AppState {
    pub launch_path: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct WorktreeInfo {
    pub path: String,
    pub branch: String,
    pub commit: String,
    pub is_detached: bool,
    pub is_current: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UnifiedDiffLine {
    pub r#type: String,
    pub text: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UnifiedDiffHunk {
    pub old_start: i32,
    pub old_lines: i32,
    pub new_start: i32,
    pub new_lines: i32,
    pub header: String,
    pub lines: Vec<UnifiedDiffLine>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UnifiedDiff {
    pub file_path: String,
    pub is_binary: bool,
    pub header: String,
    pub hunks: Vec<UnifiedDiffHunk>,
}