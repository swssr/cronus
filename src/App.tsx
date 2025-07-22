import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

type Commit = {
  hash: string;
  author: string;
  date: string;
  message: string;
  content: string;
};

async function getDirectoryFiles(dirPath: string): Promise<string[]> {
  try {
    const files = await invoke<string[]>("list_directory_files", { dirPath });
    console.log({files})
    return files;
  } catch (error) {
    console.error("Error listing directory files", error);
    return [];
  }
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

  return (
    <main className="container">
      <h1>Git Time Machine</h1>

      <button onClick={pickDirectory}>Pick Git Repo Directory</button>

      {directory && (
        <div>
          <p>
            Directory: <code>{directory}</code>
          </p>
          
          {availableFiles.length > 0 && (
            <div className="file-list">
              <h3>Select a file ({availableFiles.length} files found):</h3>
              <div className="file-grid">
                {availableFiles.map((file) => (
                  <button
                    key={file}
                    className={`file-button ${selectedFile?.endsWith(file) ? 'selected' : ''}`}
                    onClick={() => selectFile(file)}
                    title={file}
                  >
                    <div className="file-name">{file.split('/').pop()}</div>
                    {file.includes('/') && (
                      <div className="file-path">{file.substring(0, file.lastIndexOf('/'))}/</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedFile && (
        <>
          <p>
            Viewing history for: <code>{selectedFile}</code>
          </p>

          <div className="timeline">
            {commits.map((commit) => (
              <div key={commit.hash} className="snapshot-card">
                <div className="snapshot-meta">
                  <code>{commit.hash.slice(0, 8)}</code> • {commit.author} •{" "}
                  {commit.date}
                </div>
                <pre className="snapshot-content">{commit.content}</pre>
                <div className="commit-message">{commit.message}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export default App;
