import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";
import { Commit, RecentRepository } from "./types";
import { 
  getDirectoryFiles, 
  getFileIcon, 
  organizeFiles, 
  getGitHistoryWithContent,
  getRecentRepositories,
  addRecentRepository,
  removeRecentRepository,
  clearRecentRepositories
} from "./utils/index";
import { FileHistoryCarousel } from "./components/file-history-carousel";

function App() {
  const [directory, setDirectory] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [recentRepos, setRecentRepos] = useState<RecentRepository[]>([]);

  // Load recent repositories on component mount
  useEffect(() => {
    setRecentRepos(getRecentRepositories());
  }, []);

  async function pickDirectory() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select a Git Repository Directory",
    });

    if (typeof selected === "string") {
      await openRepository(selected);
    }
  }

  async function openRepository(repoPath: string) {
    setDirectory(repoPath);
    const files = await getDirectoryFiles(repoPath);
    setAvailableFiles(files);
    setSelectedFile(null);
    setCommits([]);
    
    // Add to recent repositories
    addRecentRepository(repoPath, files.length);
    setRecentRepos(getRecentRepositories());
  }

  function handleRemoveRecentRepo(repoPath: string) {
    removeRecentRepository(repoPath);
    setRecentRepos(getRecentRepositories());
  }

  function handleClearRecentRepos() {
    clearRecentRepositories();
    setRecentRepos([]);
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

            {recentRepos.length > 0 && (
              <div className="recent-repositories">
                <div className="recent-header">
                  <h3>Recent Repositories</h3>
                  <button 
                    className="clear-recents-btn" 
                    onClick={handleClearRecentRepos}
                    title="Clear all recent repositories"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="recent-repos-list">
                  {recentRepos.map((repo) => (
                    <div key={repo.path} className="recent-repo-card">
                      <button 
                        className="recent-repo-btn"
                        onClick={() => openRepository(repo.path)}
                        title={`Open ${repo.path}`}
                      >
                        <div className="repo-icon">📁</div>
                        <div className="repo-details">
                          <div className="repo-name">{repo.name}</div>
                          <div className="repo-path">{repo.path}</div>
                          <div className="repo-meta">
                            {repo.fileCount && <span>{repo.fileCount} files</span>}
                            <span>•</span>
                            <span>{new Date(repo.lastAccessed).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </button>
                      <button 
                        className="remove-repo-btn" 
                        onClick={() => handleRemoveRecentRepo(repo.path)}
                        title="Remove from recent repositories"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
