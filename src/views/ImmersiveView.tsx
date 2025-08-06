import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'framer-motion';
import { CardActions } from '../components/CardActions';
import { Commit } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { Editor } from "@monaco-editor/react";
import { getFileLanguage } from "../utils/index";
import { useMomentumScroll } from "../hooks/useMomentumScroll";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { CommitStatsVisualization } from "../components/CommitStatsVisualization";
import { 
  getAuthorColor, 
  getCommitBadge, 
  adjustColorOpacity,
  getActivityColor 
} from "../utils/colorUtils";

interface ImmersiveViewProps {
  commits: Commit[];
  fileName: string;
}

export function ImmersiveView({ commits, fileName }: ImmersiveViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  
  // Setup momentum scrolling
  useMomentumScroll(containerRef, {
    friction: 0.92,
    elasticity: 0.15,
    minVelocity: 0.8,
    maxVelocity: 45
  });


  
  // Scroll progress tracking - delayed until container is mounted
  const [isContainerReady, setIsContainerReady] = useState(false);
  
  useEffect(() => {
    if (containerRef.current) {
      setIsContainerReady(true);
    }
  }, []);

  const { scrollYProgress } = useScroll({
    ...(isContainerReady && containerRef.current ? { container: containerRef } : {}),
    offset: ["start start", "end end"]
  });

  // Smooth spring animation for scroll indicator
  const scrollProgress = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 40
  });

  // Pre-calculate transform for scrubber thumb
  const thumbTransform = useTransform(scrollProgress, [0, 1], ["0%", "calc(100% - 16px)"]);

  // Auto-detect active item based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const scrollHeight = container.scrollHeight;
      
      // Calculate which item should be active based on scroll position
      const progress = scrollTop / (scrollHeight - containerHeight);
      const newActiveIndex = Math.round(progress * (commits.length - 1));
      
      if (newActiveIndex !== activeIndex && newActiveIndex >= 0 && newActiveIndex < commits.length) {
        setActiveIndex(newActiveIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, commits.length]);

  // Scroll to specific item
  const scrollToItem = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const scrollHeight = container.scrollHeight;
    const containerHeight = container.clientHeight;
    const progress = index / (commits.length - 1);
    const targetScroll = progress * (scrollHeight - containerHeight);
    
    container.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
    setActiveIndex(index);
  }, [commits.length]);

  // Navigation functions for keyboard
  const navigateToNext = useCallback(() => {
    if (activeIndex < commits.length - 1) {
      scrollToItem(activeIndex + 1);
    }
  }, [activeIndex, commits.length, scrollToItem]);

  const navigateToPrevious = useCallback(() => {
    if (activeIndex > 0) {
      scrollToItem(activeIndex - 1);
    }
  }, [activeIndex, scrollToItem]);

  const navigateToFirst = useCallback(() => {
    scrollToItem(0);
  }, [scrollToItem]);

  const navigateToLast = useCallback(() => {
    scrollToItem(commits.length - 1);
  }, [commits.length, scrollToItem]);

  const pageUp = useCallback(() => {
    const newIndex = Math.max(0, activeIndex - 5);
    scrollToItem(newIndex);
  }, [activeIndex, scrollToItem]);

  const pageDown = useCallback(() => {
    const newIndex = Math.min(commits.length - 1, activeIndex + 5);
    scrollToItem(newIndex);
  }, [activeIndex, commits.length, scrollToItem]);

  // Setup keyboard navigation
  useKeyboardNavigation({
    onArrowUp: navigateToPrevious,
    onArrowDown: navigateToNext,
    onHome: navigateToFirst,
    onEnd: navigateToLast,
    onPageUp: pageUp,
    onPageDown: pageDown,
    onSpace: () => {
      // Copy current commit hash
      const currentCommit = commits[activeIndex];
      if (currentCommit) {
        navigator.clipboard.writeText(currentCommit.hash).catch(console.error);
      }
    },
    enabled: true
  });

  // Handle scrubber interaction
  const handleScrubberClick = useCallback((e: React.MouseEvent) => {
    const scrubber = e.currentTarget as HTMLElement;
    const rect = scrubber.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const targetIndex = Math.round(progress * (commits.length - 1));
    scrollToItem(targetIndex);
  }, [commits.length, scrollToItem]);

  // Handle card actions
  const handleCardAction = useCallback(async (action: string, commit: Commit) => {
    switch (action) {
      case 'copy-hash':
        try {
          await navigator.clipboard.writeText(commit.hash);
          console.log('Hash copied to clipboard:', commit.hash);
        } catch (error) {
          console.error('Failed to copy hash:', error);
        }
        break;
      case 'view-diff':
        try {
          // Get the diff for this commit
          const diff = await invoke<string>("get_file_diff", {
            repoPath: fileName.split('/').slice(0, -1).join('/'),
            filePath: fileName.split('/').pop() || ''
          });
          console.log('Diff for commit', commit.hash, ':', diff);
          // TODO: Show diff in a modal or new view
        } catch (error) {
          console.error('Failed to get diff:', error);
        }
        break;
      case 'checkout':
        try {
          // Checkout the specific commit
          const result = await invoke<string>("checkout_commit", {
            repoPath: fileName.split('/').slice(0, -1).join('/'),
            commitHash: commit.hash
          });
          console.log('Checked out commit:', result);
        } catch (error) {
          console.error('Failed to checkout commit:', error);
        }
        break;
      case 'open-external':
        try {
          // Open in external git tool
          await invoke("open_external", {
            url: `git://${fileName.split('/').slice(0, -1).join('/')}?commit=${commit.hash}`
          });
        } catch (error) {
          console.error('Failed to open external:', error);
        }
        break;
      case 'download':
        try {
          // Download file content at this commit
          const content = await invoke<string>("get_git_file_at_commit", {
            filePath: fileName,
            commitHash: commit.hash
          });
          
          // Create and download file
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${fileName.split('/').pop()}_${commit.hash}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Failed to download file:', error);
        }
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [fileName]);

  // Copy to clipboard utility
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  // Get commit stats
  const getStats = useCallback((commit: Commit) => {
    const stats = { additions: 0, deletions: 0, files: 0 };
    
    if (commit.files) {
      stats.files = commit.files.length;
      commit.files.forEach(file => {
        if (file.additions) stats.additions += file.additions;
        if (file.deletions) stats.deletions += file.deletions;
      });
    }
    
    return stats;
  }, []);

  if (commits.length === 0) {
    return (
      <div className="immersive-timeline-empty">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state"
        >
          <h3>No commits found</h3>
          <p>There are no commits to display for this file.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      className="immersive-timeline-clean"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Stats Toggle Button */}
      <motion.button
        className="stats-toggle-button"
        onClick={() => setShowStats(!showStats)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        title="Toggle Statistics"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-label="Statistics">
          <path d="M1.5 13A1.5 1.5 0 003 14.5h10a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 6v7zM3 6a.5.5 0 01.5-.5h9a.5.5 0 01.5.5v7a.5.5 0 01-.5.5h-9A.5.5 0 013 13V6z"/>
          <path d="M5 9.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5zm0 2a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5z"/>
          <rect x="9" y="7" width="1" height="3" rx="0.5"/>
          <rect x="11" y="5" width="1" height="5" rx="0.5"/>
          <rect x="7" y="9" width="1" height="1" rx="0.5"/>
        </svg>
        Stats
      </motion.button>

      {/* Stats Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            className="stats-panel-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStats(false)}
          >
            <motion.div
              className="stats-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="stats-panel-header">
                <h3>Repository Statistics</h3>
                <button 
                  type="button"
                  className="stats-close-button"
                  onClick={() => setShowStats(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-label="Close">
                    <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
                  </svg>
                </button>
              </div>
              <CommitStatsVisualization commits={commits} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simplified Scrubber */}
      <motion.div
        className="timeline-scrubber-clean"
        onClick={handleScrubberClick}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="scrubber-track">
          <motion.div
            className="scrubber-progress"
            style={{
              scaleY: scrollProgress
            }}
          />
          <motion.div
            className="scrubber-thumb"
            style={{
              y: thumbTransform
            }}
          />
        </div>
        
        {/* Active commit indicator */}
        <div className="active-commit-indicator">
          <span className="commit-index">{activeIndex + 1}</span>
          <span className="commit-total">/ {commits.length}</span>
        </div>
      </motion.div>

      {/* Main Timeline Content */}
      <main 
        ref={containerRef}
        className="timeline-content-container-clean"
      >
        <div className="timeline-content-clean">
          <div className="timeline-items-clean">
            {commits.map((commit, index) => {
              const isActive = index === activeIndex;
              const isHovered = hoveredIndex === index;
              const stats = getStats(commit);
              const date = new Date(commit.date);
              const authorColor = getAuthorColor(commit.author);

              const commitBadge = getCommitBadge(commit.message);
              const activityColor = getActivityColor(stats.additions + stats.deletions);
              
              return (
                <motion.div
                  key={commit.hash}
                  className={`timeline-item-clean ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-10%" }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => scrollToItem(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      scrollToItem(index);
                    }
                  }}
                  tabIndex={0}
                >
                  {/* Timeline dot with author color */}
                  <div className="timeline-dot-clean">
                    <motion.div 
                      className="dot-inner"
                      animate={{
                        scale: isActive ? 1.3 : 1,
                        backgroundColor: isActive ? authorColor : adjustColorOpacity(authorColor, 0.6),
                        boxShadow: isActive ? `0 0 12px ${adjustColorOpacity(authorColor, 0.4)}` : "none"
                      }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>

                  {/* Date Badge - Right Side */}
                  <motion.div 
                    className="date-badge"
                    animate={{
                      opacity: isActive ? 1 : 0.7,
                      scale: isActive ? 1.05 : 1
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="date-day">{date.getDate()}</div>
                    <div className="date-month">
                      {date.toLocaleDateString('en', { month: 'short' })}
                    </div>
                    {date.getFullYear() !== new Date().getFullYear() && (
                      <div className="date-year">{date.getFullYear()}</div>
                    )}
                  </motion.div>

                  {/* Compact Timeline Card */}
                  <motion.div 
                    className="timeline-card-clean"
                    animate={{
                      scale: isActive ? 1.02 : 1,
                      backgroundColor: isActive ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.05)"
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="card-header-clean">
                      <div className="commit-info-clean">
                        <div className="commit-title-row">
                          <div className="commit-message-container">
                            {commitBadge && (
                              <span 
                                className="commit-badge"
                                style={{ 
                                  backgroundColor: adjustColorOpacity(commitBadge.color, 0.15),
                                  color: commitBadge.color,
                                  border: `1px solid ${adjustColorOpacity(commitBadge.color, 0.3)}`
                                }}
                              >
                                {commitBadge.text}
                              </span>
                            )}
                            <span className="commit-message-clean">{commit.message}</span>
                          </div>
                          <div className="commit-meta-row">
                            <span 
                              className="author-badge"
                              style={{ 
                                backgroundColor: adjustColorOpacity(authorColor, 0.15),
                                color: authorColor,
                                border: `1px solid ${adjustColorOpacity(authorColor, 0.3)}`
                              }}
                            >
                              {commit.author}
                            </span>
                            <button
                              type="button"
                              className="hash-clean"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(commit.hash);
                              }}
                              title="Copy commit hash"
                            >
                              {commit.hash.slice(0, 7)}
                            </button>
                          </div>
                        </div>
                        
                        {stats.files > 0 && (
                          <div className="commit-stats-clean">
                            <span className="files-count">
                              {stats.files} file{stats.files > 1 ? 's' : ''}
                            </span>
                            {stats.additions > 0 && (
                              <span 
                                className="additions"
                                style={{ 
                                  backgroundColor: adjustColorOpacity('#30D158', 0.15),
                                  color: '#30D158',
                                  border: `1px solid ${adjustColorOpacity('#30D158', 0.3)}`
                                }}
                              >
                                +{stats.additions}
                              </span>
                            )}
                            {stats.deletions > 0 && (
                              <span 
                                className="deletions"
                                style={{ 
                                  backgroundColor: adjustColorOpacity('#FF453A', 0.15),
                                  color: '#FF453A',
                                  border: `1px solid ${adjustColorOpacity('#FF453A', 0.3)}`
                                }}
                              >
                                -{stats.deletions}
                              </span>
                            )}
                            <span 
                              className="activity-indicator"
                              style={{ 
                                backgroundColor: adjustColorOpacity(activityColor, 0.15),
                                color: activityColor,
                                border: `1px solid ${adjustColorOpacity(activityColor, 0.3)}`
                              }}
                            >
                              {stats.additions + stats.deletions > 50 ? 'High' : 
                               stats.additions + stats.deletions > 20 ? 'Med' : 'Low'} Activity
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <CardActions
                      commit={commit}
                      isActive={isActive}
                      isHovered={isHovered}
                      onAction={handleCardAction}
                    />

                    {/* Auto-expand code preview for active item */}
                    <AnimatePresence>
                      {isActive && commit.content && (
                        <motion.div
                          className="code-preview-clean"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="code-container-clean">
                            <Editor
                              height="200px"
                              language={getFileLanguage(fileName)}
                              value={commit.content}
                              theme="vs-dark"
                              options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 12,
                                lineNumbers: "on",
                                folding: false,
                                wordWrap: "on",
                                automaticLayout: true,
                                padding: { top: 12, bottom: 12 }
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Subtle fade masks */}
      <div className="timeline-masks-clean">
        <div className="mask-top" />
        <div className="mask-bottom" />
      </div>

      {/* Minimal hints */}
      <motion.div
        className="timeline-hints-clean"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <span>Click timeline to navigate • Scroll to explore</span>
      </motion.div>
    </motion.div>
  );
}