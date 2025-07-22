import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

type Commit = {
  hash: string;
  author: string;
  date: string;
  message: string;
};

async function getGitHistory(filePath: string) {
  try {
    const result = await invoke<string>("get_git_history", { filePath });
    const output = result
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, date, message] = line.split("|");
        return { hash, author, date, message };
      });
    return output;
  } catch (error) {
    console.error("Error loading history", error);
    return [];
  }
}

function App() {
  const [directory, setDirectory] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [filePath, setFilePath] = useState<string | null>(null);

  const defaultFile = "README.md";

  async function pickDirectory() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select a Git Repository Directory",
    });

    if (typeof selected === "string") {
      setDirectory(selected);

      const targetFile = `${selected}/${defaultFile}`;
      setFilePath(targetFile);

      const history = await getGitHistory(targetFile);
      setCommits(history);
    }
  }

  return (
    <main className="container">
      <h1>Git Time Machine</h1>

      <button onClick={pickDirectory}>Pick Git Repo Directory</button>

      {directory && (
        <p>
          Picked directory: <code>{directory}</code>
        </p>
      )}

      {filePath && (
        <>
          <p>
            Viewing history for: <code>{filePath}</code>
          </p>

          <div className="card-stack">
            {commits.map((commit) => (
              <div key={commit.hash} className="commit-card">
                <div className="commit-hash">{commit.hash}</div>
                <div className="commit-meta">
                  <strong>{commit.author}</strong> — {commit.date}
                </div>
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
