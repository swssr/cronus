import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import type { Commit } from "../types";
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
import { 
  GitBranch, 
  GitCommit, 
  Eye, 
  Copy, 
  ArrowsClockwise,
  TreeStructure,
  Clock
} from "@phosphor-icons/react";

interface EnhancedImmersiveViewProps {
  commits: Commit[];
  fileName: string;
}

export function EnhancedImmersiveView({ commits, fileName }: EnhancedImmersiveViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(true);
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'tree' | 'virtual'>('virtual');
  
  // Setup momentum scrolling
  useMomentumScroll(containerRef, {
    friction: 0.92,
    elasticity: 0.15,
    minVelocity: 0.8,
    maxVelocity: 45
  });

  // Scroll progress tracking
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

  const scrollProgress = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 40
  });

  const thumbTransform = useTransform(scrollProgress, [0, 1], ["0%", "calc(100% - 16px)"]);

  // Auto-detect active item based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const scrollHeight = container.scrollHeight;
      
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

  // Enhanced commit actions for GitButler-like behavior
  const handleCommitAction = useCallback((action: string, commit: Commit) => {
    switch (action) {
      case 'copy-hash':
        navigator.clipboard.writeText(commit.hash).catch(console.error);
        break;
      case 'view-diff':
        console.log('View diff for:', commit.hash);
        break;
      case 'checkout':
        console.log('Checkout:', commit.hash);
        break;
      case 'create-branch':
        console.log('Create branch from:', commit.hash);
        break;
      case 'cherry-pick':
        console.log('Cherry-pick:', commit.hash);
        break;
      case 'revert':
        console.log('Revert:', commit.hash);
        break;
      case 'select':
        setSelectedCommits(prev => {
          const newSet = new Set(prev);
          if (newSet.has(commit.hash)) {
            newSet.delete(commit.hash);
          } else {
            newSet.add(commit.hash);
          }
          return newSet;
        });
        break;
    }
  }, []);

  const toggleViewMode = () => {
    const modes: Array<'timeline' | 'tree' | 'virtual'> = ['timeline', 'tree', 'virtual'];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setViewMode(modes[nextIndex]);
  };

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
      // Toggle selection for current commit
      const currentCommit = commits[activeIndex];
      if (currentCommit) {
        handleCommitAction('select', currentCommit);
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
      className="enhanced-immersive-timeline bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Enhanced Header with GitButler-like Controls */}
      <motion.div 
        className="enhanced-header flex justify-between items-center p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="header-left flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {fileName ? `${fileName} History` : 'Branch Timeline'}
          </h1>
          <div className="commit-count text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700">
            {commits.length} commits
          </div>
          {selectedCommits.size > 0 && (
            <div className="selected-count text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-200 dark:border-green-700">
              {selectedCommits.size} selected
            </div>
          )}
        </div>
        
        <div className="header-controls flex items-center gap-3">
          <motion.button
            onClick={toggleViewMode}
            className="view-mode-toggle px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {viewMode === 'timeline' && <Clock size={16} />}
            {viewMode === 'tree' && <TreeStructure size={16} />}
            {viewMode === 'virtual' && <GitBranch size={16} />}
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
          </motion.button>
          
          <motion.button
            onClick={() => setShowFullHistory(!showFullHistory)}
            className={`history-toggle px-4 py-2 backdrop-blur-sm border rounded-xl transition-all duration-300 flex items-center gap-2 ${
              showFullHistory 
                ? 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' 
                : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Eye size={16} />
            Full History
          </motion.button>
          
          <motion.button
            onClick={() => setShowStats(!showStats)}
            className="stats-toggle px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 13A1.5 1.5 0 003 14.5h10a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 6v7zM3 6a.5.5 0 01.5-.5h9a.5.5 0 01.5.5v7a.5.5 0 01-.5.5h-9A.5.5 0 013 13V6z"/>
              <path d="M5 9.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5zm0 2a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5z"/>
              <rect x="9" y="7" width="1" height="3" rx="0.5"/>
              <rect x="11" y="5" width="1" height="5" rx="0.5"/>
              <rect x="7" y="9" width="1" height="1" rx="0.5"/>
            </svg>
            Stats
          </motion.button>
        </div>
      </motion.div>

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
                  className="stats-close-button"
                  onClick={() => setShowStats(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
                  </svg>
                </button>
              </div>
              <CommitStatsVisualization commits={commits} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Scrubber with Commit Dots */}
                <motion.div
            className="enhanced-scrubber fixed right-6 top-1/2 transform -translate-y-1/2 z-20"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="scrubber-container bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
              <div className="scrubber-header text-center mb-4">
                <div className="active-commit-indicator text-slate-900 dark:text-slate-100">
                  <span className="commit-index text-2xl font-bold">{activeIndex + 1}</span>
                  <span className="commit-total text-sm opacity-70">/ {commits.length}</span>
                </div>
              </div>
              
              <button 
                type="button"
                className="scrubber-track relative h-64 w-4 mx-auto cursor-pointer" 
                onClick={handleScrubberClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleScrubberClick(e as any);
                  }
                }}
                aria-label="Timeline scrubber"
              >
                <div className="track-line absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-slate-300 dark:bg-slate-600 rounded-full" />
                
                <motion.div
                  className="scrubber-progress absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full origin-top"
                  style={{
                    scaleY: scrollProgress
                  }}
                />
                
                {/* Commit dots along the scrubber */}
                {commits.map((commit, index) => {
                  const position = (index / (commits.length - 1)) * 100;
                  const authorColor = getAuthorColor(commit.author);
                  const isActive = index === activeIndex;
                  const isSelected = selectedCommits.has(commit.hash);
                  
                  return (
                    <motion.button
                      key={commit.hash}
                      type="button"
                      className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ top: `${position}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToItem(index);
                      }}
                      whileHover={{ scale: 1.5 }}
                      aria-label={`Go to commit ${index + 1}`}
                    >
                      <div 
                        className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${
                          isActive ? 'border-slate-900 dark:border-white shadow-lg' : 'border-slate-400 dark:border-slate-500'
                        } ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                        style={{ 
                          backgroundColor: isActive ? authorColor : adjustColorOpacity(authorColor, 0.6),
                          boxShadow: isActive ? `0 0 12px ${adjustColorOpacity(authorColor, 0.6)}` : 'none'
                        }}
                      />
                    </motion.button>
                  );
                })}
                
                <motion.div
                  className="scrubber-thumb absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-400"
                  style={{
                    y: thumbTransform
                  }}
                />
              </button>
            </div>
          </motion.div>

      {/* Main Timeline Content */}
      <main 
        ref={containerRef}
        className="enhanced-timeline-container px-6 pb-20 max-h-screen overflow-y-auto custom-scrollbar"
        style={{ paddingTop: '120px' }}
      >
        <div className="timeline-content-enhanced max-w-6xl mx-auto">
          <div className="timeline-items-enhanced space-y-6">
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
                  className={`enhanced-timeline-item group relative bg-gradient-to-r from-white/5 to-transparent backdrop-blur-sm border border-white/10 rounded-2xl p-6 cursor-pointer ${
                    isActive ? 'active ring-2 ring-purple-400 bg-purple-500/10' : ''
                  } ${isHovered ? 'hovered' : ''} ${
                    selectedCommits.has(commit.hash) ? 'selected bg-blue-500/10 border-blue-400' : ''
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-10%" }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => scrollToItem(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  whileHover={{ scale: 1.02, x: 10 }}
                >
                  {/* Enhanced timeline connector */}
                  <div className="timeline-connector absolute -left-6 top-0 bottom-0 flex flex-col items-center">
                    <div className="connector-line w-0.5 flex-1 bg-gradient-to-b from-purple-400/50 to-blue-400/50" />
                    <motion.div 
                      className="timeline-dot-enhanced w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center"
                      animate={{
                        scale: isActive ? 1.3 : 1,
                        backgroundColor: isActive ? authorColor : adjustColorOpacity(authorColor, 0.6),
                        borderColor: isActive ? 'white' : 'rgba(255,255,255,0.3)',
                        boxShadow: isActive 
                          ? `0 0 20px ${adjustColorOpacity(authorColor, 0.6)}, 0 0 40px ${adjustColorOpacity(authorColor, 0.3)}` 
                          : "none"
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <GitCommit size={14} className="text-white" />
                    </motion.div>
                  </div>

                  {/* Enhanced date badge */}
                  <motion.div 
                    className="enhanced-date-badge absolute -left-20 top-6 text-center"
                    animate={{
                      opacity: isActive ? 1 : 0.6,
                      scale: isActive ? 1.1 : 1
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-white">
                      <div className="text-2xl font-bold">{date.getDate()}</div>
                      <div className="text-xs opacity-70">
                        {date.toLocaleDateString('en', { month: 'short' })}
                      </div>
                      {date.getFullYear() !== new Date().getFullYear() && (
                        <div className="text-xs opacity-50 mt-1">{date.getFullYear()}</div>
                      )}
                    </div>
                  </motion.div>

                  {/* Enhanced Timeline Card */}
                  <motion.div 
                    className="enhanced-timeline-card ml-8"
                    animate={{
                      scale: isActive ? 1.02 : 1,
                      backgroundColor: isActive 
                        ? "rgba(147, 51, 234, 0.1)" 
                        : selectedCommits.has(commit.hash)
                        ? "rgba(59, 130, 246, 0.1)"
                        : "rgba(255, 255, 255, 0.02)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="enhanced-card-header relative">
                      {/* Enhanced Card Actions */}
                      <motion.div 
                        className="enhanced-card-actions flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute top-4 right-4"
                        initial={{ scale: 0.8 }}
                        whileHover={{ scale: 1 }}
                      >
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommitAction('select', commit);
                          }}
                          className={`action-btn p-2 rounded-lg backdrop-blur-sm border transition-all duration-200 ${
                            selectedCommits.has(commit.hash)
                              ? 'bg-blue-500/30 border-blue-400 text-blue-200'
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                          }`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Select commit"
                        >
                          <GitCommit size={14} />
                        </motion.button>
                        
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommitAction('copy-hash', commit);
                          }}
                          className="action-btn p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Copy hash"
                        >
                          <Copy size={14} />
                        </motion.button>
                        
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommitAction('create-branch', commit);
                          }}
                          className="action-btn p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-green-500/20 hover:border-green-400 hover:text-green-200 transition-all duration-200"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Create branch"
                        >
                          <GitBranch size={14} />
                        </motion.button>
                        
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommitAction('view-diff', commit);
                          }}
                          className="action-btn p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-purple-500/20 hover:border-purple-400 hover:text-purple-200 transition-all duration-200"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="View diff"
                        >
                          <Eye size={14} />
                        </motion.button>
                      </motion.div>

                      <div className="commit-info-enhanced">
                        <div className="commit-title-row-enhanced flex items-start justify-between mb-4">
                          <div className="commit-message-container-enhanced flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {commitBadge && (
                                <motion.span 
                                  className="commit-badge-enhanced px-3 py-1 rounded-full text-sm font-medium"
                                  style={{ 
                                    backgroundColor: adjustColorOpacity(commitBadge.color, 0.2),
                                    color: commitBadge.color,
                                    border: `1px solid ${adjustColorOpacity(commitBadge.color, 0.4)}`
                                  }}
                                  whileHover={{ scale: 1.05 }}
                                >
                                  {commitBadge.text}
                                </motion.span>
                              )}
                              <motion.div
                                className="commit-selection-checkbox w-6 h-6 rounded border-2 border-white/30 flex items-center justify-center cursor-pointer"
                                style={{
                                  backgroundColor: selectedCommits.has(commit.hash) ? '#3b82f6' : 'transparent',
                                  borderColor: selectedCommits.has(commit.hash) ? '#3b82f6' : 'rgba(255,255,255,0.3)'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCommitAction('select', commit);
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {selectedCommits.has(commit.hash) && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-2 h-2 bg-white rounded-full"
                                  />
                                )}
                              </motion.div>
                            </div>
                            <h3 className="commit-message-enhanced text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3 leading-tight">
                              {commit.message}
                            </h3>
                          </div>
                        </div>
                        
                        <div className="commit-meta-row-enhanced flex items-center gap-4 mb-4">
                          <motion.span 
                            className="author-badge-enhanced px-4 py-2 rounded-xl font-medium flex items-center gap-2"
                            style={{ 
                              backgroundColor: adjustColorOpacity(authorColor, 0.2),
                              color: authorColor,
                              border: `1px solid ${adjustColorOpacity(authorColor, 0.4)}`
                            }}
                            whileHover={{ scale: 1.05 }}
                          >
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: authorColor }}
                            />
                            {commit.author}
                          </motion.span>
                          
                          <motion.button
                            type="button"
                            className="hash-enhanced px-4 py-2 bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl text-white/90 font-mono text-sm hover:bg-black/50 hover:text-white transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(commit.hash);
                            }}
                            title="Copy commit hash"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {commit.hash.slice(0, 7)}
                          </motion.button>
                          
                          <div className="commit-time text-slate-500 dark:text-slate-400 text-sm">
                            {date.toLocaleDateString('en', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        
                        {stats.files > 0 && (
                          <div className="commit-stats-enhanced flex items-center gap-3 flex-wrap">
                            <motion.span 
                              className="files-count-enhanced px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium flex items-center gap-1"
                              whileHover={{ scale: 1.05 }}
                            >
                              📁 {stats.files} file{stats.files > 1 ? 's' : ''}
                            </motion.span>
                            
                            {stats.additions > 0 && (
                              <motion.span 
                                className="additions-enhanced px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1"
                                style={{ 
                                  backgroundColor: adjustColorOpacity('#10b981', 0.2),
                                  color: '#10b981',
                                  border: `1px solid ${adjustColorOpacity('#10b981', 0.4)}`
                                }}
                                whileHover={{ scale: 1.05 }}
                              >
                                +{stats.additions}
                              </motion.span>
                            )}
                            
                            {stats.deletions > 0 && (
                              <motion.span 
                                className="deletions-enhanced px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1"
                                style={{ 
                                  backgroundColor: adjustColorOpacity('#ef4444', 0.2),
                                  color: '#ef4444',
                                  border: `1px solid ${adjustColorOpacity('#ef4444', 0.4)}`
                                }}
                                whileHover={{ scale: 1.05 }}
                              >
                                -{stats.deletions}
                              </motion.span>
                            )}
                            
                            <motion.span 
                              className="activity-indicator-enhanced px-3 py-1 rounded-lg text-sm font-medium"
                              style={{ 
                                backgroundColor: adjustColorOpacity(activityColor, 0.2),
                                color: activityColor,
                                border: `1px solid ${adjustColorOpacity(activityColor, 0.4)}`
                              }}
                              whileHover={{ scale: 1.05 }}
                            >
                              {stats.additions + stats.deletions > 50 ? '🔥 High' : 
                               stats.additions + stats.deletions > 20 ? '⚡ Med' : '💤 Low'} Activity
                            </motion.span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced code preview with better GitButler-style behavior */}
                    <AnimatePresence>
                      {(showFullHistory || isActive) && commit.content && (
                        <motion.div
                          className="enhanced-code-preview bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl mt-4 overflow-hidden"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ 
                            height: showFullHistory ? "300px" : "200px", 
                            opacity: 1 
                          }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                        >
                          <div className="code-header flex items-center justify-between p-3 bg-white/90 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="ml-3 text-slate-600 dark:text-slate-400 text-sm font-mono">{fileName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCommitAction('copy-hash', commit);
                                }}
                                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-mono px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded"
                                whileHover={{ scale: 1.05 }}
                              >
                                {commit.hash.slice(0, 7)}
                              </motion.button>
                            </div>
                          </div>
                          <div className="code-container-enhanced">
                            <Editor
                              height={showFullHistory ? "250px" : "150px"}
                              language={getFileLanguage(fileName)}
                              value={commit.content}
                              theme="vs-dark"
                              options={{
                                readOnly: true,
                                minimap: { enabled: showFullHistory },
                                scrollBeyondLastLine: false,
                                fontSize: showFullHistory ? 13 : 11,
                                lineNumbers: "on",
                                folding: showFullHistory,
                                wordWrap: "on",
                                automaticLayout: true,
                                padding: { top: 12, bottom: 12 },
                                renderLineHighlight: 'all',
                                cursorStyle: 'line',
                                contextmenu: showFullHistory
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

      {/* Enhanced selection actions for GitButler-like behavior */}
      <AnimatePresence>
        {selectedCommits.size > 0 && (
          <motion.div
            className="selection-actions fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="actions-container bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <span className="text-white font-medium">
                {selectedCommits.size} commit{selectedCommits.size > 1 ? 's' : ''} selected
              </span>
              
              <div className="action-buttons flex items-center gap-2">
                <motion.button
                  onClick={() => {
                    selectedCommits.forEach(hash => {
                      const commit = commits.find(c => c.hash === hash);
                      if (commit) handleCommitAction('cherry-pick', commit);
                    });
                  }}
                  className="px-4 py-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowsClockwise size={16} />
                  Cherry-pick
                </motion.button>
                
                <motion.button
                  onClick={() => {
                    const hashesToCopy = Array.from(selectedCommits).join('\n');
                    navigator.clipboard.writeText(hashesToCopy);
                  }}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-all duration-200 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Copy size={16} />
                  Copy Hashes
                </motion.button>
                
                <motion.button
                  onClick={() => setSelectedCommits(new Set())}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-800/30 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Clear
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced hints */}
      <motion.div
        className="enhanced-hints fixed bottom-6 right-6 z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <div className="hints-container bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-700 dark:text-slate-300 text-sm">
          <div>Click commits to select • Hover for actions</div>
          <div>Scroll to explore • {viewMode} view active</div>
        </div>
      </motion.div>
    </motion.div>
  );
}