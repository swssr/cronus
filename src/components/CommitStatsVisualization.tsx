
import { motion } from 'framer-motion';
import type { Commit } from '../types';
import { 
  getAuthorColor, 
  getActivityColor, 
  adjustColorOpacity 
} from '../utils/colorUtils';

interface CommitStatsProps {
  commits: Commit[];
  className?: string;
}

interface FileChangeData {
  fileName: string;
  changes: number;
  additions: number;
  deletions: number;
  frequency: number;
}

interface AuthorActivityData {
  author: string;
  commits: number;
  additions: number;
  deletions: number;
  files: Set<string>;
  color: string;
}

export function CommitStatsVisualization({ commits, className = '' }: CommitStatsProps) {
  // Process commit data for visualizations
  const processCommitData = () => {
    const fileChanges = new Map<string, FileChangeData>();
    const authorActivity = new Map<string, AuthorActivityData>();
    
    commits.forEach(commit => {
      // Process author activity
      if (!authorActivity.has(commit.author)) {
        authorActivity.set(commit.author, {
          author: commit.author,
          commits: 0,
          additions: 0,
          deletions: 0,
          files: new Set(),
          color: getAuthorColor(commit.author)
        });
      }
      
      const authorData = authorActivity.get(commit.author)!;
      authorData.commits += 1;
      
      // Process file changes (if available)
      if (commit.files) {
        commit.files.forEach(file => {
          authorData.files.add(file.filename || '');
          
          if (!fileChanges.has(file.filename || '')) {
            fileChanges.set(file.filename || '', {
              fileName: file.filename || '',
              changes: 0,
              additions: 0,
              deletions: 0,
              frequency: 0
            });
          }
          
          const fileData = fileChanges.get(file.filename || '')!;
          fileData.frequency += 1;
          fileData.additions += file.additions || 0;
          fileData.deletions += file.deletions || 0;
          fileData.changes += (file.additions || 0) + (file.deletions || 0);
          
          authorData.additions += file.additions || 0;
          authorData.deletions += file.deletions || 0;
        });
      }
    });
    
    return {
      fileChanges: Array.from(fileChanges.values())
        .sort((a, b) => b.changes - a.changes)
        .slice(0, 10), // Top 10 most changed files
      authorActivity: Array.from(authorActivity.values())
        .sort((a, b) => b.commits - a.commits)
    };
  };

  const { fileChanges, authorActivity } = processCommitData();

  // Create time-based activity heatmap
  const createActivityHeatmap = () => {
    const heatmapData = new Map<string, number>();
    const now = new Date();
    const daysBack = 30;
    
    // Initialize last 30 days
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      heatmapData.set(dateKey, 0);
    }
    
    // Count commits per day
    commits.forEach(commit => {
      const commitDate = new Date(commit.date).toISOString().split('T')[0];
      if (heatmapData.has(commitDate)) {
        heatmapData.set(commitDate, heatmapData.get(commitDate)! + 1);
      }
    });
    
    return Array.from(heatmapData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  };

  const activityHeatmap = createActivityHeatmap();
  const maxActivity = Math.max(...activityHeatmap.map(d => d.count));

  return (
    <motion.div
      className={`commit-stats-visualization ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Activity Heatmap */}
      <div className="stats-section">
        <h3 className="stats-title">Activity Heatmap (Last 30 Days)</h3>
        <div className="activity-heatmap">
          {activityHeatmap.map(({ date, count }, index) => {
            const intensity = maxActivity > 0 ? count / maxActivity : 0;
            const dayOfWeek = new Date(date).getDay();
            
            return (
              <motion.div
                key={date}
                className="heatmap-cell"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.01 }}
                style={{
                  backgroundColor: intensity > 0 
                    ? adjustColorOpacity('#30D158', 0.2 + intensity * 0.8)
                    : 'var(--surface-secondary)',
                  gridRow: dayOfWeek + 1
                }}
                title={`${date}: ${count} commits`}
              />
            );
          })}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="legend-scale">
            {[0, 0.25, 0.5, 0.75, 1].map(intensity => (
              <div
                key={intensity}
                className="legend-cell"
                style={{
                  backgroundColor: intensity > 0 
                    ? adjustColorOpacity('#30D158', 0.2 + intensity * 0.8)
                    : 'var(--surface-secondary)'
                }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Author Activity Chart */}
      {authorActivity.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-title">Author Activity</h3>
          <div className="author-activity-chart">
            {authorActivity.map((author, index) => {
              const maxCommits = Math.max(...authorActivity.map(a => a.commits));
              const width = (author.commits / maxCommits) * 100;
              
              return (
                <motion.div
                  key={author.author}
                  className="author-activity-bar"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="author-info">
                    <div 
                      className="author-avatar"
                      style={{ backgroundColor: author.color }}
                    >
                      {author.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="author-details">
                      <span className="author-name">{author.author}</span>
                      <span className="author-stats">
                        {author.commits} commits • {author.files.size} files
                      </span>
                    </div>
                  </div>
                  <div className="activity-bar-container">
                    <motion.div
                      className="activity-bar"
                      style={{ backgroundColor: adjustColorOpacity(author.color, 0.7) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                    />
                    <span className="commit-count">{author.commits}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* File Change Frequency */}
      {fileChanges.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-title">Most Changed Files</h3>
          <div className="file-changes-chart">
            {fileChanges.map((file, index) => {
              const maxChanges = Math.max(...fileChanges.map(f => f.changes));
              const intensity = file.changes / maxChanges;
              
              return (
                <motion.div
                  key={file.fileName}
                  className="file-change-item"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="file-info">
                    <span className="file-name">{file.fileName || 'Unknown'}</span>
                    <div className="change-stats">
                      <span className="additions">+{file.additions}</span>
                      <span className="deletions">-{file.deletions}</span>
                      <span className="frequency">{file.frequency} times</span>
                    </div>
                  </div>
                  <div className="change-bar-container">
                    <motion.div
                      className="change-bar"
                      style={{ 
                        backgroundColor: getActivityColor(file.changes),
                        opacity: 0.3 + intensity * 0.7
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${intensity * 100}%` }}
                      transition={{ delay: index * 0.05 + 0.3, duration: 0.6 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="stats-section">
        <h3 className="stats-title">Summary</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-value">{commits.length}</div>
            <div className="summary-label">Total Commits</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{authorActivity.length}</div>
            <div className="summary-label">Contributors</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{fileChanges.length}</div>
            <div className="summary-label">Files Changed</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {Math.round(commits.length / Math.max(1, authorActivity.length))}
            </div>
            <div className="summary-label">Avg Commits/Author</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}