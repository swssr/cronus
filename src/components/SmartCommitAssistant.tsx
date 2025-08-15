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
import type { GitStatus, CommitSuggestion, UnifiedDiff } from '../types';
import { 
  stageFile, 
  unstageFile, 
  unstageAll,
  createCommit, 
  suggestCommitMessage, 
  generateCommitSuggestions,
  getUnifiedDiff as fetchUnifiedDiff,
  applyIndexPatch,
  undoLastCommit,
} from '../utils/index';
import { FileIcon } from './FileIcon';
import { toast } from 'sonner';

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
  // Preview state placeholder (planned): not yet used
  const [activeDiffFile, setActiveDiffFile] = useState<string | null>(null);
  const [workingHeader, setWorkingHeader] = useState<string>('');
  const [stagedHeader, setStagedHeader] = useState<string>('');
  type LocalHunk = { header: string; lines: string[]; oldStart: number; newStart: number };
  const [workingHunks, setWorkingHunks] = useState<LocalHunk[]>([]);
  const [stagedHunks, setStagedHunks] = useState<LocalHunk[]>([]);
  const [selectedWorking, setSelectedWorking] = useState<Set<number>>(new Set());
  const [selectedStaged, setSelectedStaged] = useState<Set<number>>(new Set());
  // Micro-interaction states
  const [isLoadingDiffs, setIsLoadingDiffs] = useState(false);
  const [busyStageFile, setBusyStageFile] = useState<string | null>(null);
  const [busyUnstageFile, setBusyUnstageFile] = useState<string | null>(null);
  const [isStagingSelected, setIsStagingSelected] = useState(false);
  const [isUnstagingSelected, setIsUnstagingSelected] = useState(false);
  const [isUnstagingAll, setIsUnstagingAll] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [selectedWorkingLines, setSelectedWorkingLines] = useState<Map<number, Set<number>>>(new Map());
  const [selectedStagedLines, setSelectedStagedLines] = useState<Map<number, Set<number>>>(new Map());

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
      setBusyStageFile(filePath);
      await stageFile(repoPath, filePath);
      onStatusUpdate();
      toast.success(`Staged ${filePath}`);
    } catch (error) {
      console.error('Failed to stage file:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Stage failed', { description: message });
    } finally {
      setBusyStageFile(null);
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    try {
      setBusyUnstageFile(filePath);
      await unstageFile(repoPath, filePath);
      onStatusUpdate();
      toast.success(`Unstaged ${filePath}`);
    } catch (error) {
      console.error('Failed to unstage file:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Unstage failed', { description: message });
    } finally {
      setBusyUnstageFile(null);
    }
  };

  const toLocalHunks = (diff: UnifiedDiff): LocalHunk[] => {
    return (diff.hunks || []).map((hunk) => {
      const header: string = hunk.header;
      const lines: string[] = (hunk.lines || []).map((l) => l.text);
      // Support both camelCase and snake_case from backend
      const hunkAny = hunk as unknown as { oldStart?: number; old_start?: number; newStart?: number; new_start?: number };
      const oldStart: number = (hunkAny.oldStart ?? hunkAny.old_start ?? 0) as number;
      const newStart: number = (hunkAny.newStart ?? hunkAny.new_start ?? 0) as number;
      return { header, lines, oldStart, newStart };
    });
  };

  const computeHunkKey = (h: { header: string; lines: string[] }) => `${h.header}|${h.lines[0] ?? ''}|${h.lines.length}`;

  const loadDiffs = async (filePath: string) => {
    try {
      setIsLoadingDiffs(true);
      const [working, staged] = await Promise.all([
        fetchUnifiedDiff(repoPath, filePath, false),
        fetchUnifiedDiff(repoPath, filePath, true),
      ]);

      const workingH = toLocalHunks(working);
      const stagedH = toLocalHunks(staged);

      setWorkingHeader(working.header || '');
      setStagedHeader(staged.header || '');
      setWorkingHunks(workingH);
      setStagedHunks(stagedH);
      setSelectedWorking(new Set());
      setSelectedStaged(new Set());
      setSelectedWorkingLines(new Map());
      setSelectedStagedLines(new Map());
      toast(`Loaded diffs for ${filePath}`);
    } catch (e) {
      console.error('Failed to load diffs', e);
      const message = e instanceof Error ? e.message : String(e);
      toast.error('Failed to load diffs', { description: message });
    } finally {
      setIsLoadingDiffs(false);
    }
  };

  const buildPatch = (header: string, hunks: Array<{ header: string; lines: string[] }>, selected: Set<number>) => {
    const chosen = hunks.map((h, idx) => ({ idx, h })).filter(x => selected.has(x.idx));
    if (chosen.length === 0) return '';
    const parts: string[] = [];
    // Ensure header contains diff --git and ---/+++; if not, we still pass through
    parts.push(header.trim());
    for (const { h } of chosen) {
      parts.push(h.header);
      parts.push(...h.lines);
    }
    return parts.filter(Boolean).join('\n') + '\n';
  };

  const buildPatchFromSelections = (
    header: string,
    hunks: LocalHunk[],
    lineSelections: Map<number, Set<number>>
  ) => {
    const parts: string[] = [];
    const selectedHunkIndices = Array.from(lineSelections.keys()).filter((idx) => (lineSelections.get(idx)?.size || 0) > 0);
    if (selectedHunkIndices.length === 0) return '';
    parts.push(header.trim());

    for (const hIdx of selectedHunkIndices) {
      const h = hunks[hIdx];
      const selected = Array.from(lineSelections.get(hIdx) || []).sort((a, b) => a - b);
      if (selected.length === 0) continue;
      // Partition into contiguous runs
      let runStart = selected[0];
      let prev = selected[0];

      const flushRun = (start: number, end: number) => {
        // Compute base positions up to start
        let oldCur = h.oldStart;
        let newCur = h.newStart;
        for (let i = 0; i < start; i++) {
          const ch = h.lines[i][0];
          if (ch === '-') oldCur++;
          else if (ch === '+') newCur++;
        }
        // Count adds/dels in run
        let oldCount = 0; let newCount = 0;
        for (let i = start; i <= end; i++) {
          const ch = h.lines[i][0];
          if (ch === '-') oldCount++;
          else if (ch === '+') newCount++;
        }
        if (oldCount === 0 && newCount === 0) return;
        parts.push(`@@ -${oldCur},${oldCount} +${newCur},${newCount} @@`);
        for (let i = start; i <= end; i++) {
          parts.push(h.lines[i]);
        }
      };

      for (let i = 1; i < selected.length; i++) {
        const cur = selected[i];
        if (cur === prev + 1) {
          prev = cur;
        } else {
          flushRun(runStart, prev);
          runStart = cur;
          prev = cur;
        }
      }
      flushRun(runStart, prev);
    }
    return parts.join('\n') + '\n';
  };

  const stageSelectedHunks = async () => {
    if (!activeDiffFile) return;
    const hasLineSelections = Array.from(selectedWorkingLines.values()).some((s) => s.size > 0);
    const patch = hasLineSelections
      ? buildPatchFromSelections(workingHeader, workingHunks, selectedWorkingLines)
      : buildPatch(
          workingHeader,
          workingHunks.map(h => ({ header: h.header, lines: h.lines })),
          selectedWorking
        );
    if (!patch) return;
    try {
      setIsStagingSelected(true);
      await applyIndexPatch(repoPath, patch, false);
      await onStatusUpdate();
      await loadDiffs(activeDiffFile);
      toast.success('Selected changes staged');
    } catch (e) {
      console.error('Stage selected hunks failed', e);
      const message = e instanceof Error ? e.message : String(e);
      toast.error('Stage failed', { description: message });
    } finally {
      setIsStagingSelected(false);
    }
  };

  const unstageSelectedHunks = async () => {
    if (!activeDiffFile) return;
    const hasLineSelections = Array.from(selectedStagedLines.values()).some((s) => s.size > 0);
    const patch = hasLineSelections
      ? buildPatchFromSelections(stagedHeader, stagedHunks, selectedStagedLines)
      : buildPatch(
          stagedHeader,
          stagedHunks.map(h => ({ header: h.header, lines: h.lines })),
          selectedStaged
        );
    if (!patch) return;
    try {
      setIsUnstagingSelected(true);
      await applyIndexPatch(repoPath, patch, true);
      await onStatusUpdate();
      await loadDiffs(activeDiffFile);
      toast.success('Selected changes unstaged');
    } catch (e) {
      console.error('Unstage selected hunks failed', e);
      const message = e instanceof Error ? e.message : String(e);
      toast.error('Unstage failed', { description: message });
    } finally {
      setIsUnstagingSelected(false);
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
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Commit failed', { description: message });
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
                {isLoadingDiffs && activeDiffFile === file.path ? (
                  <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Loading…</span>
                ) : (
                  'View diff'
                )}
                      </Button>
                      <Button
                        size="sm"
                onClick={() => handleStageFile(file.path)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                {busyStageFile === file.path ? (
                  <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Staging…</span>
                ) : (
                  <>
                    <Plus size={14} />
                    Stage
                  </>
                )}
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
                      {busyUnstageFile === file.path ? (
                        <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Unstaging…</span>
                      ) : (
                        <>
                          <Minus size={14} />
                          Unstage
                        </>
                      )}
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
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">Working vs HEAD</div>
                      <Button size="sm" variant="outline" onClick={stageSelectedHunks} className="h-6 px-2 text-xs">
                        {isStagingSelected ? (
                          <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Staging…</span>
                        ) : (
                          'Stage selected'
                        )}
                      </Button>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 whitespace-pre-wrap">{workingHeader}</div>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {workingHunks.map((h, idx) => (
                        <div key={`wh-${computeHunkKey(h)}`}
                          className="border border-slate-200 dark:border-slate-700 rounded-md"
                        >
                          <label className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-900 text-[11px]">
                            <input type="checkbox" checked={selectedWorking.has(idx)} onChange={(e) => {
                              const next = new Set(selectedWorking);
                              if (e.target.checked) next.add(idx); else next.delete(idx);
                              setSelectedWorking(next);
                              const nextLines = new Map(selectedWorkingLines);
                              if (e.target.checked) {
                                nextLines.set(idx, new Set(h.lines.map((_, i) => i)));
                              } else {
                                nextLines.delete(idx);
                              }
                              setSelectedWorkingLines(nextLines);
                            }} />
                            <span className="font-mono">{h.header}</span>
                          </label>
                          <div className="text-xs whitespace-pre p-2 space-y-0.5">
                            {h.lines.map((line, li) => {
                              const isSelected = selectedWorkingLines.get(idx)?.has(li) ?? false;
                              const sign = line[0];
                              const color = sign === '+' ? 'text-emerald-600' : sign === '-' ? 'text-rose-600' : 'text-slate-500';
                              return (
                                <label key={`wh-line-${computeHunkKey(h)}-${line}-${li}`} className={`flex items-center gap-2 ${color}`}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const next = new Map(selectedWorkingLines);
                                      const set = new Set(next.get(idx) || []);
                                      if (e.target.checked) set.add(li); else set.delete(li);
                                      if (set.size > 0) next.set(idx, set); else next.delete(idx);
                                      setSelectedWorkingLines(next);
                                    }}
                                  />
                                  <span className="font-mono">{line}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {!workingHunks.length && <div className="text-xs text-slate-500">No changes</div>}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">Staged vs HEAD</div>
                      <Button size="sm" variant="outline" onClick={unstageSelectedHunks} className="h-6 px-2 text-xs">
                        {isUnstagingSelected ? (
                          <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Unstaging…</span>
                        ) : (
                          'Unstage selected'
                        )}
                      </Button>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 whitespace-pre-wrap">{stagedHeader}</div>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {stagedHunks.map((h, idx) => (
                        <div key={`sh-${computeHunkKey(h)}`}
                          className="border border-slate-200 dark:border-slate-700 rounded-md"
                        >
                          <label className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-900 text-[11px]">
                            <input type="checkbox" checked={selectedStaged.has(idx)} onChange={(e) => {
                              const next = new Set(selectedStaged);
                              if (e.target.checked) next.add(idx); else next.delete(idx);
                              setSelectedStaged(next);
                              const nextLines = new Map(selectedStagedLines);
                              if (e.target.checked) {
                                nextLines.set(idx, new Set(h.lines.map((_, i) => i)));
                              } else {
                                nextLines.delete(idx);
                              }
                              setSelectedStagedLines(nextLines);
                            }} />
                            <span className="font-mono">{h.header}</span>
                          </label>
                          <div className="text-xs whitespace-pre p-2 space-y-0.5">
                            {h.lines.map((line, li) => {
                              const isSelected = selectedStagedLines.get(idx)?.has(li) ?? false;
                              const sign = line[0];
                              const color = sign === '+' ? 'text-emerald-600' : sign === '-' ? 'text-rose-600' : 'text-slate-500';
                              return (
                                <label key={`sh-line-${computeHunkKey(h)}-${line}-${li}`} className={`flex items-center gap-2 ${color}`}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const next = new Map(selectedStagedLines);
                                      const set = new Set(next.get(idx) || []);
                                      if (e.target.checked) set.add(li); else set.delete(li);
                                      if (set.size > 0) next.set(idx, set); else next.delete(idx);
                                      setSelectedStagedLines(next);
                                    }}
                                  />
                                  <span className="font-mono">{line}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {!stagedHunks.length && <div className="text-xs text-slate-500">No staged changes</div>}
                    </div>
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
                onClick={async () => { try { setIsUnstagingAll(true); await unstageAll(repoPath); onStatusUpdate(); toast.success('Unstaged all changes'); } catch (e) { const msg = e instanceof Error ? e.message : String(e); toast.error('Unstage all failed', { description: msg }); } finally { setIsUnstagingAll(false); } }}
                className="border-slate-300 dark:border-slate-600"
              >
                {isUnstagingAll ? (
                  <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Unstaging…</span>
                ) : (
                  'Unstage all'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    setIsUndoing(true);
                    await undoLastCommit(repoPath, true);
                    await onStatusUpdate();
                    toast.success('Undid last commit');
                  } catch (e) {
                    console.error('Undo last commit failed', e);
                    const msg = e instanceof Error ? e.message : String(e);
                    toast.error('Undo last failed', { description: msg });
                  } finally {
                    setIsUndoing(false);
                  }
                }}
                className="border-slate-300 dark:border-slate-600"
              >
                {isUndoing ? (
                  <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Undoing…</span>
                ) : (
                  'Undo last commit'
                )}
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