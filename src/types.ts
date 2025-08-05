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
