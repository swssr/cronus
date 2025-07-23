import { Editor } from "@monaco-editor/react";
import { Commit, DiffOptions } from "../types";
import { getFileLanguage } from "../utils";

export function CarouselCard({ 
  commit, 
  index, 
  diffOptions, 
  onDiffChange 
}: { 
  commit: Commit; 
  index: number;
  diffOptions?: DiffOptions;
  onDiffChange?: (options: DiffOptions) => void;
}) {
    const fileName = commit.content ? "file" : "file";
    const language = getFileLanguage(fileName);
    console.log({language, fileName, content: commit})

    const copyToClipboard = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    const copyCommitHash = () => copyToClipboard(commit.hash);
    const copyContent = () => copyToClipboard(commit.content || '');

    // Calculate simple stats from content if not provided
    const getStats = () => {
      if (commit.stats) {
        return commit.stats;
      }
      
      // Simple line count as fallback
      const lines = commit.content.split('\n').length;
      return {
        additions: Math.floor(lines * 0.7), // Rough estimate
        deletions: Math.floor(lines * 0.3)
      };
    };

    const stats = getStats();

    const handleDiffModeChange = (mode: 'current' | 'previous' | 'custom') => {
      if (onDiffChange) {
        onDiffChange({
          baseCommit: mode === 'current' ? commit.hash : '',
          compareMode: mode,
          showLineNumbers: diffOptions?.showLineNumbers ?? true,
          contextLines: diffOptions?.contextLines ?? 3
        });
      }
    };

    return (
      <div className={`carousel-card gradient-dark-${(index % 3) + 1}`}>
        {/* Details Section - Top */}
        <div className="card-details">
          <div className="commit-info">
            <div className="commit-hash-container">
              <code className="commit-hash" onClick={copyCommitHash} title="Click to copy">
                {commit.hash.slice(0, 8)}
              </code>
              <button className="copy-btn" onClick={copyCommitHash} title="Copy hash">
                📋
              </button>
            </div>
            <div className="commit-meta">
              <span className="commit-author">{commit.author}</span>
              <span className="commit-date">{commit.date}</span>
            </div>
          </div>

          <div className="commit-message">{commit.message}</div>

          <div className="commit-stats">
            <div className="stat-item additions">
              <span className="stat-icon">+</span>
              <span className="stat-value">{stats.additions}</span>
            </div>
            <div className="stat-item deletions">
              <span className="stat-icon">-</span>
              <span className="stat-value">{stats.deletions}</span>
            </div>
            <div className="stat-item total">
              <span className="stat-icon">∼</span>
              <span className="stat-value">{stats.additions + stats.deletions}</span>
            </div>
          </div>

          {/* Diff Options */}
          <div className="diff-options">
            <label className="diff-label">Compare with:</label>
            <div className="diff-mode-selector">
              <button 
                className={`diff-mode-btn ${!diffOptions || diffOptions.compareMode === 'current' ? 'active' : ''}`}
                onClick={() => handleDiffModeChange('current')}
                title="Show current version"
              >
                Current
              </button>
              <button 
                className={`diff-mode-btn ${diffOptions?.compareMode === 'previous' ? 'active' : ''}`}
                onClick={() => handleDiffModeChange('previous')}
                title="Compare with previous commit"
              >
                Previous
              </button>
              <button 
                className={`diff-mode-btn ${diffOptions?.compareMode === 'custom' ? 'active' : ''}`}
                onClick={() => handleDiffModeChange('custom')}
                title="Choose custom commit to compare"
              >
                Custom
              </button>
            </div>
          </div>
        </div>
        
        {/* Content Section - Middle */}
        <div className="card-content">
          <Editor
            height="240px"
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
              glyphMargin: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 0,
              overviewRulerLanes: 0,
            }}
          />
        </div>

        {/* Actions Section - Bottom */}
        <div className="card-actions">
          <button className="action-btn" onClick={copyContent} title="Copy file content">
            📄 Copy
          </button>
          <button className="action-btn diff-btn" title="View diff">
            🔍 Diff
          </button>
          <button className="action-btn restore-btn" title="Restore to this version">
            ↩️ Restore
          </button>
        </div>
      </div>
    );
  }