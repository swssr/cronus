import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";
import { Commit } from "./types";
import { getDirectoryFiles, getFileIcon, organizeFiles } from "./utils";
import { getGitHistoryWithContent } from "./git-utils";
import { FileHistoryCarousel } from "./components/file-history-carousel";

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
  const organizedFiles = organizeFiles(availableFiles);
  const categoryOrder = [
    "Source Code",
    "Web",
    "Scripts",
    "Configuration",
    "Documentation",
    "Data",
    "Other",
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        {directory && (
          <button className="back-btn" onClick={() => setDirectory(null)}>
            ← Back to Repository Selection
          </button>
        )}
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

          <div className="file-categories">
            {categoryOrder.map((category) => {
              if (
                !organizedFiles[category] ||
                organizedFiles[category].length === 0
              )
                return null;

              return (
                <div key={category} className="file-category">
                  <div className="category-header">
                    <h3>{category}</h3>
                    <span className="category-count">
                      {organizedFiles[category].length}
                    </span>
                  </div>

                  <div className="category-files">
                    {organizedFiles[category].map((file) => (
                      <button
                        key={file}
                        className="file-card"
                        onClick={() => selectFile(file)}
                      >
                        <div className="file-icon">{getFileIcon(file)}</div>
                        <div className="file-details">
                          <div className="file-name">
                            {file.split("/").pop()}
                          </div>
                          {file.includes("/") && (
                            <div className="file-path">
                              {file.substring(0, file.lastIndexOf("/"))}/
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
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
