import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  GitCommit, 
  Plus, 
  Minus, 
  CheckCircle, 
  Lightbulb,
  FileText,
  Sparkle,
  ArrowRight,
  Info
} from '@phosphor-icons/react';
import { GitStatus, CommitSuggestion } from '../types';
import { 
  stageFile, 
  unstageFile, 
  unstageAll,
  createCommit, 
  suggestCommitMessage, 
  generateCommitSuggestions,
  getFileDiff,
  getStagedDiff,
} from '../utils/index';
import { FileIcon } from './FileIcon';

interface SmartCommitAssistantProps {
  repoPath: string;
  gitStatus: GitStatus;
  onStatusUpdate: () => void;
  onCommitCreated: (commitHash: string) => void;
}

export default function SmartCommitAssistant({ 
  repoPath, 
  gitStatus, 
  onStatusUpdate, 
  onCommitCreated 
}: SmartCommitAssistantProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [isCreatingCommit, setIsCreatingCommit] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CommitSuggestion | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [guidedMode, setGuidedMode] = useState(true);
  const [/* showPreview */] = useState(false);
  const [activeDiffFile, setActiveDiffFile] = useState<string | null>(null);
  const [workingDiff, setWorkingDiff] = useState<string>('');
  const [stagedDiff, setStagedDiff] = useState<string>('');

  const generateAutoSuggestion = useCallback(async () => {
    try {
      const stagedFilePaths = gitStatus.staged.map(f => f.path);
      const suggestion = await suggestCommitMessage(repoPath, stagedFilePaths);
      setCommitMessage(suggestion);
    } catch (error) {
      console.error('Failed to generate suggestion:', error);
    }
  }, [gitStatus.staged, repoPath]);

  // Auto-suggest commit message when staged files change
  useEffect(() => {
    if (gitStatus.staged.length > 0 && !commitMessage) {
      generateAutoSuggestion();
    }
  }, [gitStatus.staged, commitMessage, generateAutoSuggestion]);

  const handleStageFile = async (filePath: string) => {
    try {
      await stageFile(repoPath, filePath);
      onStatusUpdate();
    } catch (error) {
      console.error('Failed to stage file:', error);
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    try {
      await unstageFile(repoPath, filePath);
      onStatusUpdate();
    } catch (error) {
      console.error('Failed to unstage file:', error);
    }
  };

  const loadDiffs = async (filePath: string) => {
    try {
      const [wd, sd] = await Promise.all([
        getFileDiff(repoPath, filePath),
        getStagedDiff(repoPath, filePath),
      ]);
      setWorkingDiff(wd);
      setStagedDiff(sd);
    } catch (e) {
      console.error('Failed to load diffs', e);
    }
  };

  const handleCreateCommit = async () => {
    if (!commitMessage.trim()) return;
    
    setIsCreatingCommit(true);
    try {
      const stagedFilePaths = gitStatus.staged.map(f => f.path);
      const commitHash = await createCommit(repoPath, commitMessage, stagedFilePaths);
      setCommitMessage('');
      setSelectedSuggestion(null);
      onCommitCreated(commitHash);
      onStatusUpdate();
    } catch (error) {
      console.error('Failed to create commit:', error);
    } finally {
      setIsCreatingCommit(false);
    }
  };

  const handleSuggestionSelect = (suggestion: CommitSuggestion) => {
    setCommitMessage(suggestion.message);
    setSelectedSuggestion(suggestion);
    setShowSuggestions(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'modified': return 'text-yellow-600 dark:text-yellow-400';
      case 'added': return 'text-green-600 dark:text-green-400';
      case 'deleted': return 'text-red-600 dark:text-red-400';
      case 'untracked': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'modified': return 'bg-amber-500';
      case 'added': return 'bg-emerald-500';
      case 'deleted': return 'bg-rose-500';
      case 'untracked': return 'bg-sky-500';
      default: return 'bg-slate-400';
    }
  };

  const suggestions = generateCommitSuggestions(gitStatus.staged.map(f => f.path));

  return (
    <motion.div 
      className="smart-commit-assistant bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Sparkle size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Smart Commit Assistant
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Let's create a meaningful commit together
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mr-2">
              <input
                type="checkbox"
                checked={guidedMode}
                onChange={(e) => setGuidedMode(e.target.checked)}
              />
              Guided
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <Info size={16} />
            </Button>
          </div>
        </div>

        {/* Help Tooltip */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              className="help-tooltip mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-start gap-3">
                <Lightbulb size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">💡 Git Tips for Beginners:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Stage files</strong> to prepare them for commit</li>
                    <li>• <strong>Write clear messages</strong> that explain what changed</li>
                    <li>• <strong>Use conventional commits</strong> like "feat:", "fix:", "docs:"</li>
                    <li>• <strong>Commit often</strong> with small, focused changes</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File Status Section */}
        <div className="space-y-4 mb-6">
          {/* Unstaged Changes */}
          {gitStatus.unstaged.length > 0 && (
            <div className="unstaged-section">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Minus size={14} className="text-red-500" />
                Unstaged Changes ({gitStatus.unstaged.length})
              </h3>
              <div className="space-y-1.5">
                {gitStatus.unstaged.map((file) => (
                  <motion.div
                    key={file.path}
                    className="file-item flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`inline-block w-2 h-2 rounded-full ${getStatusDotClass(file.status)}`} />
                      <div className="flex items-center gap-2">
                        <FileIcon fileName={file.path} size={16} />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[48ch]">
                          {file.path}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(file.status)} bg-slate-100 dark:bg-slate-800/60`}
                        >
                          {file.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setActiveDiffFile(file.path); loadDiffs(file.path); }}
                        className="border-slate-300 dark:border-slate-600"
                      >
                        View diff
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStageFile(file.path)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus size={14} />
                        Stage
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Untracked Files */}
          {gitStatus.untracked.length > 0 && (
            <div className="untracked-section">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <FileText size={14} className="text-blue-500" />
                Untracked Files ({gitStatus.untracked.length})
              </h3>
              <div className="space-y-1.5">
                {gitStatus.untracked.map((filePath) => (
                  <motion.div
                    key={filePath}
                    className="file-item flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
                      <div className="flex items-center gap-2">
                        <FileIcon fileName={filePath} size={16} />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[48ch]">
                          {filePath}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full text-blue-600 dark:text-blue-300 bg-slate-100 dark:bg-slate-800/60">
                          untracked
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleStageFile(filePath)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus size={14} />
                      Add
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Staged Changes */}
          {gitStatus.staged.length > 0 && (
            <div className="staged-section">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Staged for Commit ({gitStatus.staged.length})
              </h3>
              <div className="space-y-1.5">
                {gitStatus.staged.map((file) => (
                  <motion.div
                    key={file.path}
                    className="file-item flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                      <div className="flex items-center gap-2">
                        <FileIcon fileName={file.path} size={16} />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[48ch]">
                          {file.path}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full text-emerald-700 dark:text-emerald-300 bg-slate-100 dark:bg-slate-800/60">
                          staged
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnstageFile(file.path)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/40"
                    >
                      <Minus size={14} />
                      Unstage
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Commit Section */}
        {gitStatus.staged.length > 0 && (
          <motion.div 
            className="commit-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {activeDiffFile && (
              <div className="mb-4 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{activeDiffFile}</div>
                  <Button size="sm" variant="ghost" onClick={() => setActiveDiffFile(null)}>Close</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Working vs HEAD</div>
                    <pre className="text-xs whitespace-pre-wrap p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md max-h-64 overflow-auto">{workingDiff || 'No changes'}</pre>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Staged vs HEAD</div>
                    <pre className="text-xs whitespace-pre-wrap p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md max-h-64 overflow-auto">{stagedDiff || 'No staged changes'}</pre>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <GitCommit size={20} className="text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Create Commit
              </h3>
            </div>

            {/* Commit Message Input */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Input
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Write a clear commit message..."
                  className="pr-20"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Lightbulb size={16} />
                </Button>
              </div>

              {/* Commit Suggestions */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    className="suggestions-panel bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      💡 Suggested commit messages:
                    </p>
                    <div className="space-y-2">
                      {suggestions.map((suggestion) => (
                        <motion.button
                          key={`${suggestion.type}-${suggestion.scope}-${suggestion.message}`}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className={`w-full text-left p-2 rounded text-sm transition-colors ${
                            selectedSuggestion?.message === suggestion.message
                              ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-600'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {suggestion.message}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {suggestion.description}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Preview (Guided) */}
            {guidedMode && (
              <div className="mb-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-3">
                <div className="font-medium mb-1">Command preview</div>
                <code className="block whitespace-pre overflow-auto">
                  {`git add ${gitStatus.staged.map(f => f.path).join(' ')}`}
                </code>
                <code className="block whitespace-pre overflow-auto mt-1">
                  {`git commit -m "${commitMessage || '<message>'}"`}
                </code>
                <div className="mt-2">This stages the listed files and creates a commit.</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreateCommit}
                disabled={!commitMessage.trim() || isCreatingCommit}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isCreatingCommit ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating commit...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <GitCommit size={16} />
                    Create Commit
                    <ArrowRight size={16} />
                  </div>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={async () => { await unstageAll(repoPath); onStatusUpdate(); }}
                className="border-slate-300 dark:border-slate-600"
              >
                Unstage all
              </Button>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {gitStatus.staged.length === 0 && gitStatus.unstaged.length === 0 && gitStatus.untracked.length === 0 && (
          <motion.div 
            className="empty-state text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Working directory clean
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No changes to commit. Start editing files to see them here.
            </p>
          </motion.div>
        )} 
      </div>
    </motion.div>
  );
}