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
  clearRecentRepositories,
} from "./utils/index";
import { FileHistoryCarousel } from "./components/file-history-carousel";
import { Badge } from "@/components/ui/badge";
import { Input } from "./components/ui/input";

function App() {
  const [directory, setDirectory] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [recentRepos, setRecentRepos] = useState<RecentRepository[]>([]);

  const [searchTerm, setSearchTerm] = useState<string>("");

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
  //const categoryOrder = [
  //  "Source Code",
  //  "Web",
  //  "Scripts",
  //  "Configuration",
  //  "Documentation",
  //  "Data",
  //  "Other",
  //];

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Value: ", event.target.value);
    setSearchTerm(event.target.value);
  };

  const filteredFiles = Object.fromEntries(
    Object.entries(organizedFiles).filter(([_key, value]) =>
      value.some((file) =>
        file.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    ),
  );

  console.log("Search results: ", filteredFiles);

  // Helper to highlight search matches
  function highlightMatch(text: string, query: string) {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.substring(0, index)}
        <span className="highlight">{text.substring(index, index + query.length)}</span>
        {text.substring(index + query.length)}
      </>
    );
  }

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
                            {repo.fileCount && (
                              <>
                                <Badge
                                  className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                                  variant="outline"
                                >
                                  {repo.fileCount}
                                </Badge>
                                <span>files</span>
                              </>
                            )}
                            <span>•</span>
                            <span>
                              {new Date(repo.lastAccessed).toLocaleDateString()}
                            </span>
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
            <div className="search-wrapper flex justify-center p-2 w-full">
              <Input
                className="w-[400px] indent-5"
                placeholder="Search for file"
                onChange={handleSearch}
                value={searchTerm}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="clear-search-btn ml-2 px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="file-categories">
            {Object.keys(filteredFiles).map((category) => {
              if (!filteredFiles[category] || filteredFiles[category].length === 0)
                return null;

              return (
                <div key={category} className="file-category">
                  <div className="category-header">
                    <h3>{category}</h3>
                    <span className="category-count">
                      {filteredFiles[category].length}
                    </span>
                  </div>

                  <div className="category-files">
                    {filteredFiles[category].map((file) => (
                      <button
                        key={file}
                        className="file-card"
                        onClick={() => selectFile(file)}
                      >
                        <div className="file-icon">{getFileIcon(file)}</div>
                        <div className="file-details">
                          <div className="file-name">
                            {highlightMatch(file.split("/").pop() || "", searchTerm)}
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
            {Object.keys(filteredFiles).length === 0 && (
              <div className="no-results text-center text-gray-500 mt-8">No files match your search.</div>
            )}
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
