import { useState, useEffect } from "react";
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
  getGitBranches,
  getGitCommits,
  getBranchHistory,
  createVirtualBranch,
  applyVirtualBranch,
  getVirtualBranches,
  deleteVirtualBranch,
} from "./utils/index";
import { CarouselView, ImmersiveView, EnhancedImmersiveView } from "./views";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { CaretUp, CaretDown, MagnifyingGlass, X, Moon, Sun } from "@phosphor-icons/react";
import { useRef } from "react";
import RecentRepoCard from "./components/RecentReposList";
import AppHeader from "./components/AppHeader";
import { FilePicker } from "./components/FilePicker";
import { getFileTypeColor } from "./utils/colorUtils";
import { FileIcon } from "./components/FileIcon";
import FileSelectionMode from "./components/FileSelectionMode";
import Notification from "./components/Notification";
import { ThemeToggle } from "./components/ThemeToggle";
import React from "react";

// Theme context and provider
type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'system';
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const updateTheme = () => {
      const isDarkMode = 
        theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      setIsDark(isDarkMode);
      root.classList.toggle('dark', isDarkMode);
    };

    updateTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}



function AppContent() {
  const { isDark, setTheme } = useTheme();
  const [directory, setDirectory] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [recentRepos, setRecentRepos] = useState<RecentRepository[]>([]);
  const [currentMode, setCurrentMode] = useState<'file' | 'branch'>('file');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [fileHistorySearchQuery, setFileHistorySearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<'carousel' | 'immersive'>('immersive');
  const [cardsToShow, setCardsToShow] = useState<1 | 3 | 5>(3);

  // Load recent repositories on component mount
  useEffect(() => {
    setRecentRepos(getRecentRepositories());
  }, []);

  async function openRepository(repoPath: string) {
    setDirectory(repoPath);
    const files = await getDirectoryFiles(repoPath);
    setAvailableFiles(files);
    setSelectedFile(null);
    setCommits([]);
    setCurrentMode('file');

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
    setCurrentMode('file');
    const history = await getGitHistoryWithContent(fullPath);
    setCommits(history);
  }

  async function selectBranch(branchName: string) {
    if (!directory) return;

    setSelectedFile(null);
    setCurrentMode('branch');
    const history = await getBranchHistory(directory, branchName);
    setCommits(history);
  }

  async function selectCommit(commitHash: string) {
    if (!directory) return;

    setSelectedFile(null);
    setCurrentMode('branch');
    // For now, we'll get the commit details and show it
    // In a real implementation, you might want to show the diff or specific file state
    const allCommits = await getGitCommits(directory, 100);
    const targetCommit = allCommits.find(c => c.hash === commitHash);
    if (targetCommit) {
      setCommits([targetCommit]);
    }
  }

  async function handleCreateVirtualBranch(baseCommit: string, branchName: string) {
    if (!directory) return;

    try {
      const result = await createVirtualBranch(directory, baseCommit, branchName);
      console.log('Virtual branch created:', result);
      setNotification({
        message: `Virtual branch '${branchName}' created successfully!`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to create virtual branch:', error);
      setNotification({
        message: `Failed to create virtual branch: ${error}`,
        type: 'error'
      });
    }
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

  const flatResults = Object.entries(filteredFiles).flatMap(([category, files]) =>
    files.map((file) => ({ category, file }))
  );

  const [focusedResult, setFocusedResult] = useState(0);

  function highlightMatch(text: string, query: string) {
    if (!query.trim()) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <mark className="bg-yellow-200 dark:bg-yellow-800">
          {text.substring(index, index + query.length)}
        </mark>
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
      <ThemeToggle 
        isDark={isDark}
        onToggle={() => setTheme(isDark ? 'light' : 'dark')}
        className="fixed top-4 right-4 z-50"
      />
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
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
          <FilePicker 
            onDirectorySelected={openRepository}
            isLoading={false}
          />

          {recentRepos.length > 0 && (
            <RecentRepoCard
              handleClearRecentRepos={handleClearRecentRepos}
              recentRepos={recentRepos}
              openRepository={openRepository}
              handleRemoveRecentRepo={handleRemoveRecentRepo}
            />
          )}
        </div>
      ) : !selectedFile && currentMode === 'file' ? (
        <FileSelectionMode
          availableFiles={availableFiles}
          onFileSelect={selectFile}
          onBranchSelect={selectBranch}
          onCommitSelect={selectCommit}
          onCreateVirtualBranch={handleCreateVirtualBranch}
          directory={directory}
        />
      ) : (
        <ErrorBoundary 
          onError={(error, errorInfo) => {
            console.error('View Error:', error, errorInfo);
          }}
        >
          {viewMode === 'immersive' ? (
            <EnhancedImmersiveView 
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

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
