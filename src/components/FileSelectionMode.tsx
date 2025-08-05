import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  FileText, 
  GitBranch, 
  MagnifyingGlass, 
  CaretUp, 
  CaretDown, 
  X,
  Clock,
  Hash,
  User
} from '@phosphor-icons/react';
import { FileIcon } from './FileIcon';
import { getFileTypeColor } from '../utils/colorUtils';
import { getGitBranches, getGitCommits } from '../utils/index';

interface FileSelectionModeProps {
  availableFiles: string[];
  onFileSelect: (file: string) => void;
  onBranchSelect: (branch: string) => void;
  onCommitSelect: (commitHash: string) => void;
  onCreateVirtualBranch: (baseCommit: string, name: string) => void;
  directory: string;
}

interface SearchResult {
  file: string;
  category: string;
  score: number;
}

interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export default function FileSelectionMode({
  availableFiles,
  onFileSelect,
  onBranchSelect,
  onCommitSelect,
  onCreateVirtualBranch,
  directory
}: FileSelectionModeProps) {
  const [mode, setMode] = useState<'file' | 'branch'>('file');
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedResult, setFocusedResult] = useState(0);
  const [branches, setBranches] = useState<string[]>([]);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [virtualBranchName, setVirtualBranchName] = useState('');
  const [selectedCommit, setSelectedCommit] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Organize files for better search
  const organizeFiles = (files: string[]) => {
    const organized: Record<string, string[]> = {};
    files.forEach(file => {
      const category = file.includes('/') ? file.split('/')[0] : 'Root';
      if (!organized[category]) organized[category] = [];
      organized[category].push(file);
    });
    return organized;
  };

  const organizedFiles = organizeFiles(availableFiles);

  // Enhanced file search with scoring
  const searchFiles = (query: string): SearchResult[] => {
    if (!query.trim()) return [];
    
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    
    Object.entries(organizedFiles).forEach(([category, files]) => {
      files.forEach(file => {
        const fileName = file.split('/').pop() || '';
        const filePath = file.toLowerCase();
        
        let score = 0;
        
        // Exact match gets highest score
        if (fileName.toLowerCase() === queryLower) score += 100;
        else if (fileName.toLowerCase().startsWith(queryLower)) score += 50;
        else if (fileName.toLowerCase().includes(queryLower)) score += 25;
        
        // Path matching
        if (filePath.includes(queryLower)) score += 10;
        
        // Extension matching
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === queryLower) score += 30;
        
        if (score > 0) {
          results.push({ file, category, score });
        }
      });
    });
    
    return results.sort((a, b) => b.score - a.score);
  };

  const searchResults = searchFiles(searchTerm);

  // Load branches and commits when switching to branch mode
  useEffect(() => {
    if (mode === 'branch' && branches.length === 0) {
        const loadBranchesAndCommits = async () => {
    setIsLoading(true);
    try {
      // Load branches and commits from the backend
      const [branchesData, commitsData] = await Promise.all([
        getGitBranches(directory),
        getGitCommits(directory, 50)
      ]);
      
      setBranches(branchesData);
      setCommits(commitsData.map(commit => ({
        hash: commit.hash,
        author: commit.author,
        date: commit.date,
        message: commit.message
      })));
    } catch (error) {
      console.error('Failed to load branches and commits:', error);
    } finally {
      setIsLoading(false);
    }
  };
      
      loadBranchesAndCommits();
    }
  }, [mode, branches.length, directory]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (mode === 'file' && searchResults.length === 0) return;
    if (mode === 'branch' && commits.length === 0) return;
    
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const maxIndex = mode === 'file' ? searchResults.length - 1 : commits.length - 1;
      setFocusedResult((prev) => Math.min(prev + 1, maxIndex));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedResult((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (mode === 'file') {
        const result = searchResults[focusedResult];
        if (result) onFileSelect(result.file);
      } else {
        const commit = commits[focusedResult];
        if (commit) onCommitSelect(commit.hash);
      }
    }
  };

  const highlightMatch = (text: string, query: string) => {
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
  };

  return (
    <div className="file-selection-mode">
      {/* Mode Toggle */}
      <div className="mode-toggle mb-6">
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={mode === 'file' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('file')}
            className="flex items-center gap-2"
          >
            <FileText size={16} />
            File History
          </Button>
          <Button
            variant={mode === 'branch' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('branch')}
            className="flex items-center gap-2"
          >
            <GitBranch size={16} />
            Branch/Commit
          </Button>
        </div>
      </div>

      {mode === 'file' ? (
        <div className="file-mode">
          <div className="search-section mb-6">
            <h2 className="text-xl font-semibold mb-2">Choose a File</h2>
            <p className="text-muted-foreground mb-4">{availableFiles.length} files found</p>
            
            <div className="search-wrapper flex justify-center p-2 w-full">
              <div className="input-group flex w-[500px] items-center gap-1 bg-background rounded-md border border-input px-3 py-2 shadow-sm">
                <MagnifyingGlass className="w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  className="flex-1 border-none bg-transparent focus:ring-0 focus-visible:ring-0 focus:outline-none"
                  placeholder="Search for file (e.g., 'App.tsx', '.css', 'components/')"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                />
                
                {searchTerm && searchResults.length > 0 && (
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
                      <CaretUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFocusedResult((prev) =>
                          Math.min(prev + 1, searchResults.length - 1),
                        );
                        inputRef.current?.focus();
                      }}
                      disabled={focusedResult === searchResults.length - 1}
                      title="Next result (↓)"
                      tabIndex={-1}
                      className="nav-btn"
                    >
                      <CaretDown className="w-4 h-4" />
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
              </div>
            </div>
          </div>

          {/* File Results */}
          <div className="file-results">
            {searchTerm ? (
              <div className="search-results">
                {searchResults.map((result, idx) => (
                  <FileCard
                    key={result.file}
                    file={result.file}
                    idx={idx}
                    focusedResult={focusedResult}
                    selectFile={onFileSelect}
                    searchTerm={searchTerm}
                    highlightMatch={highlightMatch}
                    score={result.score}
                  />
                ))}
                {searchResults.length === 0 && (
                  <div className="no-results text-center text-muted-foreground py-8">
                    No files match your search.
                  </div>
                )}
              </div>
            ) : (
              <div className="file-categories">
                {Object.keys(organizedFiles).map((category) => (
                  <div key={category} className="file-category mb-6">
                    <div className="category-header flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium">{category}</h3>
                      <span className="category-count text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                        {organizedFiles[category].length}
                      </span>
                    </div>
                    <div className="category-files grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {organizedFiles[category].map((file) => (
                        <FileCard
                          key={file}
                          file={file}
                          idx={-1}
                          focusedResult={-1}
                          selectFile={onFileSelect}
                          searchTerm=""
                          highlightMatch={highlightMatch}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="branch-mode">
          <div className="search-section mb-6">
            <h2 className="text-xl font-semibold mb-2">Branch & Commit History</h2>
            <p className="text-muted-foreground mb-4">View branch history or jump to specific commits</p>
            
            <div className="search-wrapper flex justify-center p-2 w-full">
              <div className="input-group flex w-[500px] items-center gap-1 bg-background rounded-md border border-input px-3 py-2 shadow-sm">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <Input
                  className="flex-1 border-none bg-transparent focus:ring-0 focus-visible:ring-0 focus:outline-none"
                  placeholder="Search commits by hash, author, or message"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            </div>
          </div>

          {/* Branch Selection */}
          <div className="branch-section mb-6">
            <h3 className="text-lg font-medium mb-3">Branches</h3>
            <div className="branches grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {branches.map((branch) => (
                <button
                  type="button"
                  key={branch}
                  onClick={() => onBranchSelect(branch)}
                  className="branch-card p-3 border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    <span className="font-medium">{branch}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Commit History */}
          <div className="commit-section">
            <h3 className="text-lg font-medium mb-3">Recent Commits</h3>
            <div className="commits space-y-2">
              {commits
                .filter(commit => 
                  commit.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  commit.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  commit.message.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((commit, idx) => (
                                     <CommitCard
                     key={commit.hash}
                     commit={commit}
                     idx={idx}
                     focusedResult={focusedResult}
                     onSelect={(hash) => {
                       onCommitSelect(hash);
                       setSelectedCommit(hash);
                     }}
                     searchTerm={searchTerm}
                     highlightMatch={highlightMatch}
                     isSelected={selectedCommit === commit.hash}
                   />
                ))}
            </div>
          </div>

          {/* Virtual Branch Creation */}
          <div className="virtual-branch-section mt-8 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-medium mb-3">Create Virtual Branch</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a virtual branch from any commit to explore changes without affecting your working directory.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Virtual branch name"
                value={virtualBranchName}
                onChange={(e) => setVirtualBranchName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (selectedCommit && virtualBranchName) {
                    onCreateVirtualBranch(selectedCommit, virtualBranchName);
                    setVirtualBranchName('');
                    setSelectedCommit('');
                  }
                }}
                disabled={!selectedCommit || !virtualBranchName}
              >
                Create Branch
              </Button>
            </div>
          </div>
        </div>
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
  score,
}: {
  file: string;
  idx: number;
  focusedResult: number;
  selectFile: (file: string) => void;
  searchTerm: string;
  highlightMatch: (text: string, query: string) => React.ReactNode;
  score?: number;
}) {
  return (
    <button
      type="button"
      className={`file-card p-3 border rounded-lg hover:bg-muted transition-colors text-left ${
        idx === focusedResult ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => selectFile(file)}
    >
      <div className="flex items-center gap-3">
        <div className="file-icon-container">
          <div 
            className="file-type-indicator w-8 h-8 rounded flex items-center justify-center text-xs font-medium text-white"
            style={{ backgroundColor: getFileTypeColor(file) }}
            title={`${file.split('.').pop()?.toUpperCase()} file`}
          >
            {file.split('.').pop()?.charAt(0).toUpperCase() || 'F'}
          </div>
          <FileIcon fileName={file} size={16} className="text-muted-foreground mt-1" />
        </div>
        <div className="file-details flex-1 min-w-0">
          <div className="file-name font-medium truncate">
            {highlightMatch(file.split("/").pop() || "", searchTerm)}
          </div>
          {file.includes("/") && (
            <div className="file-path text-sm text-muted-foreground truncate">
              {file.substring(0, file.lastIndexOf("/"))}/
            </div>
          )}
          {score && (
            <div className="score text-xs text-muted-foreground">
              Relevance: {score}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function CommitCard({
  commit,
  idx,
  focusedResult,
  onSelect,
  searchTerm,
  highlightMatch,
  isSelected,
}: {
  commit: CommitInfo;
  idx: number;
  focusedResult: number;
  onSelect: (hash: string) => void;
  searchTerm: string;
  highlightMatch: (text: string, query: string) => React.ReactNode;
  isSelected?: boolean;
}) {
  return (
    <button
      type="button"
      className={`commit-card p-3 border rounded-lg hover:bg-muted transition-colors text-left ${
        idx === focusedResult ? "ring-2 ring-primary" : ""
      } ${isSelected ? "bg-primary/10 border-primary" : ""}`}
      onClick={() => onSelect(commit.hash)}
    >
      <div className="flex items-start gap-3">
        <div className="commit-hash font-mono text-sm bg-muted px-2 py-1 rounded">
          {commit.hash.substring(0, 7)}
        </div>
        <div className="commit-details flex-1 min-w-0">
          <div className="commit-message font-medium mb-1">
            {highlightMatch(commit.message, searchTerm)}
          </div>
          <div className="commit-meta text-sm text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1">
              <User size={12} />
              {highlightMatch(commit.author, searchTerm)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {commit.date}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
} 