export interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
  content: string;
  stats?: {
    additions: number;
    deletions: number;
  };
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
