import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Commit, DiffOptions } from "../types";
import { Editor } from "@monaco-editor/react";
import { getFileLanguage } from "../utils/index";
import { VirtualScrollContainer } from "./VirtualScrollContainer";

interface CommitTimelineProps {
  commits: Commit[];
  fileName: string;
  diffOptions?: DiffOptions;
  onDiffChange?: (options: DiffOptions) => void;
}

export function CommitTimeline({ commits, fileName, diffOptions, onDiffChange }: CommitTimelineProps) {
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  // Use commits directly - filtering is handled by parent
  const filteredCommits = commits;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('en', { month: 'short' }),
      year: date.getFullYear(),
      day: date.getDate(),
      fullDate: date.toLocaleDateString('en', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })
    };
  };

  const getStats = (commit: Commit) => {
    if (commit.stats) {
      return commit.stats;
    }
    
    // Simple line count as fallback
    const lines = commit.content.split('\n').length;
    return {
      additions: Math.floor(lines * 0.7),
      deletions: Math.floor(lines * 0.3)
    };
  };

  const handleDiffModeChange = (commit: Commit, mode: 'current' | 'previous' | 'custom') => {
    if (onDiffChange) {
      onDiffChange({
        baseCommit: mode === 'current' ? commit.hash : '',
        compareMode: mode,
        showLineNumbers: diffOptions?.showLineNumbers ?? true,
        contextLines: diffOptions?.contextLines ?? 3
      });
    }
  };

  if (filteredCommits.length === 0) {
    return (
      <div className="timeline-container">
        <div className="timeline-empty">
          <p>No commits found. Try adjusting your search.</p>
        </div>
      </div>
    );
  }

  const renderTimelineItem = useMemo(() => (commit: Commit, index: number) => {
    const date = formatDate(commit.date);
    const stats = getStats(commit);
    const isSelected = selectedCommit === commit.hash;
    const language = getFileLanguage(fileName);
    
    return (
      <motion.div
        key={commit.hash}
        className="timeline-item"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.02, 1) }}
      >
        <div className="timeline-date">
          <div className="date-month">{date.month}</div>
          <div className="date-year">{date.year}</div>
        </div>
        
        <div className="timeline-node">
          <motion.div 
            className={`timeline-dot ${isSelected ? 'active' : ''}`}
            whileHover={{ scale: 1.2 }}
            onClick={() => setSelectedCommit(isSelected ? null : commit.hash)}
          />
        </div>
        
        <motion.div 
          className={`timeline-content-card ${isSelected ? 'expanded' : ''}`}
          layout
        >
          <div className="commit-header" onClick={() => setSelectedCommit(isSelected ? null : commit.hash)}>
            <div className="commit-meta">
              <div className="commit-title">{commit.message}</div>
              <div className="commit-info">
                <span className="commit-author">👤 {commit.author}</span>
                <span className="commit-hash" onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(commit.hash);
                }}>
                  📋 {commit.hash.slice(0, 8)}
                </span>
                <span className="commit-date-full">📅 {date.fullDate}</span>
              </div>
              <div className="commit-stats">
                <span className="stat additions">+{stats.additions}</span>
                <span className="stat deletions">-{stats.deletions}</span>
                <span className="stat total">∼{stats.additions + stats.deletions}</span>
              </div>
            </div>
          </div>
          
          <AnimatePresence>
            {isSelected && (
              <motion.div
                className="timeline-expanded-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="diff-options">
                  <label className="diff-label">Compare with:</label>
                  <div className="diff-mode-selector">
                    <button 
                      className={`diff-mode-btn ${!diffOptions || diffOptions.compareMode === 'current' ? 'active' : ''}`}
                      onClick={() => handleDiffModeChange(commit, 'current')}
                    >
                      Current
                    </button>
                    <button 
                      className={`diff-mode-btn ${diffOptions?.compareMode === 'previous' ? 'active' : ''}`}
                      onClick={() => handleDiffModeChange(commit, 'previous')}
                    >
                      Previous
                    </button>
                    <button 
                      className={`diff-mode-btn ${diffOptions?.compareMode === 'custom' ? 'active' : ''}`}
                      onClick={() => handleDiffModeChange(commit, 'custom')}
                    >
                      Custom
                    </button>
                  </div>
                </div>
                
                <div className="code-preview">
                  <Editor
                    height="300px"
                    language={language}
                    value={commit.content}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: "on",
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      scrollbar: { vertical: 'auto', horizontal: 'auto' },
                      folding: false,
                    }}
                  />
                </div>
                
                <div className="timeline-actions">
                  <button 
                    className="action-btn" 
                    onClick={() => copyToClipboard(commit.content)}
                  >
                    📄 Copy Content
                  </button>
                  <button className="action-btn diff-btn">
                    🔍 View Diff
                  </button>
                  <button className="action-btn restore-btn">
                    ↩️ Restore
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }, [selectedCommit, fileName, diffOptions, handleDiffModeChange, copyToClipboard]);

  return (
    <div className="timeline-container">
      <div className="timeline-content">
        <div className="timeline-line"></div>
        
        <VirtualScrollContainer
          items={filteredCommits}
          itemHeight={(index) => {
            const commit = filteredCommits[index];
            return commit?.hash === selectedCommit ? 600 : 180;
          }}
          containerHeight={600}
          renderItem={renderTimelineItem}
          overscan={3}
          className="timeline-items-virtual"
        />
      </div>
    </div>
  );
} 