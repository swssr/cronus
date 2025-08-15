import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  GitBranch, 
  Clock, 
  ArrowsLeftRight,
  X,
  Trash,
  Plus,
  Calendar,
  User
} from '@phosphor-icons/react';
import { 
  createWorktree, 
  listWorktrees, 
  removeWorktree,
  getWorktreeFileContent,
  getWorktreeCommitHistory
} from '../utils/index';
import { WorktreeInfo, CommitInfo } from '../types';

interface BranchComparisonProps {
  repoPath: string;
  filePath: string;
  onClose: () => void;
}

export default function BranchComparison({ repoPath, filePath, onClose }: BranchComparisonProps) {
  const [leftBranch, setLeftBranch] = useState<string>('');
  const [rightBranch, setRightBranch] = useState<string>('');
  const [leftCommit, setLeftCommit] = useState<string>('');
  const [rightCommit, setRightCommit] = useState<string>('');
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
  const [leftContent, setLeftContent] = useState<string>('');
  const [rightContent, setRightContent] = useState<string>('');
  const [leftCommits, setLeftCommits] = useState<CommitInfo[]>([]);
  const [rightCommits, setRightCommits] = useState<CommitInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [newBranchName, setNewBranchName] = useState<string>('');

  // Load available worktrees on mount
  useEffect(() => {
    loadWorktrees();
  }, []);

  const loadWorktrees = useCallback(async () => {
    try {
      setError('');
      const worktreesData = await listWorktrees(repoPath);
      setWorktrees(worktreesData);
    } catch (error) {
      setError('Failed to load worktrees');
      console.error('Failed to load worktrees:', error);
    }
  }, [repoPath]);

  const createNewWorktree = async (branchName: string) => {
    if (!branchName.trim()) return;
    
    try {
      setIsLoading(true);
      setError('');
      await createWorktree(repoPath, branchName);
      await loadWorktrees();
      setNewBranchName('');
    } catch (error) {
      setError(`Failed to create worktree for branch '${branchName}'`);
      console.error('Failed to create worktree:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeWorktreeByPath = async (worktreePath: string) => {
    try {
      setError('');
      await removeWorktree(repoPath, worktreePath);
      await loadWorktrees();
    } catch (error) {
      setError('Failed to remove worktree');
      console.error('Failed to remove worktree:', error);
    }
  };

  const loadFileContent = useCallback(async (worktreePath: string, commitHash?: string) => {
    try {
      const content = await getWorktreeFileContent(worktreePath, filePath, commitHash);
      return content;
    } catch (error) {
      console.error('Failed to load file content:', error);
      return 'File not found or cannot be read';
    }
  }, [filePath]);

  const loadCommitHistory = useCallback(async (worktreePath: string) => {
    try {
      const history = await getWorktreeCommitHistory(worktreePath, filePath, 50);
      return parseCommitHistory(history);
    } catch (error) {
      console.error('Failed to load commit history:', error);
      return [];
    }
  }, [filePath]);

  const parseCommitHistory = (history: string): CommitInfo[] => {
    return history
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, author, date, ...messageParts] = line.split('|');
        return {
          hash: hash?.trim() || '',
          author: author?.trim() || '',
          date: date?.trim() || '',
          message: messageParts.join('|')?.trim() || ''
        };
      })
      .filter(commit => commit.hash && commit.author);
  };

  const compareFiles = useCallback(async () => {
    if (!leftBranch || !rightBranch) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      // Find worktree paths for the selected branches
      const leftWorktree = worktrees.find(wt => wt.branch === leftBranch);
      const rightWorktree = worktrees.find(wt => wt.branch === rightBranch);
      
      if (!leftWorktree || !rightWorktree) {
        setError('Selected branches do not have associated worktrees');
        return;
      }

      // Load commit histories
      const [leftHistory, rightHistory] = await Promise.all([
        loadCommitHistory(leftWorktree.path),
        loadCommitHistory(rightWorktree.path)
      ]);
      
      setLeftCommits(leftHistory);
      setRightCommits(rightHistory);
      
      // Set initial commits (most recent)
      if (leftHistory.length > 0) {
        setLeftCommit(leftHistory[0].hash);
      }
      if (rightHistory.length > 0) {
        setRightCommit(rightHistory[0].hash);
      }
      
      // Load initial file contents
      await updateFileContents();
      
    } catch (error) {
      setError('Failed to compare files');
      console.error('Failed to compare files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [leftBranch, rightBranch, worktrees, loadFileContent, loadCommitHistory]);

  const updateFileContents = useCallback(async () => {
    if (!leftBranch || !rightBranch || !leftCommit || !rightCommit) return;
    
    try {
      const leftWorktree = worktrees.find(wt => wt.branch === leftBranch);
      const rightWorktree = worktrees.find(wt => wt.branch === rightBranch);
      
      if (!leftWorktree || !rightWorktree) return;
      
      const [leftContentData, rightContentData] = await Promise.all([
        loadFileContent(leftWorktree.path, leftCommit),
        loadFileContent(rightWorktree.path, rightCommit)
      ]);
      
      setLeftContent(leftContentData);
      setRightContent(rightContentData);
    } catch (error) {
      console.error('Failed to update file contents:', error);
    }
  }, [leftBranch, rightBranch, leftCommit, rightCommit, worktrees, loadFileContent]);

  // Update file contents when commits change
  useEffect(() => {
    updateFileContents();
  }, [leftCommit, rightCommit, updateFileContents]);

  const handleCommitSelect = (side: 'left' | 'right', commitHash: string) => {
    if (side === 'left') {
      setLeftCommit(commitHash);
    } else {
      setRightCommit(commitHash);
    }
  };

  const availableBranches = worktrees.map(wt => wt.branch).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Branch Comparison</h2>
            <p className="text-sm text-muted-foreground">Comparing: {filePath}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Configuration */}
        <div className="flex gap-4 p-4 border-b">
          {/* Left Branch */}
          <div className="flex-1 space-y-2">
            <label htmlFor="left-branch" className="text-sm font-medium">Left Branch</label>
            <div className="flex gap-2">
              <select
                id="left-branch"
                value={leftBranch}
                onChange={(e) => setLeftBranch(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="">Select branch</option>
                {availableBranches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Branch */}
          <div className="flex-1 space-y-2">
            <label htmlFor="right-branch" className="text-sm font-medium">Right Branch</label>
            <div className="flex gap-2">
              <select
                id="right-branch"
                value={rightBranch}
                onChange={(e) => setRightBranch(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="">Select branch</option>
                {availableBranches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Create New Branch */}
          <div className="flex-1 space-y-2">
            <label htmlFor="new-branch" className="text-sm font-medium">Create New Branch</label>
            <div className="flex gap-2">
              <Input
                id="new-branch"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Branch name"
                className="text-sm"
              />
              <Button 
                onClick={() => createNewWorktree(newBranchName)}
                disabled={isLoading || !newBranchName.trim()}
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button 
            onClick={compareFiles} 
            disabled={!leftBranch || !rightBranch || isLoading}
            className="self-end"
          >
            <ArrowsLeftRight className="w-4 h-4 mr-2" />
            Compare
          </Button>
        </div>

        {/* Worktree Management */}
        <div className="px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Active Worktrees</h3>
            <Button variant="outline" size="sm" onClick={loadWorktrees}>
              Refresh
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {worktrees.map((worktree) => (
              <div
                key={worktree.path}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs border ${
                  worktree.isCurrent 
                    ? 'bg-primary/20 border-primary/30 text-primary' 
                    : 'bg-background border-border'
                }`}
              >
                <GitBranch className="w-3 h-3" />
                <span className="font-medium">{worktree.branch || 'detached'}</span>
                {worktree.isCurrent && <span className="text-xs">(current)</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
                  onClick={() => removeWorktreeByPath(worktree.path)}
                >
                  <Trash className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {/* Left Panel */}
          <div className="flex-1 flex flex-col border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-medium">{leftBranch || 'Left Branch'}</h3>
              <div className="text-sm text-muted-foreground">
                Commit: {leftCommit ? leftCommit.substring(0, 8) : 'Select commit'}
              </div>
            </div>
            
            {/* Commit Timeline */}
            <div className="flex-1 overflow-y-auto p-3 border-b">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Commit History
              </h4>
              {leftCommits.map((commit) => (
                <button
                  key={commit.hash}
                  type="button"
                  className={`w-full text-left p-2 rounded cursor-pointer hover:bg-muted mb-1 transition-colors ${
                    leftCommit === commit.hash ? 'bg-primary/10 border border-primary/20' : ''
                  }`}
                  onClick={() => handleCommitSelect('left', commit.hash)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCommitSelect('left', commit.hash);
                    }
                  }}
                >
                  <div className="text-sm font-mono text-primary">{commit.hash.substring(0, 8)}</div>
                  <div className="text-xs font-medium truncate">{commit.message}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <User className="w-3 h-3" />
                    <span>{commit.author}</span>
                    <Calendar className="w-3 h-3" />
                    <span>{commit.date}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* File Content */}
            <div className="flex-1 overflow-auto p-3 bg-muted/20">
              <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                {leftContent || 'Select a commit to view file content'}
              </pre>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 flex flex-col border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-medium">{rightBranch || 'Right Branch'}</h3>
              <div className="text-sm text-muted-foreground">
                Commit: {rightCommit ? rightCommit.substring(0, 8) : 'Select commit'}
              </div>
            </div>
            
            {/* Commit Timeline */}
            <div className="flex-1 overflow-y-auto p-3 border-b">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Commit History
              </h4>
              {rightCommits.map((commit) => (
                <button
                  key={commit.hash}
                  type="button"
                  className={`w-full text-left p-2 rounded cursor-pointer hover:bg-muted mb-1 transition-colors ${
                    rightCommit === commit.hash ? 'bg-primary/10 border border-primary/20' : ''
                  }`}
                  onClick={() => handleCommitSelect('right', commit.hash)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCommitSelect('right', commit.hash);
                    }
                  }}
                >
                  <div className="text-sm font-mono text-primary">{commit.hash.substring(0, 8)}</div>
                  <div className="text-xs font-medium truncate">{commit.message}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <User className="w-3 h-3" />
                    <span>{commit.author}</span>
                    <Calendar className="w-3 h-3" />
                    <span>{commit.date}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* File Content */}
            <div className="flex-1 overflow-auto p-3 bg-muted/20">
              <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                {rightContent || 'Select a commit to view file content'}
              </pre>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Loading...</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
