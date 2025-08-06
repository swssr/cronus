import { invoke } from "@tauri-apps/api/core";
import { Commit, RecentRepository, GitStatus, CommitSuggestion, GitGraph, RepositoryAnalytics, ConflictResolution } from "../types";

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

