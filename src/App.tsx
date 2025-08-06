import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { Commit, RecentRepository, GitStatus, GitGraph, RepositoryAnalytics, ConflictResolution } from "./types";
import {
  getDirectoryFiles,
  getGitHistoryWithContent,
  getRecentRepositories,
  addRecentRepository,
  removeRecentRepository,
  clearRecentRepositories,
  getGitCommits,
  getBranchHistory,
  createVirtualBranch,
  getGitStatus,
  getGitGraph,
  getRepositoryAnalytics,
  getMergeConflicts,
} from "./utils/index";
import { CarouselView, EnhancedImmersiveView } from "./views";
import { ErrorBoundary } from "./components/ErrorBoundary";
import RecentRepoCard from "./components/RecentReposList";
import AppHeader from "./components/AppHeader";
import { FilePicker } from "./components/FilePicker";
import FileSelectionMode from "./components/FileSelectionMode";
import Notification from "./components/Notification";
import { ThemeToggle } from "./components/ThemeToggle";
import SmartCommitAssistant from "./components/SmartCommitAssistant";
import HelpOverlay from "./components/HelpOverlay";
import { GitGraphVisualization } from "./components/GitGraphVisualization";
import { RepositoryAnalyticsComponent } from "./components/RepositoryAnalytics";
import { ConflictResolver } from "./components/ConflictResolver";
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
  const [currentMode, setCurrentMode] = useState<'file' | 'branch' | 'commit' | 'graph' | 'analytics' | 'conflicts'>('file');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // New state for enhanced features
  const [gitGraph, setGitGraph] = useState<GitGraph | null>(null);
  const [repositoryAnalytics, setRepositoryAnalytics] = useState<RepositoryAnalytics | null>(null);
  const [mergeConflicts, setMergeConflicts] = useState<ConflictResolution[]>([]);
  const [selectedGraphNodes, setSelectedGraphNodes] = useState<Set<string>>(new Set());

  const [fileHistorySearchQuery, setFileHistorySearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<'carousel' | 'immersive'>('immersive');
  const [cardsToShow, setCardsToShow] = useState<1 | 3 | 5>(3);

  const loadGitStatus = useCallback(async () => {
    if (!directory) return;
    
    try {
      const status = await getGitStatus(directory);
      setGitStatus(status);
    } catch (error) {
      console.error('Failed to load git status:', error);
      setGitStatus(null);
    }
  }, [directory]);

  const loadGitGraph = useCallback(async () => {
    if (!directory) return;
    
    try {
      const graph = await getGitGraph(directory);
      setGitGraph(graph);
    } catch (error) {
      console.error('Failed to load git graph:', error);
      setGitGraph(null);
    }
  }, [directory]);

  const loadRepositoryAnalytics = useCallback(async () => {
    if (!directory) return;
    
    try {
      const analytics = await getRepositoryAnalytics(directory);
      setRepositoryAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load repository analytics:', error);
      setRepositoryAnalytics(null);
    }
  }, [directory]);

  const loadMergeConflicts = useCallback(async () => {
    if (!directory) return;
    
    try {
      const conflicts = await getMergeConflicts(directory);
      setMergeConflicts(conflicts);
    } catch (error) {
      console.error('Failed to load merge conflicts:', error);
      setMergeConflicts([]);
    }
  }, [directory]);

  // Load recent repositories on component mount
  useEffect(() => {
    setRecentRepos(getRecentRepositories());
  }, []);

  // Load git status when directory changes
  useEffect(() => {
    if (directory) {
      loadGitStatus();
      loadGitGraph();
      loadRepositoryAnalytics();
      loadMergeConflicts();
    }
  }, [directory, loadGitStatus, loadGitGraph, loadRepositoryAnalytics, loadMergeConflicts]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Question mark key to open help
      if (event.key === '?') {
        event.preventDefault();
        setShowHelp(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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

  const handleCommitCreated = (commitHash: string) => {
    setNotification({
      message: `Commit created successfully! Hash: ${commitHash}`,
      type: 'success'
    });
    // Refresh git status after commit
    loadGitStatus();
  };

  const handleGraphNodeClick = (node: any) => {
    console.log('Graph node clicked:', node);
    // You can implement navigation to the specific commit here
  };

  const handleGraphNodeSelect = (node: any) => {
    setSelectedGraphNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(node.hash)) {
        newSet.delete(node.hash);
      } else {
        newSet.add(node.hash);
      }
      return newSet;
    });
  };

  const handleConflictResolved = (filePath: string) => {
    setNotification({
      message: `Conflict in ${filePath} resolved successfully!`,
      type: 'success'
    });
    // Refresh conflicts
    loadMergeConflicts();
  };

  const fileName = selectedFile ? selectedFile.split("/").pop() || "" : "";

  // Filter commits for file history search
  const filteredCommits = fileHistorySearchQuery.trim() 
    ? commits.filter(commit => 
        commit.message.toLowerCase().includes(fileHistorySearchQuery.toLowerCase()) ||
        commit.author.toLowerCase().includes(fileHistorySearchQuery.toLowerCase()) ||
        commit.content.toLowerCase().includes(fileHistorySearchQuery.toLowerCase())
      )
    : commits;

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
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        onHelpClick={() => setShowHelp(true)}
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
      ) : currentMode === 'commit' ? (
        <div className="commit-mode-container p-6">
          {gitStatus && (
            <SmartCommitAssistant
              repoPath={directory}
              gitStatus={gitStatus}
              onStatusUpdate={loadGitStatus}
              onCommitCreated={handleCommitCreated}
            />
          )}
        </div>
      ) : currentMode === 'graph' ? (
        <div className="graph-mode-container p-6">
          {gitGraph ? (
            <GitGraphVisualization
              graph={gitGraph}
              onNodeClick={handleGraphNodeClick}
              onNodeSelect={handleGraphNodeSelect}
              selectedNodes={selectedGraphNodes}
            />
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-slate-600 dark:text-slate-400">Loading git graph...</p>
            </div>
          )}
        </div>
      ) : currentMode === 'analytics' ? (
        <div className="analytics-mode-container p-6">
          {repositoryAnalytics ? (
            <RepositoryAnalyticsComponent
              analytics={repositoryAnalytics}
            />
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-slate-600 dark:text-slate-400">Loading repository analytics...</p>
            </div>
          )}
        </div>
      ) : currentMode === 'conflicts' ? (
        <div className="conflicts-mode-container p-6">
          <ConflictResolver
            conflicts={mergeConflicts}
            repoPath={directory}
            onConflictResolved={handleConflictResolved}
          />
        </div>
      ) : !selectedFile && currentMode === 'file' ? (
        <FileSelectionMode
          availableFiles={availableFiles}
          onFileSelect={selectFile}
          onBranchSelect={selectBranch}
          onCommitSelect={selectCommit}
          onCreateVirtualBranch={handleCreateVirtualBranch}
          directory={directory}
          currentMode={currentMode}
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

      {/* Help Overlay */}
      <HelpOverlay 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
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
