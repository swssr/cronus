import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import Editor from "@monaco-editor/react";
import "./App.css";
import { Commit } from "./types";

async function getDirectoryFiles(dirPath: string): Promise<string[]> {
  try {
    const files = await invoke<string[]>("list_directory_files", { dirPath });
    return files;
  } catch (error) {
    console.error("Error listing directory files", error);
    return [];
  }
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

function CarouselCard({ commit, index }: { commit: Commit; index: number }) {
  const fileName = commit.content ? "file" : "file";
  const language = getFileLanguage(fileName);

  return (
    <div className={`carousel-card gradient-${(index % 3) + 1}`}>
      <div className="card-header">
        <div className="commit-info">
          <code className="commit-hash">{commit.hash.slice(0, 8)}</code>
          <span className="commit-author">{commit.author}</span>
          <span className="commit-date">{commit.date}</span>
        </div>
        <div className="commit-message">{commit.message}</div>
      </div>
      
      <div className="card-content">
        <Editor
          height="400px"
          language={language}
          value={commit.content}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "off",
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            scrollbar: { vertical: 'auto', horizontal: 'auto' },
            folding: false,
            glyphMargin: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            overviewRulerLanes: 0,
          }}
        />
      </div>
    </div>
  );
}

function FileHistoryCarousel({ commits, fileName }: { commits: Commit[]; fileName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % commits.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + commits.length) % commits.length);
  };

  if (commits.length === 0) {
    return (
      <div className="carousel-loading">
        <div className="loading-spinner"></div>
        <p>Loading file history...</p>
      </div>
    );
  }

  return (
    <div className="carousel-container">
      <div className="carousel-header">
        <h2>{fileName}</h2>
        <p>{commits.length} commits in history</p>
      </div>

      <button className="carousel-nav prev" onClick={prevSlide}>
        ‹
      </button>
      
      <div className="carousel-content">
        <CarouselCard commit={commits[currentIndex]} index={currentIndex} />
      </div>
      
      <button className="carousel-nav next" onClick={nextSlide}>
        ›
      </button>
      
      <div className="carousel-dots">
        {commits.slice(0, 10).map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
        {commits.length > 10 && <span className="dots-more">+{commits.length - 10}</span>}
      </div>
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
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);

  async function pickDirectory() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select a Git Repository Directory",
    });

    if (typeof selected === "string") {
      setDirectory(selected);
      const files = await getDirectoryFiles(selected);
      setAvailableFiles(files);
      setSelectedFile(null);
      setCommits([]);
    }
  }

  async function selectFile(fileName: string) {
    if (!directory) return;

    const fullPath = `${directory}/${fileName}`;
    setSelectedFile(fullPath);
    const history = await getGitHistoryWithContent(fullPath);
    setCommits(history);
  }

  const fileName = selectedFile ? selectedFile.split("/").pop() || "" : "";

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Cronus</h1>
        <p>git time machine</p>
      </header>

      {!directory ? (
        <div className="welcome-screen">
          <div className="welcome-content">
            <h2>Select a Repository</h2>
            <p>Choose a git repository to explore file history</p>
            <button className="pick-directory-btn" onClick={pickDirectory}>
              📁 Pick Repository
            </button>
          </div>
        </div>
      ) : !selectedFile ? (
        <div className="file-selection">
          <div className="selection-header">
            <h2>Choose a File</h2>
            <p>{availableFiles.length} files found</p>
          </div>
          
          <div className="file-grid">
            {availableFiles.map((file) => (
              <button
                key={file}
                className="file-card"
                onClick={() => selectFile(file)}
              >
                <div className="file-icon">📄</div>
                <div className="file-name">{file.split('/').pop()}</div>
                {file.includes('/') && (
                  <div className="file-path">{file.substring(0, file.lastIndexOf('/'))}/</div>
                )}
              </button>
            ))}
          </div>
          
          <button className="back-btn" onClick={() => setDirectory(null)}>
            ← Back to Repository Selection
          </button>
        </div>
      ) : (
        <FileHistoryCarousel commits={commits} fileName={fileName} />
      )}
    </div>
  );
}

export default App;
