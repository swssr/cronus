import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConflictResolution } from '../types';
import { resolveConflict } from '../utils/index';
import { Editor } from '@monaco-editor/react';
import { 
  CheckCircle, 
  ArrowRight, 
  FileText, 
  GitMerge,
  Warning,
  Copy,
  Eye
} from '@phosphor-icons/react';

interface ConflictResolverProps {
  conflicts: ConflictResolution[];
  repoPath: string;
  onConflictResolved?: (filePath: string) => void;
  className?: string;
}

export function ConflictResolver({ 
  conflicts, 
  repoPath, 
  onConflictResolved,
  className = "" 
}: ConflictResolverProps) {
  const [activeConflict, setActiveConflict] = useState<number>(0);
  const [resolvedContent, setResolvedContent] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const currentConflict = conflicts[activeConflict];

  const handleResolve = useCallback(async () => {
    if (!currentConflict || !resolvedContent.trim()) return;

    setIsResolving(true);
    try {
      await resolveConflict(repoPath, currentConflict.file, resolvedContent);
      onConflictResolved?.(currentConflict.file);
      
      // Move to next conflict
      if (activeConflict < conflicts.length - 1) {
        setActiveConflict(activeConflict + 1);
        setResolvedContent('');
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setIsResolving(false);
    }
  }, [currentConflict, resolvedContent, repoPath, activeConflict, conflicts.length, onConflictResolved]);

  const handleUseOurs = useCallback(() => {
    if (!currentConflict) return;
    setResolvedContent(currentConflict.conflicts.map(c => c.ours).join('\n'));
  }, [currentConflict]);

  const handleUseTheirs = useCallback(() => {
    if (!currentConflict) return;
    setResolvedContent(currentConflict.conflicts.map(c => c.theirs).join('\n'));
  }, [currentConflict]);

  const handleMerge = useCallback(() => {
    if (!currentConflict) return;
    const merged = currentConflict.conflicts.map(c => 
      `${c.ours}\n${'='.repeat(20)} MERGED ${'='.repeat(20)}\n${c.theirs}`
    ).join('\n\n');
    setResolvedContent(merged);
  }, [currentConflict]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  if (conflicts.length === 0) {
    return (
      <div className={`conflict-resolver ${className}`}>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No Conflicts Found
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            All merge conflicts have been resolved!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`conflict-resolver ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Merge Conflicts
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Resolve conflicts to complete the merge
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {activeConflict + 1} of {conflicts.length}
            </div>
            <div className="w-32 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${((activeConflict + 1) / conflicts.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {conflicts.map((conflict, index) => (
            <button
              key={conflict.file}
              type="button"
              onClick={() => {
                setActiveConflict(index);
                setResolvedContent('');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                index === activeConflict
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <FileText size={14} />
              {conflict.file}
              {conflict.resolved && (
                <CheckCircle size={14} className="text-green-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conflict Resolution */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6">
          {/* File Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <GitMerge size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  {currentConflict?.file}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {currentConflict?.conflicts.length} conflict{currentConflict?.conflicts.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDiff(!showDiff)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              >
                <Eye size={16} />
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Quick Actions:
              </span>
              <button
                type="button"
                onClick={handleUseOurs}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-all"
              >
                Use Ours
              </button>
              <button
                type="button"
                onClick={handleUseTheirs}
                className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-all"
              >
                Use Theirs
              </button>
              <button
                type="button"
                onClick={handleMerge}
                className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-800 transition-all"
              >
                Merge Both
              </button>
            </div>
          </div>

          {/* Conflict Details */}
          <AnimatePresence>
            {showDiff && currentConflict && (
              <motion.div
                className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h5 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                  Conflict Details
                </h5>
                <div className="space-y-3">
                                     {currentConflict.conflicts.map((conflict, index) => (
                     <div key={`${currentConflict.file}-conflict-${index}`} className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 dark:bg-slate-600 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                        Lines {conflict.start}-{conflict.end}
                      </div>
                      <div className="grid grid-cols-2 gap-0">
                        <div className="p-3 bg-red-50 dark:bg-red-900/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-red-700 dark:text-red-300">OURS</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(conflict.ours)}
                              className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                          <pre className="text-xs text-red-800 dark:text-red-200 whitespace-pre-wrap">
                            {conflict.ours}
                          </pre>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">THEIRS</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(conflict.theirs)}
                              className="p-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                          <pre className="text-xs text-green-800 dark:text-green-200 whitespace-pre-wrap">
                            {conflict.theirs}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resolution Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Resolved Content
              </h5>
              <div className="flex items-center gap-2">
                <Warning size={14} className="text-yellow-500" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Edit the content below to resolve conflicts
                </span>
              </div>
            </div>
            
            <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
              <Editor
                height="300px"
                language="plaintext"
                value={resolvedContent}
                onChange={(value) => setResolvedContent(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: "on",
                  wordWrap: "on",
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  renderLineHighlight: 'all',
                  cursorStyle: 'line',
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              {activeConflict > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveConflict(activeConflict - 1);
                    setResolvedContent('');
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                >
                  Previous
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setResolvedContent('')}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={!resolvedContent.trim() || isResolving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2"
              >
                {isResolving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resolving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Resolve Conflict
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {conflicts.filter(c => c.resolved).length} of {conflicts.length} conflicts resolved
            </span>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {Math.round((conflicts.filter(c => c.resolved).length / conflicts.length) * 100)}% complete
          </div>
        </div>
      </div>
    </div>
  );
} 