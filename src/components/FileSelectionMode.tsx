import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  User,
  TreeStructure,
  GitCommit
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
  const [mode, setMode] = useState<'file' | 'branch'>('file');
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedResult, setFocusedResult] = useState(0);
  const [branches, setBranches] = useState<string[]>([]);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [virtualBranchName, setVirtualBranchName] = useState('');
  const [selectedCommit, setSelectedCommit] = useState<string>('');
  const [leftPaneScale, setLeftPaneScale] = useState(1);
  const [rightPaneScale, setRightPaneScale] = useState(1);
  const [universeMode, setUniverseMode] = useState<'balanced' | 'files' | 'branches'>('balanced');
  
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

  // Universe interaction handlers
  const handleUniverseToggle = (targetUniverse: 'files' | 'branches') => {
    if (universeMode === targetUniverse) {
      setUniverseMode('balanced');
      setLeftPaneScale(1);
      setRightPaneScale(1);
    } else {
      setUniverseMode(targetUniverse);
      if (targetUniverse === 'files') {
        setLeftPaneScale(1.1);
        setRightPaneScale(0.85);
      } else {
        setLeftPaneScale(0.85);
        setRightPaneScale(1.1);
      }
    }
  };

  return (
    <motion.div 
      className="file-selection-mode min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Cosmic Header */}
      <motion.div 
        className="cosmic-header text-center py-8 relative overflow-hidden"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        <motion.h1 
          className="text-4xl font-bold text-white mb-2 relative z-10"
          animate={{ 
            textShadow: universeMode === 'balanced' 
              ? '0 0 20px rgba(147, 51, 234, 0.5)' 
              : universeMode === 'files'
              ? '0 0 20px rgba(59, 130, 246, 0.5)'
              : '0 0 20px rgba(34, 197, 94, 0.5)'
          }}
          transition={{ duration: 0.5 }}
        >
          Code Universe Explorer
        </motion.h1>
        <p className="text-purple-200">Navigate through files and branches in parallel dimensions</p>
      </motion.div>

      {/* Universe Controls */}
      <motion.div 
        className="universe-controls flex justify-center mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex gap-4 p-2 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10">
          <motion.button
            onClick={() => handleUniverseToggle('files')}
            className={`universe-toggle px-6 py-3 rounded-xl flex items-center gap-3 transition-all duration-300 ${
              universeMode === 'files' 
                ? 'bg-blue-500/30 text-blue-200 shadow-lg shadow-blue-500/25' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <TreeStructure size={20} />
            <div className="text-left">
              <div className="font-medium">File Universe</div>
              <div className="text-xs opacity-70">{availableFiles.length} entities</div>
            </div>
          </motion.button>
          
          <motion.button
            onClick={() => handleUniverseToggle('branches')}
            className={`universe-toggle px-6 py-3 rounded-xl flex items-center gap-3 transition-all duration-300 ${
              universeMode === 'branches' 
                ? 'bg-green-500/30 text-green-200 shadow-lg shadow-green-500/25' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <GitCommit size={20} />
            <div className="text-left">
              <div className="font-medium">Branch Universe</div>
              <div className="text-xs opacity-70">{commits.length} commits</div>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* Split Universe Layout */}
      <div className="universe-split-layout flex gap-6 px-6 pb-8 min-h-[600px]">
        {/* File Universe Pane */}
        <motion.div 
          className="file-universe-pane relative"
          animate={{ 
            scale: leftPaneScale,
            flex: universeMode === 'files' ? 2 : universeMode === 'branches' ? 0.5 : 1,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <motion.div 
            className="universe-container bg-gradient-to-br from-blue-900/30 to-cyan-900/30 backdrop-blur-md rounded-3xl border border-blue-500/20 p-6 h-full relative overflow-hidden"
            animate={{
              boxShadow: universeMode === 'files' 
                ? '0 0 40px rgba(59, 130, 246, 0.3), inset 0 0 40px rgba(59, 130, 246, 0.1)' 
                : '0 0 20px rgba(59, 130, 246, 0.1)',
            }}
            transition={{ duration: 0.5 }}
          >
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400 rounded-full"
                  animate={{
                    x: [0, Math.random() * 400],
                    y: [0, Math.random() * 300],
                    opacity: [0.2, 0.8, 0.2]
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: i * 0.2
                  }}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                />
              ))}
            </div>
            
            <div className="relative z-10">
              <motion.div 
                className="universe-header mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-blue-200 mb-2 flex items-center gap-3">
                  <TreeStructure size={28} />
                  File Universe
                </h2>
                <p className="text-blue-300/70">{availableFiles.length} files across dimensions</p>
              </motion.div>

              {/* Search Interface */}
              <motion.div 
                className="search-section mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="search-wrapper">
                  <div className="input-group flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-xl border border-blue-500/30 px-4 py-3">
                    <MagnifyingGlass className="w-5 h-5 text-blue-300" />
                    <Input
                      ref={inputRef}
                      className="flex-1 border-none bg-transparent text-white placeholder-blue-300/50 focus:ring-0 focus-visible:ring-0 focus:outline-none"
                      placeholder="Search the file cosmos..."
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
                        className="text-blue-300 hover:text-white hover:bg-blue-500/20"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* File Results */}
              <div className="file-results max-h-[500px] overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  {searchTerm ? (
                    <motion.div 
                      key="search-results"
                      className="search-results space-y-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      {searchResults.map((result, idx) => (
                        <EnhancedFileCard
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
                        <motion.div 
                          className="no-results text-center text-blue-300/50 py-12"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <TreeStructure size={48} className="mx-auto mb-4 opacity-30" />
                          <p>No files found in this dimension</p>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="file-categories"
                      className="file-categories space-y-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      {Object.entries(organizedFiles).map(([category, files], categoryIndex) => (
                        <motion.div 
                          key={category} 
                          className="file-category"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: categoryIndex * 0.1 }}
                        >
                          <div className="category-header flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-blue-200">{category}</h3>
                            <span className="category-count text-sm text-blue-300/70 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30">
                              {files.length}
                            </span>
                          </div>
                          <div className="category-files grid grid-cols-1 gap-2">
                            {files.map((file, fileIndex) => (
                              <motion.div
                                key={file}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: categoryIndex * 0.1 + fileIndex * 0.02 }}
                              >
                                <EnhancedFileCard
                                  file={file}
                                  idx={-1}
                                  focusedResult={-1}
                                  selectFile={onFileSelect}
                                  searchTerm=""
                                  highlightMatch={highlightMatch}
                                />
                              </motion.div>
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
        </motion.div>

        {/* Branch Universe Pane */}
        <motion.div 
          className="branch-universe-pane relative"
          animate={{ 
            scale: rightPaneScale,
            flex: universeMode === 'branches' ? 2 : universeMode === 'files' ? 0.5 : 1,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <motion.div 
            className="universe-container bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-md rounded-3xl border border-green-500/20 p-6 h-full relative overflow-hidden"
            animate={{
              boxShadow: universeMode === 'branches' 
                ? '0 0 40px rgba(34, 197, 94, 0.3), inset 0 0 40px rgba(34, 197, 94, 0.1)' 
                : '0 0 20px rgba(34, 197, 94, 0.1)',
            }}
            transition={{ duration: 0.5 }}
          >
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={crypto.randomUUID()}
                  className="absolute w-1 h-1 bg-green-400 rounded-full"
                  animate={{
                    x: [0, Math.random() * 400],
                    y: [0, Math.random() * 300],
                    opacity: [0.2, 0.8, 0.2]
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: i * 0.2
                  }}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                />
              ))}
            </div>
            
            <div className="relative z-10">
              <motion.div 
                className="universe-header mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-green-200 mb-2 flex items-center gap-3">
                  <GitCommit size={28} />
                  Branch Universe
                </h2>
                <p className="text-green-300/70">Navigate through {branches.length} branches & {commits.length} commits</p>
              </motion.div>

              {/* Search Interface */}
              <motion.div 
                className="search-section mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="search-wrapper">
                  <div className="input-group flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-xl border border-green-500/30 px-4 py-3">
                    <Hash className="w-5 h-5 text-green-300" />
                    <Input
                      className="flex-1 border-none bg-transparent text-white placeholder-green-300/50 focus:ring-0 focus-visible:ring-0 focus:outline-none"
                      placeholder="Search branches & commits..."
                      onChange={(e) => setSearchTerm(e.target.value)}
                      value={searchTerm}
                      onKeyDown={handleSearchKeyDown}
                    />
                  </div>
                </div>
              </motion.div>

              <div className="branch-content max-h-[500px] overflow-y-auto custom-scrollbar space-y-6">
                {/* Branches Section */}
                <motion.div 
                  className="branches-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <h3 className="text-lg font-semibold text-green-200 mb-4 flex items-center gap-2">
                    <GitBranch size={20} />
                    Active Branches
                  </h3>
                  <div className="branches-grid grid grid-cols-1 gap-2">
                    {branches.map((branch, idx) => (
                      <motion.button
                        key={branch}
                        type="button"
                        onClick={() => onBranchSelect(branch)}
                        className="branch-card p-4 bg-green-500/10 backdrop-blur-sm border border-green-500/20 rounded-xl hover:bg-green-500/20 hover:border-green-400/30 transition-all duration-300 text-left group"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + idx * 0.05 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="branch-icon p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                            <GitBranch className="w-4 h-4 text-green-300" />
                          </div>
                          <div>
                            <div className="font-medium text-green-200">{branch}</div>
                            <div className="text-xs text-green-300/60">Click to explore timeline</div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Commits Section */}
                <motion.div 
                  className="commits-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <h3 className="text-lg font-semibold text-green-200 mb-4 flex items-center gap-2">
                    <Clock size={20} />
                    Recent Commits
                  </h3>
                  <div className="commits-timeline space-y-3">
                    {commits
                      .filter(commit => 
                        commit.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        commit.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        commit.message.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((commit, idx) => (
                        <EnhancedCommitCard
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
                          animationDelay={1.0 + idx * 0.05}
                        />
                      ))}
                  </div>
                </motion.div>

                {/* Virtual Branch Creation */}
                <motion.div 
                  className="virtual-branch-section bg-gradient-to-r from-purple-500/10 to-green-500/10 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <h3 className="text-lg font-semibold text-purple-200 mb-3 flex items-center gap-2">
                    <GitBranch size={20} className="text-purple-300" />
                    Create Virtual Branch
                  </h3>
                  <p className="text-sm text-purple-300/70 mb-4">
                    Create a virtual branch from any commit to explore changes without affecting your working directory.
                  </p>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Virtual branch name"
                      value={virtualBranchName}
                      onChange={(e) => setVirtualBranchName(e.target.value)}
                      className="flex-1 bg-purple-500/10 border-purple-500/20 text-white placeholder-purple-300/50"
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
                      className="bg-gradient-to-r from-purple-500 to-green-500 hover:from-purple-600 hover:to-green-600 text-white font-medium"
                    >
                      Create Branch
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function EnhancedFileCard({
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
  const fileExtension = file.split('.').pop()?.toLowerCase() || '';
  const fileName = file.split('/').pop() || '';
  const filePath = file.includes('/') ? file.substring(0, file.lastIndexOf('/')) : '';
  const fileColor = getFileTypeColor(file);
  
  return (
    <motion.button
      type="button"
      className={`file-card p-4 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl hover:bg-blue-500/20 hover:border-blue-400/30 transition-all duration-300 text-left group w-full ${
        idx === focusedResult ? "ring-2 ring-blue-400 bg-blue-500/25" : ""
      }`}
      onClick={() => selectFile(file)}
      whileHover={{ scale: 1.02, x: 5 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-4">
        <motion.div 
          className="file-icon-container relative"
          whileHover={{ rotate: 5, scale: 1.1 }}
        >
          <div 
            className="file-type-indicator w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg"
            style={{ 
              backgroundColor: fileColor,
              boxShadow: `0 0 20px ${adjustColorOpacity(fileColor, 0.4)}`
            }}
            title={`${fileExtension.toUpperCase()} file`}
          >
            {fileExtension.charAt(0).toUpperCase() || 'F'}
          </div>
          <motion.div
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <FileIcon fileName={file} size={10} className="text-white" />
          </motion.div>
        </motion.div>
        
        <div className="file-details flex-1 min-w-0">
          <div className="file-name font-semibold text-blue-100 mb-1 group-hover:text-white transition-colors">
            {highlightMatch(fileName, searchTerm)}
          </div>
          {filePath && (
            <div className="file-path text-sm text-blue-300/70 mb-1 truncate">
              📁 {filePath}/
            </div>
          )}
          {score && (
            <div className="score text-xs text-blue-300/50 flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              Relevance: {score}
            </div>
          )}
        </div>
        
        <motion.div
          className="file-action-indicator opacity-0 group-hover:opacity-100 transition-opacity"
          initial={{ x: 10 }}
          whileHover={{ x: 0 }}
        >
          <div className="w-6 h-6 bg-blue-400/20 rounded-full flex items-center justify-center">
            <CaretDown className="w-3 h-3 text-blue-300 rotate-[-90deg]" />
          </div>
        </motion.div>
      </div>
    </motion.button>
  );
}

function EnhancedCommitCard({
  commit,
  idx,
  focusedResult,
  onSelect,
  searchTerm,
  highlightMatch,
  isSelected,
  animationDelay = 0,
}: {
  commit: CommitInfo;
  idx: number;
  focusedResult: number;
  onSelect: (hash: string) => void;
  searchTerm: string;
  highlightMatch: (text: string, query: string) => React.ReactNode;
  isSelected?: boolean;
  animationDelay?: number;
}) {
  const authorColor = getAuthorColor(commit.author);
  const commitDate = new Date(commit.date);
  const isRecent = Date.now() - commitDate.getTime() < 7 * 24 * 60 * 60 * 1000; // Last 7 days
  
  return (
    <motion.button
      type="button"
      className={`commit-card p-4 bg-green-500/10 backdrop-blur-sm border border-green-500/20 rounded-xl hover:bg-green-500/20 hover:border-green-400/30 transition-all duration-300 text-left group w-full relative ${
        idx === focusedResult ? "ring-2 ring-green-400 bg-green-500/25" : ""
      } ${isSelected ? "bg-green-500/25 border-green-400 shadow-lg shadow-green-500/20" : ""}`}
      onClick={() => onSelect(commit.hash)}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay }}
      whileHover={{ scale: 1.02, x: 5 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Timeline connector */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400/50 to-green-600/50 rounded-r-full" />
      
      <div className="flex items-start gap-4 relative">
        {/* Commit hash with enhanced styling */}
        <motion.div 
          className="commit-hash-container"
          whileHover={{ scale: 1.05 }}
        >
          <div 
            className="commit-hash font-mono text-xs bg-black/30 backdrop-blur-sm px-3 py-2 rounded-lg border shadow-lg"
            style={{
              borderColor: adjustColorOpacity(authorColor, 0.3),
              color: authorColor,
              boxShadow: `0 0 15px ${adjustColorOpacity(authorColor, 0.2)}`
            }}
          >
            {commit.hash.substring(0, 7)}
          </div>
          {isRecent && (
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>
        
        <div className="commit-details flex-1 min-w-0">
          <div className="commit-message font-semibold text-green-100 mb-2 group-hover:text-white transition-colors">
            {highlightMatch(commit.message, searchTerm)}
          </div>
          
          <div className="commit-meta flex items-center gap-4 text-sm">
            <motion.span 
              className="flex items-center gap-2 px-2 py-1 rounded-lg"
              style={{
                backgroundColor: adjustColorOpacity(authorColor, 0.15),
                color: authorColor,
                border: `1px solid ${adjustColorOpacity(authorColor, 0.3)}`
              }}
              whileHover={{ scale: 1.05 }}
            >
              <User size={12} />
              {highlightMatch(commit.author, searchTerm)}
            </motion.span>
            
            <span className="flex items-center gap-2 text-green-300/70">
              <Clock size={12} />
              <span className="font-mono text-xs">
                {commitDate.toLocaleDateString('en', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </span>
          </div>
        </div>
        
        <motion.div
          className="commit-action-indicator opacity-0 group-hover:opacity-100 transition-opacity"
          initial={{ x: 10 }}
          whileHover={{ x: 0 }}
        >
          <div className="w-8 h-8 bg-green-400/20 rounded-full flex items-center justify-center">
            <GitCommit className="w-4 h-4 text-green-300" />
          </div>
        </motion.div>
      </div>
    </motion.button>
  );
} 