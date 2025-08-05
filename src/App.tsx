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
import { CarouselView, ImmersiveView } from "./views";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { ChevronUp, ChevronDown, Search, X } from "lucide-react";
import { useRef } from "react";
import RecentRepoCard from "./components/RecentReposList";
import AppHeader from "./components/AppHeader";
import { getFileTypeColor } from "./utils/colorUtils";

function App() {
  const [directory, setDirectory] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [recentRepos, setRecentRepos] = useState<RecentRepository[]>([]);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [fileHistorySearchQuery, setFileHistorySearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<'carousel' | 'immersive'>('immersive');
  const [cardsToShow, setCardsToShow] = useState<1 | 3 | 5>(3);

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

  // Filter commits for file history search
  const filteredCommits = fileHistorySearchQuery.trim() 
    ? commits.filter(commit => 
        commit.message.toLowerCase().includes(fileHistorySearchQuery.toLowerCase()) ||
        commit.author.toLowerCase().includes(fileHistorySearchQuery.toLowerCase()) ||
        commit.content.toLowerCase().includes(fileHistorySearchQuery.toLowerCase())
      )
    : commits;

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

  // Flatten filtered files for keyboard navigation
  const flatResults: { category: string; file: string }[] = [];
  Object.entries(filteredFiles).forEach(([category, files]) => {
    files.forEach((file) => flatResults.push({ category, file }));
  });

  const [focusedResult, setFocusedResult] = useState(0);

  // Reset focus when searchTerm or results change
  useEffect(() => {
    setFocusedResult(0);
  }, []);

  // Helper to highlight search matches
  function highlightMatch(text: string, query: string) {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.substring(0, index)}
        <span className="highlight">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  }

  // Keyboard navigation handler
  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (flatResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusedResult((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedResult((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = flatResults[focusedResult];
      if (result) selectFile(result.file);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="app-container">
      <AppHeader
        setDirectory={(path) => setDirectory(path!)}
        directory={directory!}
        fileName={selectedFile ? fileName : undefined}
        searchQuery={fileHistorySearchQuery}
        onSearchChange={setFileHistorySearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        cardsToShow={cardsToShow}
        onCardsToShowChange={setCardsToShow}
        commits={commits}
        filteredCommits={filteredCommits}
      />

      {!directory ? (
        <div className="welcome-screen">
          <div className="welcome-content">
            <h2>Select a Repository</h2>
            <p>Choose a git repository to explore file history</p>
            <button
              type="button"
              className="pick-directory-btn"
              onClick={pickDirectory}
            >
              📁 Pick Repository
            </button>

            {recentRepos.length > 0 && (
              <RecentRepoCard
                handleClearRecentRepos={handleClearRecentRepos}
                recentRepos={recentRepos}
                openRepository={openRepository}
                handleRemoveRecentRepo={handleRemoveRecentRepo}
              />
            )}
          </div>
        </div>
      ) : !selectedFile ? (
        <div className="file-selection">
          <div className="selection-header">
            <h2>Choose a File</h2>
            <p>{availableFiles.length} files found</p>
            <div className="search-wrapper flex justify-center p-2 w-full">
              <div className="input-group flex w-[400px] items-center gap-1 bg-background rounded-md border border-input px-2 py-1 shadow-xs">
                <Input
                  ref={inputRef}
                  className="flex-1 border-none bg-transparent focus:ring-0 focus-visible:ring-0 focus:outline-none"
                  placeholder="Search for file"
                  onChange={handleSearch}
                  value={searchTerm}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                />
                {searchTerm && flatResults.length > 0 && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFocusedResult((prev) => Math.max(prev - 1, 0));
                        inputRef.current?.focus();
                      }}
                      disabled={focusedResult === 0}
                      title="Previous result (↑)"
                      tabIndex={-1}
                      className="nav-btn"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFocusedResult((prev) =>
                          Math.min(prev + 1, flatResults.length - 1),
                        );
                        inputRef.current?.focus();
                      }}
                      disabled={focusedResult === flatResults.length - 1}
                      title="Next result (↓)"
                      tabIndex={-1}
                      className="nav-btn"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSearchTerm("")}
                  title="Clear search"
                  tabIndex={-1}
                  style={{ visibility: searchTerm ? "visible" : "hidden" }}
                  className="clear-btn"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const result = flatResults[focusedResult];
                    if (result) selectFile(result.file);
                  }}
                  disabled={flatResults.length === 0}
                  title="Jump to result (Enter)"
                  tabIndex={-1}
                  className="search-btn"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="file-categories">
            {Object.keys(filteredFiles).map((category) => {
              if (
                !filteredFiles[category] ||
                filteredFiles[category].length === 0
              )
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
                    {filteredFiles[category].map((file) => {
                      // Find the index in flatResults
                      const idx = flatResults.findIndex(
                        (r) => r.category === category && r.file === file,
                      );
                      return (
                        <FileCard
                          key={file}
                          file={file}
                          idx={idx}
                          focusedResult={focusedResult}
                          selectFile={selectFile}
                          searchTerm={searchTerm}
                          highlightMatch={highlightMatch}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {Object.keys(filteredFiles).length === 0 && (
              <div className="no-results text-center text-gray-500 mt-8">
                No files match your search.
              </div>
            )}
          </div>

        </div>
              ) : (
          <ErrorBoundary 
            onError={(error, errorInfo) => {
              console.error('View Error:', error, errorInfo);
            }}
          >
            {viewMode === 'immersive' ? (
              <ImmersiveView 
                commits={filteredCommits} 
                fileName={fileName}
              />
            ) : (
              <CarouselView 
                commits={filteredCommits} 
                fileName={fileName}
                cardsToShow={cardsToShow}
              />
            )}
          </ErrorBoundary>
        )}
    </div>
  );
}

function FileCard({
  file,
  idx,
  focusedResult,
  selectFile,
  searchTerm,
  highlightMatch,
}: {
  file: string;
  idx: number;
  focusedResult: number;
  selectFile: (file: string) => void;
  searchTerm: string;
  highlightMatch: (text: string, query: string) => React.ReactNode;
}) {
  return (
    <button
      type="button"
      key={file}
      className={`file-card hover-lift focus-ring${idx === focusedResult ? " focused" : ""}`}
      onClick={() => selectFile(file)}
      style={{
        animationDelay: `${idx * 0.02}s`
      }}
    >
      <div className="file-icon-container animate-fade-in-fast">
        <div 
          className="file-type-indicator"
          style={{ backgroundColor: getFileTypeColor(file) }}
          title={`${file.split('.').pop()?.toUpperCase()} file`}
        >
          {file.split('.').pop()?.charAt(0).toUpperCase() || 'F'}
        </div>
        {getFileIcon(file)}
      </div>
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
  );
}

export default App;
