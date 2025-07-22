import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import Editor from "@monaco-editor/react";
import "./App.css";
import { Commit, FileNode } from "./types";

async function getDirectoryFiles(dirPath: string): Promise<string[]> {
  try {
    const files = await invoke<string[]>("list_directory_files", { dirPath });
    console.log({ files });
    return files;
  } catch (error) {
    console.error("Error listing directory files", error);
    return [];
  }
}

function buildFileTree(filePaths: string[]): FileNode[] {
  const root: FileNode[] = [];

  filePaths.forEach((filePath) => {
    const parts = filePath.split("/");
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const fullPath = parts.slice(0, index + 1).join("/");

      let existingNode = currentLevel.find((node) => node.name === part);

      if (!existingNode) {
        existingNode = {
          name: part,
          path: fullPath,
          isFile,
          children: isFile ? undefined : [],
        };
        currentLevel.push(existingNode);
      }

      if (!isFile && existingNode.children) {
        currentLevel = existingNode.children;
      }
    });
  });

  return root;
}

function getFileLanguage(fileName: string): string {
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

function FileTreeNode({
  node,
  onFileSelect,
  selectedFile,
  level = 0,
}: {
  node: FileNode;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  if (node.isFile) {
    return (
      <div
        className={`tree-file ${selectedFile?.endsWith(node.path) ? "selected" : ""}`}
        style={{ paddingLeft: `${level * 16 + 20}px` }}
        onClick={() => onFileSelect(node.path)}
      >
        <span className="file-icon">📄</span>
        {node.name}
      </div>
    );
  }

  return (
    <div className="tree-folder">
      <div
        className="folder-header"
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="folder-icon">{isExpanded ? "📂" : "📁"}</span>
        {node.name}
        <span className="folder-count">
          ({node.children?.filter((child) => child.isFile).length || 0})
        </span>
      </div>
      {isExpanded && node.children && (
        <div className="folder-children">
          {node.children
            .sort((a, b) => {
              if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                onFileSelect={onFileSelect}
                selectedFile={selectedFile}
                level={level + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

async function getGitHistoryWithContent(filePath: string): Promise<Commit[]> {
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
        withContent.push({ ...entry, content });
      } catch (e) {
        console.error(`Could not fetch content for ${entry.hash}`, e);
        withContent.push({
          ...entry,
          content: "// Error loading file content",
        });
      }
    }

    return withContent;
  } catch (error) {
    console.error("Error loading history", error);
    return [];
  }
}

function App() {
  const [directory, setDirectory] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);

  async function pickDirectory() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select a Git Repository Directory",
    });

    if (typeof selected === "string") {
      setDirectory(selected);
      const files = await getDirectoryFiles(selected);
      const tree = buildFileTree(files);
      setFileTree(tree);
      setSelectedFile(null);
      setCommits([]);
      setSelectedCommit(null);
    }
  }

  async function selectFile(relativePath: string) {
    if (!directory) return;

    const fullPath = `${directory}/${relativePath}`;
    setSelectedFile(fullPath);
    const history = await getGitHistoryWithContent(fullPath);
    setCommits(history);
    setSelectedCommit(history[0] || null); // Auto-select latest commit
  }

  const totalFiles = fileTree.reduce((count, node) => {
    const countFiles = (n: FileNode): number => {
      if (n.isFile) return 1;
      return (
        n.children?.reduce((acc, child) => acc + countFiles(child), 0) || 0
      );
    };
    return count + countFiles(node);
  }, 0);

  const fileName = selectedFile ? selectedFile.split("/").pop() || "" : "";
  const fileLanguage = fileName ? getFileLanguage(fileName) : "plaintext";

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>⏰ Git Time Machine</h1>
          <button className="pick-directory-btn" onClick={pickDirectory}>
            📁 Pick Repository
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar - File Tree */}
        <aside className="sidebar">
          {directory ? (
            <>
              <div className="sidebar-header">
                <h3>📂 Files</h3>
                <span className="file-count">{totalFiles} files</span>
              </div>

              {fileTree.length > 0 && (
                <div className="file-tree">
                  {fileTree
                    .sort((a, b) => {
                      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
                      return a.name.localeCompare(b.name);
                    })
                    .map((node) => (
                      <FileTreeNode
                        key={node.path}
                        node={node}
                        onFileSelect={selectFile}
                        selectedFile={selectedFile}
                      />
                    ))}
                </div>
              )}
            </>
          ) : (
            <div className="sidebar-empty">
              <p>Select a repository to browse files</p>
            </div>
          )}
        </aside>

        <main className="main-content">
          {selectedFile ? (
            <>
              <div className="file-info">
                <h2>{fileName}</h2>
                <p>{selectedFile}</p>
              </div>

              <div className="content-layout">
                <div className="timeline-panel">
                  <h3>📜 History ({commits.length} commits)</h3>
                  <div className="timeline">
                    {commits.map((commit) => (
                      <div
                        key={commit.hash}
                        className={`commit-card ${selectedCommit?.hash === commit.hash ? "active" : ""}`}
                        onClick={() => setSelectedCommit(commit)}
                      >
                        <div className="commit-header">
                          <code className="commit-hash">
                            {commit.hash.slice(0, 8)}
                          </code>
                          <span className="commit-date">{commit.date}</span>
                        </div>
                        <div className="commit-author">{commit.author}</div>
                        <div className="commit-message">{commit.message}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Code Editor */}
                <div className="editor-panel">
                  {selectedCommit && (
                    <>
                      <div className="editor-header">
                        <h3>💾 Content at {selectedCommit.hash.slice(0, 8)}</h3>
                        <span className="language-badge">{fileLanguage}</span>
                      </div>
                      <div className="editor-container">
                        <Editor
                          height="100%"
                          language={fileLanguage}
                          value={selectedCommit.content}
                          theme="vs-dark"
                          options={{
                            readOnly: true,
                            minimap: { enabled: true },
                            fontSize: 14,
                            lineNumbers: "on",
                            wordWrap: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="main-empty">
      <div className="empty-state">
        <h2>Cronus</h2>
        <p>git time machine</p>
      </div>
    </div>
  );
}

export default App;
