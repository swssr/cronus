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
  FileText,
  Folder,
  GitCommitIcon
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
  currentMode?: 'file' | 'branch' | 'commit' | 'graph' | 'analytics' | 'conflicts';
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
  directory,
}: FileSelectionModeProps) {
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const [branchSearchTerm, setBranchSearchTerm] = useState('');
  const [focusedFileResult, setFocusedFileResult] = useState(0);
  const [focusedBranchResult, setFocusedBranchResult] = useState(0);
  const [branches, setBranches] = useState<string[]>([]);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [virtualBranchName, setVirtualBranchName] = useState('');
  const [selectedCommit, setSelectedCommit] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'files' | 'branches'>('files');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const branchInputRef = useRef<HTMLInputElement>(null);

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
        if (fileName.toLowerCase() === queryLower) {
          score += 100;
        } else if (fileName.toLowerCase().startsWith(queryLower)) {
          score += 50;
        } else if (fileName.toLowerCase().includes(queryLower)) {
          score += 25;
        } else if (filePath.includes(queryLower)) {
          score += 10;
        }
        
        if (score > 0) {
          results.push({ file, category, score });
        }
      });
    });
    
    return results.sort((a, b) => b.score - a.score);
  };

  const fileSearchResults = searchFiles(fileSearchTerm);

  // Load branches and commits when component mounts
  useEffect(() => {
    const loadBranchesAndCommits = async () => {
      try {
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
  }, [directory]);

  const handleFileSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (fileSearchResults.length === 0) return;
    
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusedFileResult((prev) => Math.min(prev + 1, fileSearchResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedFileResult((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = fileSearchResults[focusedFileResult];
      if (result) onFileSelect(result.file);
    }
  };

  const handleBranchSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const filteredCommits = commits.filter(commit => 
      commit.hash.toLowerCase().includes(branchSearchTerm.toLowerCase()) ||
      commit.author.toLowerCase().includes(branchSearchTerm.toLowerCase()) ||
      commit.message.toLowerCase().includes(branchSearchTerm.toLowerCase())
    );
    
    if (filteredCommits.length === 0) return;
    
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusedBranchResult((prev) => Math.min(prev + 1, filteredCommits.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedBranchResult((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const commit = filteredCommits[focusedBranchResult];
      if (commit) {
        onCommitSelect(commit.hash);
        setSelectedCommit(commit.hash);
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

  const filteredCommits = commits.filter(commit => 
    commit.hash.toLowerCase().includes(branchSearchTerm.toLowerCase()) ||
    commit.author.toLowerCase().includes(branchSearchTerm.toLowerCase()) ||
    commit.message.toLowerCase().includes(branchSearchTerm.toLowerCase())
  );

  return (
    <motion.div 
      className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Repository Explorer
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Select files to view their history or explore branches and commits
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          className="flex gap-1 mb-6 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'files'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <FileText size={16} />
            Files ({availableFiles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('branches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'branches'
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <GitBranch size={16} />
            Branches & Commits ({branches.length})
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'files' ? (
            <motion.div
              key="files-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <TreeStructure size={20} className="text-blue-600 dark:text-blue-400" />
                    Files
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Select a file to view its commit history
                  </p>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                  <MagnifyingGlass size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <Input
                    ref={fileInputRef}
                    className="pl-10 pr-10 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search files..."
                    onChange={(e) => setFileSearchTerm(e.target.value)}
                    value={fileSearchTerm}
                    onKeyDown={handleFileSearchKeyDown}
                  />
                  {fileSearchTerm && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFileSearchTerm("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>

                {/* File Results */}
                <div className="max-h-[600px] overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {fileSearchTerm ? (
                      <motion.div 
                        key="search-results"
                        className="space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {fileSearchResults.map((result, idx) => (
                          <FileCard
                            key={result.file}
                            file={result.file}
                            idx={idx}
                            focusedResult={focusedFileResult}
                            selectFile={onFileSelect}
                            searchTerm={fileSearchTerm}
                            highlightMatch={highlightMatch}
                          />
                        ))}
                        {fileSearchResults.length === 0 && (
                          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <FileText size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No files found</p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="file-categories"
                        className="space-y-6"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {Object.entries(organizedFiles).map(([category, files], categoryIndex) => (
                          <motion.div 
                            key={category} 
                            className="file-category"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: categoryIndex * 0.05 }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Folder size={16} />
                                {category}
                              </h3>
                              <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                                {files.length} files
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {files.map((file) => (
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
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="branches-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <GitBranch size={20} className="text-green-600 dark:text-green-400" />
                    Branches & Commits
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Explore branches and commit history
                  </p>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                  <Hash size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <Input
                    ref={branchInputRef}
                    className="pl-10 pr-10 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-green-500 focus:border-green-500"
                    placeholder="Search branches & commits..."
                    onChange={(e) => setBranchSearchTerm(e.target.value)}
                    value={branchSearchTerm}
                    onKeyDown={handleBranchSearchKeyDown}
                  />
                  {branchSearchTerm && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setBranchSearchTerm("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>

                {/* Content */}
                <div className="max-h-[600px] overflow-y-auto space-y-6">
                  {/* Branches Section */}
                  <div className="branches-section">
                    <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <GitBranch size={16} />
                      Branches
                    </h3>
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

                  {/* Commits Section */}
                  <div className="commits-section">
                    <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <GitCommitIcon size={16} />
                      Recent Commits
                    </h3>
                    <div className="space-y-2">
                      {filteredCommits.slice(0, 10).map((commit, idx) => (
                        <CommitCard
                          key={commit.hash}
                          commit={commit}
                          idx={idx}
                          focusedResult={focusedBranchResult}
                          onSelect={(hash) => {
                            onCommitSelect(hash);
                            setSelectedCommit(hash);
                          }}
                          searchTerm={branchSearchTerm}
                          highlightMatch={highlightMatch}
                          isSelected={selectedCommit === commit.hash}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Virtual Branch Creation */}
                  {selectedCommit && (
                    <motion.div 
                      className="virtual-branch-section bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Create Virtual Branch</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        Create a virtual branch from the selected commit.
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
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
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
  const fileExtension = file.split('.').pop()?.toLowerCase() || '';
  const fileName = file.split('/').pop() || '';
  const filePath = file.includes('/') ? file.substring(0, file.lastIndexOf('/')) : '';
  const fileColor = getFileTypeColor(file);
  
  return (
    <button
      type="button"
      className={`file-card p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left w-full ${
        idx === focusedResult ? "ring-2 ring-blue-500" : ""
      }`}
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
        </div>
        
        <FileIcon fileName={file} size={16} className="text-slate-400" />
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