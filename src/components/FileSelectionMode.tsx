import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  GitBranch, 
  MagnifyingGlass, 
  X,
  Clock,
  Hash,
  User,
  TreeStructure,
  GitCommit,
  Minus,
  Plus
} from '@phosphor-icons/react';
import { FileIcon } from './FileIcon';
import { getFileTypeColor, getAuthorColor, adjustColorOpacity } from '../utils/colorUtils';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedResult, setFocusedResult] = useState(0);
  const [branches, setBranches] = useState<string[]>([]);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [virtualBranchName, setVirtualBranchName] = useState('');
  const [selectedCommit, setSelectedCommit] = useState<string>('');
  const [leftPaneFocused, setLeftPaneFocused] = useState(false);
  const [rightPaneFocused, setRightPaneFocused] = useState(false);
  const [focusMode, setFocusMode] = useState<'include' | 'exclude'>('include');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [excludedFiles, setExcludedFiles] = useState<Set<string>>(new Set());
  const [mode] = useState<'file' | 'branch'>('file');
  
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

  // Enhanced file search with scoring and focus by negation
  const searchFiles = (query: string): SearchResult[] => {
    if (!query.trim()) return [];
    
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    
    Object.entries(organizedFiles).forEach(([category, files]) => {
      files.forEach(file => {
        // Apply focus by negation logic
        const isExcluded = excludedFiles.has(file);
        const isSelected = selectedFiles.has(file);
        
        if (focusMode === 'exclude' && isExcluded) return;
        if (focusMode === 'include' && !isSelected && selectedFiles.size > 0) return;
        
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

  // Focus handlers for smooth pane interactions
  const handleLeftPaneEnter = () => {
    setLeftPaneFocused(true);
    setRightPaneFocused(false);
  };
  
  const handleRightPaneEnter = () => {
    setRightPaneFocused(true);
    setLeftPaneFocused(false);
  };
  
  const handlePaneLeave = () => {
    setLeftPaneFocused(false);
    setRightPaneFocused(false);
  };

  // Focus by negation handlers
  const handleFileToggle = (file: string) => {
    if (focusMode === 'include') {
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        if (newSet.has(file)) {
          newSet.delete(file);
        } else {
          newSet.add(file);
        }
        return newSet;
      });
    } else {
      setExcludedFiles(prev => {
        const newSet = new Set(prev);
        if (newSet.has(file)) {
          newSet.delete(file);
        } else {
          newSet.add(file);
        }
        return newSet;
      });
    }
  };

  const clearFocus = () => {
    setSelectedFiles(new Set());
    setExcludedFiles(new Set());
  };

  return (
    <motion.div 
      className="min-h-screen bg-slate-50 dark:bg-slate-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="split-layout w-full flex gap-4 px-6 py-8 min-h-[600px]">
        {/* File Explorer Pane */}
        <motion.div 
          className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
          animate={{
            flex: leftPaneFocused ? 2 : rightPaneFocused ? 0.6 : 1,
            scale: leftPaneFocused ? 1.02 : rightPaneFocused ? 0.98 : 1
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          onMouseEnter={handleLeftPaneEnter}
          onMouseLeave={handlePaneLeave}
        >
          <div className="p-6 h-full">
            <motion.div 
              className="header mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <TreeStructure size={20} className="text-blue-600 dark:text-blue-400" />
                Files
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{availableFiles.length} files found</p>
            </motion.div>

            {/* Focus by Negation Controls */}
            <motion.div 
              className="focus-controls mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Focus Mode</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearFocus}
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={focusMode === 'include' ? 'default' : 'outline'}
                  onClick={() => setFocusMode('include')}
                  className="flex items-center gap-1"
                >
                  <Plus size={14} />
                  Include
                </Button>
                <Button
                  size="sm"
                  variant={focusMode === 'exclude' ? 'default' : 'outline'}
                  onClick={() => setFocusMode('exclude')}
                  className="flex items-center gap-1"
                >
                  <Minus size={14} />
                  Exclude
                </Button>
              </div>
              
              {focusMode === 'include' && selectedFiles.size > 0 && (
                <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                  Showing only {selectedFiles.size} selected files
                </div>
              )}
              
              {focusMode === 'exclude' && excludedFiles.size > 0 && (
                <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                  Excluding {excludedFiles.size} files
                </div>
              )}
            </motion.div>

            <motion.div 
              className="search-section mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="relative">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input
                  ref={inputRef}
                  className="pl-10 pr-10 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search files..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchTerm && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            </motion.div>

            <div className="file-results max-h-[500px] overflow-y-auto">
              <AnimatePresence mode="wait">
                {searchTerm ? (
                  <motion.div 
                    key="search-results"
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {searchResults.map((result, idx) => (
                      <CleanFileCard
                        key={result.file}
                        file={result.file}
                        idx={idx}
                        focusedResult={focusedResult}
                        selectFile={onFileSelect}
                        searchTerm={searchTerm}
                        highlightMatch={highlightMatch}
                        score={result.score}
                        focusMode={focusMode}
                        isSelected={focusMode === 'include' ? selectedFiles.has(result.file) : excludedFiles.has(result.file)}
                        onToggle={handleFileToggle}
                      />
                    ))}
                    {searchResults.length === 0 && (
                      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        <TreeStructure size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No files found</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="file-categories"
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {Object.entries(organizedFiles).map(([category, files], categoryIndex) => {
                      const filteredFiles = files.filter(file => {
                        if (focusMode === 'exclude' && excludedFiles.has(file)) return false;
                        if (focusMode === 'include' && selectedFiles.size > 0 && !selectedFiles.has(file)) return false;
                        return true;
                      });
                      
                      if (filteredFiles.length === 0) return null;
                      
                      return (
                        <motion.div 
                          key={category} 
                          className="file-category"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: categoryIndex * 0.05 }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-slate-700 dark:text-slate-300">{category}</h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                              {filteredFiles.length}/{files.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            {filteredFiles.map((file) => (
                              <CleanFileCard
                                key={file}
                                file={file}
                                idx={-1}
                                focusedResult={-1}
                                selectFile={onFileSelect}
                                searchTerm=""
                                highlightMatch={highlightMatch}
                                focusMode={focusMode}
                                isSelected={focusMode === 'include' ? selectedFiles.has(file) : excludedFiles.has(file)}
                                onToggle={handleFileToggle}
                              />
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Branch Explorer Pane */}
        <motion.div 
          className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
          animate={{
            flex: rightPaneFocused ? 2 : leftPaneFocused ? 0.6 : 1,
            scale: rightPaneFocused ? 1.02 : leftPaneFocused ? 0.98 : 1
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          onMouseEnter={handleRightPaneEnter}
          onMouseLeave={handlePaneLeave}
        >
          <div className="p-6 h-full">
            <motion.div 
              className="header mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <GitBranch size={20} className="text-green-600 dark:text-green-400" />
                Branches & Commits
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{branches.length} branches • {commits.length} commits</p>
            </motion.div>

            <motion.div 
              className="search-section mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <div className="relative">
                <Hash size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-10 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-green-500 focus:border-green-500"
                  placeholder="Search branches & commits..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            </motion.div>

            <div className="branch-content max-h-[500px] overflow-y-auto space-y-6">
              <div className="branches-section">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Branches</h3>
                <div className="grid grid-cols-1 gap-2 mb-6">
                  {branches.map((branch) => (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => onBranchSelect(branch)}
                      className="branch-card p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <GitBranch size={16} className="text-green-600 dark:text-green-400" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">{branch}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="commits-section">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Recent Commits</h3>
                <div className="space-y-2">
                  {commits
                    .filter(commit => 
                      commit.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      commit.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      commit.message.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((commit) => (
                      <CleanCommitCard
                        key={commit.hash}
                        commit={commit}
                        idx={0}
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

              <div className="virtual-branch-section bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Create Virtual Branch</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Create a virtual branch from any commit to explore changes.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Branch name"
                    value={virtualBranchName}
                    onChange={(e) => setVirtualBranchName(e.target.value)}
                    className="flex-1 text-sm"
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
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Create
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function CleanFileCard({
  file,
  idx,
  focusedResult,
  selectFile,
  searchTerm,
  highlightMatch,
  score,
  focusMode,
  isSelected,
  onToggle,
}: {
  file: string;
  idx: number;
  focusedResult: number;
  selectFile: (file: string) => void;
  searchTerm: string;
  highlightMatch: (text: string, query: string) => React.ReactNode;
  score?: number;
  focusMode?: 'include' | 'exclude';
  isSelected?: boolean;
  onToggle?: (file: string) => void;
}) {
  const fileExtension = file.split('.').pop()?.toLowerCase() || '';
  const fileName = file.split('/').pop() || '';
  const filePath = file.includes('/') ? file.substring(0, file.lastIndexOf('/')) : '';
  const fileColor = getFileTypeColor(file);
  
  return (
    <div className="flex items-center gap-2">
      {onToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(file);
          }}
          className={`focus-toggle p-1 rounded transition-colors ${
            isSelected 
              ? focusMode === 'include' 
                ? 'bg-blue-500 text-white' 
                : 'bg-red-500 text-white'
              : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-500'
          }`}
        >
          {focusMode === 'include' ? <Plus size={12} /> : <Minus size={12} />}
        </button>
      )}
      
      <button
        type="button"
        className={`file-card p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left flex-1 ${
          idx === focusedResult ? "ring-2 ring-blue-500" : ""
        } ${isSelected ? focusMode === 'include' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : ""}`}
        onClick={() => selectFile(file)}
      >
        <div className="flex items-center gap-3">
          <div 
            className="file-type-indicator w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: fileColor }}
            title={`${fileExtension.toUpperCase()} file`}
          >
            {fileExtension.charAt(0).toUpperCase() || 'F'}
          </div>
          
          <div className="file-details flex-1 min-w-0">
            <div className="file-name font-medium text-slate-900 dark:text-slate-100 truncate">
              {highlightMatch(fileName, searchTerm)}
            </div>
            {filePath && (
              <div className="file-path text-sm text-slate-500 dark:text-slate-400 truncate">
                {filePath}/
              </div>
            )}
            {score && (
              <div className="score text-xs text-slate-400 dark:text-slate-500">
                Match: {score}
              </div>
            )}
          </div>
          
          <FileIcon fileName={file} size={16} className="text-slate-400" />
        </div>
      </button>
    </div>
  );
}

function CleanCommitCard({
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
  const authorColor = getAuthorColor(commit.author);
  const commitDate = new Date(commit.date);
  
  return (
    <button
      type="button"
      className={`commit-card p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left w-full ${
        idx === focusedResult ? "ring-2 ring-green-500" : ""
      } ${isSelected ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700" : ""}`}
      onClick={() => onSelect(commit.hash)}
    >
      <div className="flex items-start gap-3">
        <div 
          className="commit-hash font-mono text-xs px-2 py-1 rounded text-white"
          style={{ backgroundColor: adjustColorOpacity(authorColor, 0.8) }}
        >
          {commit.hash.substring(0, 7)}
        </div>
        
        <div className="commit-details flex-1 min-w-0">
          <div className="commit-message font-medium text-slate-900 dark:text-slate-100 mb-1">
            {highlightMatch(commit.message, searchTerm)}
          </div>
          
          <div className="commit-meta flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <User size={12} />
              {highlightMatch(commit.author, searchTerm)}
            </span>
            
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {commitDate.toLocaleDateString('en', { 
                month: 'short', 
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
        
        <GitCommit size={16} className="text-slate-400 dark:text-slate-500" />
      </div>
    </button>
  );
} 