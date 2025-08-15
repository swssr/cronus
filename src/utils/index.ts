import { invoke } from "@tauri-apps/api/core";
import { Commit, RecentRepository, GitStatus, CommitSuggestion, GitGraph, RepositoryAnalytics, ConflictResolution, UnifiedDiff, WorktreeInfo } from "../types";

const RECENT_REPOS_KEY = "cronus_recent_repositories";
const MAX_RECENT_REPOS = 10;

export function tryParse<T>(value: string): {
  data: T | null;
  error: null | string;
} {
  try {
    const _value: T = JSON.parse(value);
    if (!_value) return { data: null, error: null };
    return { data: _value, error: null };
  } catch (error: any) {
    return { data: null, error: String(error?.message) };
  }
}
// Recent Repositories Management
export function getRecentRepositories(): RecentRepository[] {
  try {
    const stored = localStorage.getItem(RECENT_REPOS_KEY);
    if (!stored) return [];

    const repos: RecentRepository[] = JSON.parse(stored);
    // Sort by lastAccessed date (most recent first)
    return repos.sort(
      (a: RecentRepository, b: RecentRepository) =>
        new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime(),
    );
  } catch (error) {
    console.error("Error loading recent repositories:", error);
    return [];
  }
}

export function addRecentRepository(
  repoPath: string,
  fileCount?: number,
): void {
  try {
    const existing = getRecentRepositories();
    const repoName = repoPath.split("/").pop() || repoPath;

    // Remove existing entry if it exists
    const filtered = existing.filter((repo) => repo.path !== repoPath);

    // Add new entry at the beginning
    const newRepo: RecentRepository = {
      path: repoPath,
      name: repoName,
      lastAccessed: new Date().toISOString(),
      fileCount,
    };

    const updated = [newRepo, ...filtered].slice(0, MAX_RECENT_REPOS);
    localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(updated));

    console.log(`Added ${repoName} to recent repositories`);
  } catch (error) {
    console.error("Error saving recent repository:", error);
  }
}

export function removeRecentRepository(repoPath: string): void {
  try {
    const existing = getRecentRepositories();
    const filtered = existing.filter((repo) => repo.path !== repoPath);
    localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing recent repository:", error);
  }
}

export function clearRecentRepositories(): void {
  try {
    localStorage.removeItem(RECENT_REPOS_KEY);
  } catch (error) {
    console.error("Error clearing recent repositories:", error);
  }
}

export async function getGitHistoryWithContent(
  filePath: string,
): Promise<Commit[]> {
  try {
    const raw = await invoke<string>("get_git_history", { filePath });
    const history = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, date, message] = line.split("|");
        return { hash, author, date, message };
      });

    const withContent: Commit[] = [];
    for (const entry of history) {
      try {
        const content = await invoke<string>("get_git_file_at_commit", {
          filePath,
          commitHash: entry.hash,
        });
        withContent.push({
          ...entry,
          content,
        });
      } catch (error) {
        console.warn(`Failed to get content for commit ${entry.hash}:`, error);
        withContent.push({
          ...entry,
          content: "Content not available",
        });
      }
    }
    return withContent;
  } catch (error) {
    console.error("Error getting git history:", error);
    return [];
  }
}

// New Git operations for enhanced file selection
export async function getGitBranches(repoPath: string): Promise<string[]> {
  try {
    const branches = await invoke<string[]>("get_git_branches", { repoPath });
    return branches;
  } catch (error) {
    console.error("Error getting git branches:", error);
    return [];
  }
}

export async function getGitCommits(repoPath: string, limit?: number): Promise<Commit[]> {
  try {
    const raw = await invoke<string>("get_git_commits", { 
      repoPath, 
      limit: limit || 50 
    });
    
    const commits = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, date, message] = line.split("|");
        return { 
          hash, 
          author, 
          date, 
          message,
          content: "" // Branch commits don't have file content
        };
      });
    
    return commits;
  } catch (error) {
    console.error("Error getting git commits:", error);
    return [];
  }
}

export async function getBranchHistory(repoPath: string, branchName: string): Promise<Commit[]> {
  try {
    const raw = await invoke<string>("get_branch_history", { 
      repoPath, 
      branchName 
    });
    
    const commits = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, date, message] = line.split("|");
        return { 
          hash, 
          author, 
          date, 
          message,
          content: "" // Branch commits don't have file content
        };
      });
    
    return commits;
  } catch (error) {
    console.error("Error getting branch history:", error);
    return [];
  }
}

export async function createVirtualBranch(
  repoPath: string, 
  baseCommit: string, 
  branchName: string
): Promise<string> {
  try {
    const result = await invoke<string>("create_virtual_branch", {
      repoPath,
      baseCommit,
      branchName,
    });
    return result;
  } catch (error) {
    console.error("Error creating virtual branch:", error);
    throw error;
  }
}



export async function getDirectoryFiles(dirPath: string): Promise<string[]> {
  try {
    const files = await invoke<string[]>("list_directory_files", {
      dirPath,
    });
    return files;
  } catch (error) {
    console.error("Error getting directory files:", error);
    return [];
  }
}

export async function getRepoFiles(repoPath: string): Promise<string[]> {
  try {
    const files = await invoke<string[]>("list_directory_files", { dirPath: repoPath });
    return files;
  } catch (error) {
    console.error("Error getting repository files:", error);
    return [];
  }
}

/**
 * Fetch recent repository history (last N commits with changed files) and parse
 * into a list of entries and a file->lastModified map for MRU sorting.
 */
export async function getRepoHistoryData(repoPath: string, maxCommits: number = 50): Promise<{
  entries: Array<{ hash: string; author: string; date: string; message: string; files: string[] }>
  fileToLastModified: Record<string, string>
}> {
  try {
    // Reuse backend command which returns a pretty log followed by file names per commit
    const raw = await invoke<string>("get_repo_history", { repoPath });

    const lines = raw.split(/\r?\n/);
    const entries: Array<{ hash: string; author: string; date: string; message: string; files: string[] }> = [];

    let current: { hash: string; author: string; date: string; message: string; files: string[] } | null = null;
    for (const line of lines) {
      if (!line.trim()) {
        // blank line between commits
        continue;
      }
      if (line.includes("|") && line.split("|").length >= 4 && /^[0-9a-f]{5,}/.test(line.split("|")[0])) {
        // Start a new commit record
        if (current) entries.push(current);
        const [hash, author, date, message] = line.split("|");
        current = { hash, author, date, message, files: [] };
      } else if (current) {
        // File path line (from --name-only); may be empty if no files (rare)
        const filePath = line.trim();
        if (filePath) current.files.push(filePath);
      }
      if (entries.length >= maxCommits) break;
    }
    if (current && entries.length < maxCommits) entries.push(current);

    // Build last modified map: latest commit date per file
    const fileToLastModified: Record<string, string> = {};
    for (const entry of entries) {
      for (const f of entry.files) {
        if (!fileToLastModified[f]) {
          fileToLastModified[f] = entry.date; // first time seen = most recent in log order
        }
      }
    }

    return { entries, fileToLastModified };
  } catch (error) {
    console.error("Error getting repository history data:", error);
    return { entries: [], fileToLastModified: {} };
  }
}

/**
 * Sort provided files by most-recently modified according to git history.
 */
export async function sortFilesByRecency(repoPath: string, files: string[]): Promise<string[]> {
  const { fileToLastModified } = await getRepoHistoryData(repoPath);
  const withDates = files.map((f) => ({
    file: f,
    dateStr: fileToLastModified[f] || "1970-01-01",
  }));
  withDates.sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());
  return withDates.map((e) => e.file);
}

export function getFileLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    fish: "shell",
    ps1: "powershell",
    sql: "sql",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    xml: "xml",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    ini: "ini",
    cfg: "ini",
    conf: "ini",
    md: "markdown",
    markdown: "markdown",
    dockerfile: "dockerfile",
    makefile: "makefile",
    r: "r",
    dart: "dart",
    lua: "lua",
    vim: "vim",
    tex: "latex",
  };
  return langMap[ext || ""] || "plaintext";
}

export function getFileIcon(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const name = fileName.toLowerCase();

  // Special files
  if (name.includes("readme")) return "📖";
  if (name.includes("license")) return "📄";
  if (name.includes("dockerfile")) return "🐳";
  if (name.includes("makefile")) return "🔧";
  if (name.includes("package.json")) return "📦";
  if (name.includes("tsconfig")) return "⚙️";
  if (name.includes("eslint") || name.includes("prettier")) return "✨";
  if (name.includes(".env") || name.includes("config")) return "⚙️";

  // Extensions
  const iconMap: Record<string, string> = {
    ts: "🟦",
    tsx: "⚛️",
    js: "🟨",
    jsx: "⚛️",
    py: "🐍",
    rs: "🦀",
    go: "🐹",
    java: "☕",
    cpp: "🔵",
    c: "🔷",
    cs: "🔷",
    php: "🐘",
    rb: "💎",
    swift: "🐦",
    kt: "🟣",
    scala: "🔴",
    sh: "🐚",
    bash: "🐚",
    zsh: "🐚",
    fish: "🐠",
    ps1: "💙",
    sql: "🗃️",
    html: "🌐",
    css: "🎨",
    scss: "🎨",
    sass: "🎨",
    less: "🎨",
    xml: "📄",
    json: "📄",
    yaml: "📄",
    yml: "📄",
    toml: "📄",
    ini: "⚙️",
    cfg: "⚙️",
    conf: "⚙️",
    md: "📝",
    txt: "📄",
    log: "📋",
    gitignore: "🚫",
    dockerfile: "🐳",
    makefile: "🔧",
    r: "📊",
    dart: "🎯",
    lua: "🌙",
    vim: "💚",
    tex: "📖",
  };

  return iconMap[ext || ""] || "📄";
}

export function getFileCategory(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const lowerName = fileName.toLowerCase();

  // Special files
  if (
    lowerName.includes("readme") ||
    lowerName.includes("license") ||
    ext === "md"
  ) {
    return "Documentation";
  }

  // Config files
  if (
    ["json", "yaml", "yml", "toml", "ini", "cfg", "conf"].includes(ext || "") ||
    lowerName.includes("config") ||
    lowerName.includes(".env") ||
    lowerName.includes("dockerfile") ||
    lowerName.includes("makefile")
  ) {
    return "Configuration";
  }

  // Programming languages
  if (
    [
      "ts",
      "tsx",
      "js",
      "jsx",
      "py",
      "rs",
      "go",
      "java",
      "cpp",
      "c",
      "cs",
      "php",
      "rb",
      "swift",
      "kt",
      "scala",
    ].includes(ext || "")
  ) {
    return "Source Code";
  }

  // Web files
  if (["html", "css", "scss", "sass", "less"].includes(ext || "")) {
    return "Web";
  }

  // Shell scripts
  if (["sh", "bash", "zsh", "fish", "ps1"].includes(ext || "")) {
    return "Scripts";
  }

  // Data files
  if (["sql", "csv", "xml"].includes(ext || "")) {
    return "Data";
  }

  return "Other";
}

export function organizeFiles(files: string[]): Record<string, string[]> {
  const organized: Record<string, string[]> = {};

  files.forEach((file) => {
    const category = getFileCategory(file);
    if (!organized[category]) {
      organized[category] = [];
    }
    organized[category].push(file);
  });

  // Sort files within each category
  Object.keys(organized).forEach((category) => {
    organized[category].sort();
  });

  return organized;
}

export async function getGitStatus(repoPath: string): Promise<GitStatus> {
  try {
    const status = await invoke<GitStatus>("get_git_status", { repoPath });
    return status;
  } catch (error) {
    console.error("Error getting git status:", error);
    throw error;
  }
}

export async function getLastFetchTime(repoPath: string): Promise<string | null> {
  try {
    return await invoke<string | null>('get_last_fetch_time', { repoPath });
  } catch (error) {
    console.error('Error getting last fetch time:', error);
    return null;
  }
}

export async function stageFile(repoPath: string, filePath: string): Promise<void> {
  try {
    await invoke<void>("stage_file", { repoPath, filePath });
  } catch (error) {
    console.error("Error staging file:", error);
    throw error;
  }
}

export async function unstageFile(repoPath: string, filePath: string): Promise<void> {
  try {
    await invoke<void>("unstage_file", { repoPath, filePath });
  } catch (error) {
    console.error("Error unstaging file:", error);
    throw error;
  }
}

export async function unstageAll(repoPath: string): Promise<void> {
  try {
    await invoke<void>("unstage_all", { repoPath });
  } catch (error) {
    console.error("Error unstaging all:", error);
    throw error;
  }
}

export async function createCommit(repoPath: string, message: string, files?: string[]): Promise<string> {
  try {
    const commitHash = await invoke<string>("create_commit", { 
      repoPath, 
      message, 
      files: files || [] 
    });
    return commitHash;
  } catch (error) {
    console.error("Error creating commit:", error);
    throw error;
  }
}

export async function suggestCommitMessage(repoPath: string, stagedFiles: string[]): Promise<string> {
  try {
    const suggestion = await invoke<string>("suggest_commit_message", { 
      repoPath, 
      stagedFiles 
    });
    return suggestion;
  } catch (error) {
    console.error("Error suggesting commit message:", error);
    throw error;
  }
}

export async function getFileDiff(repoPath: string, filePath: string): Promise<string> {
  try {
    const diff = await invoke<string>("get_file_diff", { repoPath, filePath });
    return diff;
  } catch (error) {
    console.error("Error getting file diff:", error);
    throw error;
  }
}

export async function getStagedDiff(repoPath: string, filePath: string): Promise<string> {
  try {
    const diff = await invoke<string>("get_staged_diff", { repoPath, filePath });
    return diff;
  } catch (error) {
    console.error("Error getting staged diff:", error);
    throw error;
  }
}

export async function getGitGraph(repoPath: string): Promise<GitGraph> {
  try {
    const graph = await invoke<GitGraph>("get_git_graph", { repoPath });
    return graph;
  } catch (error) {
    console.error("Error getting git graph:", error);
    throw error;
  }
}

export async function getRepositoryAnalytics(repoPath: string): Promise<RepositoryAnalytics> {
  try {
    const analytics = await invoke<RepositoryAnalytics>("get_repository_analytics", { repoPath });
    return analytics;
  } catch (error) {
    console.error("Error getting repository analytics:", error);
    throw error;
  }
}

export async function getMergeConflicts(repoPath: string): Promise<ConflictResolution[]> {
  try {
    const conflicts = await invoke<ConflictResolution[]>("get_merge_conflicts", { repoPath });
    return conflicts;
  } catch (error) {
    console.error("Error getting merge conflicts:", error);
    throw error;
  }
}

export async function resolveConflict(repoPath: string, filePath: string, resolution: string): Promise<void> {
  try {
    await invoke<void>("resolve_conflict", { repoPath, filePath, resolution });
  } catch (error) {
    console.error("Error resolving conflict:", error);
    throw error;
  }
}

// Remote operations
export async function fetchRepo(repoPath: string): Promise<string> {
  try {
    return await invoke<string>('fetch_repo', { repoPath });
  } catch (error) {
    console.error('Error fetching repo:', error);
    throw error;
  }
}

export async function pullRepo(repoPath: string, rebase: boolean = false): Promise<string> {
  try {
    return await invoke<string>('pull_repo', { repoPath, rebase });
  } catch (error) {
    console.error('Error pulling repo:', error);
    throw error;
  }
}

export async function pushRepo(repoPath: string, forceWithLease: boolean = false): Promise<string> {
  try {
    return await invoke<string>('push_repo', { repoPath, forceWithLease: forceWithLease });
  } catch (error) {
    console.error('Error pushing repo:', error);
    throw error;
  }
}

export async function undoLastCommit(repoPath: string, keepChanges: boolean = true): Promise<string> {
  try {
    return await invoke<string>('undo_last_commit', { repoPath, keepChanges });
  } catch (error) {
    console.error('Error undoing last commit:', error);
    throw error;
  }
}

export async function applyIndexPatch(repoPath: string, patch: string, reverse: boolean = false): Promise<string> {
  try {
    return await invoke<string>('apply_index_patch', { repoPath, patch, reverse });
  } catch (error) {
    console.error('Error applying index patch:', error);
    throw error;
  }
}

export async function getUnifiedDiff(repoPath: string, filePath: string, staged: boolean): Promise<UnifiedDiff> {
  try {
    return await invoke<UnifiedDiff>('get_unified_diff', { repoPath, filePath, staged });
  } catch (error) {
    console.error('Error getting unified diff:', error);
    throw error;
  }
}



// Enhanced commit message suggestion with conventional commits
export function generateCommitSuggestions(stagedFiles: string[]): CommitSuggestion[] {
  const suggestions: CommitSuggestion[] = [];
  
  // Analyze file types
  const hasSrcChanges = stagedFiles.some(f => f.includes('src/') || f.match(/\.(ts|js|tsx|jsx|py|rs|go|java)$/));
  const hasDocsChanges = stagedFiles.some(f => f.includes('readme') || f.endsWith('.md') || f.includes('docs/'));
  const hasConfigChanges = stagedFiles.some(f => 
    f.includes('package.json') || f.includes('cargo.toml') || f.includes('requirements.txt') ||
    f.match(/\.(toml|json|yaml|yml)$/)
  );
  const hasTestChanges = stagedFiles.some(f => f.includes('test') || f.includes('spec') || f.includes('__tests__'));
  
  // Generate suggestions based on file types
  if (hasSrcChanges) {
    suggestions.push({
      type: 'feat',
      scope: 'src',
      message: 'feat: add new functionality',
      description: 'New feature or enhancement'
    });
  }
  
  if (hasDocsChanges) {
    suggestions.push({
      type: 'docs',
      scope: 'docs',
      message: 'docs: update documentation',
      description: 'Documentation changes'
    });
  }
  
  if (hasConfigChanges) {
    suggestions.push({
      type: 'chore',
      scope: 'config',
      message: 'chore: update configuration',
      description: 'Configuration and dependency updates'
    });
  }
  
  if (hasTestChanges) {
    suggestions.push({
      type: 'test',
      scope: 'tests',
      message: 'test: add or update tests',
      description: 'Test additions or improvements'
    });
  }
  
  // Generic suggestions
  suggestions.push({
    type: 'fix',
    scope: 'general',
    message: 'fix: resolve issue',
    description: 'Bug fixes and issue resolution'
  });
  
  suggestions.push({
    type: 'refactor',
    scope: 'code',
    message: 'refactor: improve code structure',
    description: 'Code refactoring and improvements'
  });
  
  return suggestions;
}

// Utility functions for enhanced features
export function getTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

export function getCommitType(message: string): string {
  const conventionalTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build', 'revert'];
  const firstWord = message.split(':')[0].toLowerCase();
  return conventionalTypes.includes(firstWord) ? firstWord : 'other';
}

export function getCommitColor(type: string): string {
  const colorMap: Record<string, string> = {
    feat: '#10b981',
    fix: '#ef4444',
    docs: '#3b82f6',
    style: '#8b5cf6',
    refactor: '#f59e0b',
    test: '#06b6d4',
    chore: '#6b7280',
    perf: '#ec4899',
    ci: '#84cc16',
    build: '#f97316',
    revert: '#dc2626',
    other: '#6b7280'
  };
  return colorMap[type] || colorMap.other;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Build a lightweight story summary for a file from its commit list
export function computeFileStory(commits: Commit[]) {
  if (!commits || commits.length === 0) {
    return null;
  }

  // Assuming commits are ordered newest -> oldest
  const newest = commits[0];
  const oldest = commits[commits.length - 1];

  // Top authors by frequency
  const authorCounts = new Map<string, number>();
  for (const c of commits) {
    authorCounts.set(c.author, (authorCounts.get(c.author) || 0) + 1);
  }
  const topAuthors = Array.from(authorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, commits: count }));

  // Rough change magnitudes by content length delta
  let largestChangeIndex = 0;
  let largestChangeMagnitude = 0;
  let totalChurn = 0;
  for (let i = 0; i < commits.length - 1; i++) {
    const a = commits[i]?.content || "";
    const b = commits[i + 1]?.content || "";
    const delta = Math.abs(a.length - b.length);
    totalChurn += delta;
    if (delta > largestChangeMagnitude) {
      largestChangeMagnitude = delta;
      largestChangeIndex = i;
    }
  }

  // Time span
  const startDate = new Date(oldest.date);
  const endDate = new Date(newest.date);
  const timespanDays = Math.max(1, Math.round((+endDate - +startDate) / (1000 * 60 * 60 * 24)));

  return {
    newest,
    oldest,
    totalCommits: commits.length,
    timespanDays,
    topAuthors,
    totalChurn,
    largestChange: {
      commit: commits[largestChangeIndex],
      nextCommit: commits[largestChangeIndex + 1] || null,
      magnitude: largestChangeMagnitude,
      index: largestChangeIndex,
    },
  } as const;
}

export async function writeWorkingFile(repoPath: string, relativePath: string, contents: string): Promise<void> {
  try {
    await invoke<void>("write_repo_file", { repoPath, relativePath, contents });
  } catch (error) {
    console.error("Error writing working file:", error);
    throw error;
  }
}

export async function createWorktree(repoPath: string, branchName: string, worktreePath?: string): Promise<string> {
  try {
    const result = await invoke<string>("create_worktree", { 
      repoPath, 
      branchName, 
      worktreePath 
    });
    return result;
  } catch (error) {
    console.error("Error creating worktree:", error);
    throw error;
  }
}

export async function listWorktrees(repoPath: string): Promise<WorktreeInfo[]> {
  try {
    const worktrees = await invoke<WorktreeInfo[]>("list_worktrees", { repoPath });
    return worktrees;
  } catch (error) {
    console.error("Error listing worktrees:", error);
    throw error;
  }
}

export async function checkoutWorktreeCommit(worktreePath: string, commitHash: string): Promise<string> {
  try {
    const result = await invoke<string>("checkout_worktree_commit", { 
      worktreePath, 
      commitHash 
    });
    return result;
  } catch (error) {
    console.error("Error checking out commit in worktree:", error);
    throw error;
  }
}

export async function removeWorktree(repoPath: string, worktreePath: string): Promise<string> {
  try {
    const result = await invoke<string>("remove_worktree", { 
      repoPath, 
      worktreePath 
    });
    return result;
  } catch (error) {
    console.error("Error removing worktree:", error);
    throw error;
  }
}

export async function getWorktreeFileContent(
  worktreePath: string, 
  filePath: string, 
  commitHash?: string
): Promise<string> {
  try {
    const content = await invoke<string>("get_worktree_file_content", { 
      worktreePath, 
      filePath, 
      commitHash 
    });
    return content;
  } catch (error) {
    console.error("Error getting worktree file content:", error);
    throw error;
  }
}

export async function getWorktreeCommitHistory(
  worktreePath: string, 
  filePath: string, 
  limit?: number
): Promise<string> {
  try {
    const history = await invoke<string>("get_worktree_commit_history", { 
      worktreePath, 
      filePath, 
      limit 
    });
    return history;
  } catch (error) {
    console.error("Error getting worktree commit history:", error);
    throw error;
  }
}

