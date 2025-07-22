export type Commit = {
  hash: string;
  author: string;
  date: string;
  message: string;
  content: string;
};

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
