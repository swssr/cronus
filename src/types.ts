export interface CommitFile {
  filename: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions?: number;
  deletions?: number;
  patch?: string;
}

export interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
  content: string;
  files?: CommitFile[];
  stats?: {
    additions: number;
    deletions: number;
  };
  parents?: string[];
  branches?: string[];
  tags?: string[];
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'staged';
  additions?: number;
  deletions?: number;
}

export interface GitStatus {
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
  untracked: string[];
  current_branch: string;
  ahead: number;
  behind: number;
}

export interface CommitSuggestion {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  scope?: string;
  message: string;
  description?: string;
}

export type FileNode = {
  name: string;
  path: string;
  isFile: boolean;
  children?: FileNode[];
};

export type RepoCommit = {
  hash: string;
  author: string;
  date: string;
  message: string;
  changedFiles: string[];
};

export interface DiffOptions {
  baseCommit: string; // Hash of commit to compare against
  compareMode: 'current' | 'previous' | 'custom';
  showLineNumbers: boolean;
  contextLines: number;
}

export interface DiffResult {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}

export interface RecentRepository {
  path: string;
  name: string;
  lastAccessed: string; // ISO date string
  fileCount?: number;
  description?: string;
}

// New types for enhanced features
export interface GitGraphNode {
  hash: string;
  author: string;
  date: string;
  message: string;
  parents: string[];
  children: string[];
  branches: string[];
  tags: string[];
  x: number;
  y: number;
}

export interface GitGraph {
  nodes: GitGraphNode[];
  edges: Array<{
    from: string;
    to: string;
    edge_type: 'parent' | 'merge' | 'rebase';
  }>;
}

export interface RepositoryAnalytics {
  commitFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  topAuthors: Array<{
    name: string;
    commits: number;
    additions: number;
    deletions: number;
  }>;
  fileChangePatterns: Array<{
    file: string;
    changes: number;
    lastModified: string;
    churn: number;
  }>;
  branchActivity: Array<{
    name: string;
    commits: number;
    lastCommit: string;
    isActive: boolean;
  }>;
  technicalDebt: Array<{
    file: string;
    issues: string[];
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface ConflictResolution {
  file: string;
  conflicts: Array<{
    start: number;
    end: number;
    ours: string;
    theirs: string;
    base: string;
  }>;
  resolved: boolean;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  dismissible: boolean;
  autoDismiss?: number;
}
