import { Editor, DiffEditor } from "@monaco-editor/react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { useMomentumScroll } from "../hooks/useMomentumScroll";
import type { Commit } from "../types";
import { computeFileStory, getFileLanguage } from "../utils/index";

import {
  ArrowsClockwise,
  Clock,
  Copy,
  Eye,
  GitBranch,
  GitCommit,
  TreeStructure,
} from "@phosphor-icons/react";
import { CommitStatsVisualization } from "../components/CommitStatsVisualization";
import {
  adjustColorOpacity,
  getActivityColor,
  getAuthorColor,
  getCommitBadge,
} from "../utils/colorUtils";
import { toast } from "sonner";

interface EnhancedImmersiveViewProps {
  commits: Commit[];
  fileName: string;
}

export function EnhancedImmersiveView({
  commits,
  fileName,
}: EnhancedImmersiveViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(true);
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(
    new Set()
  );
  const [workingItems, setWorkingItems] = useState<Array<{ hash: string; content: string }>>([]);
  const [viewMode, setViewMode] = useState<"timeline" | "tree" | "virtual" | "story">(
    "story"
  );
  const story = computeFileStory(commits);

  // Setup momentum scrolling
  useMomentumScroll(containerRef, {
    friction: 0.92,
    elasticity: 0.15,
    minVelocity: 0.8,
    maxVelocity: 45,
  });

  // Scroll progress tracking
  const [isContainerReady, setIsContainerReady] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      setIsContainerReady(true);
    }
  }, []);

  const { scrollYProgress } = useScroll({
    ...(isContainerReady && containerRef.current
      ? { container: containerRef }
      : {}),
    offset: ["start start", "end end"],
  });

  const scrollProgress = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 40,
  });

  const thumbTransform = useTransform(
    scrollProgress,
    [0, 1],
    ["0%", "calc(100% - 16px)"]
  );

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

      if (
        newActiveIndex !== activeIndex &&
        newActiveIndex >= 0 &&
        newActiveIndex < commits.length
      ) {
        setActiveIndex(newActiveIndex);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeIndex, commits.length]);

  // Scroll to specific item
  const scrollToItem = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;

      const scrollHeight = container.scrollHeight;
      const containerHeight = container.clientHeight;
      const progress = index / (commits.length - 1);
      const targetScroll = progress * (scrollHeight - containerHeight);

      container.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
      setActiveIndex(index);
    },
    [commits.length]
  );

  // Enhanced commit actions for GitButler-like behavior
  const handleCommitAction = useCallback((action: string, commit: Commit) => {
    switch (action) {
      case "copy-hash":
        navigator.clipboard.writeText(commit.hash).catch(console.error);
        toast("File contents copied to clipboard.")
        break;
      case "view-diff":
        console.log("View diff for:", commit.hash);
        break;
      case "checkout":
        console.log("Checkout:", commit.hash);
        break;
      case "create-branch":
        console.log("Create branch from:", commit.hash);
        break;
      case "add-to-working":
        setWorkingItems((prev) => {
          if (prev.some((w) => w.hash === commit.hash)) return prev;
          return [...prev, { hash: commit.hash, content: commit.content }];
        });
        break;
      case "cherry-pick":
        console.log("Cherry-pick:", commit.hash);
        break;
      case "revert":
        console.log("Revert:", commit.hash);
        break;
      case "select":
        setSelectedCommits((prev) => {
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
    const modes: Array<"timeline" | "tree" | "virtual" | "story"> = [
      "story",
      "timeline",
      "tree",
      "virtual",
    ];
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
        handleCommitAction("select", currentCommit);
      }
    },
    enabled: true,
  });

  // Handle scrubber interaction
  const handleScrubberClick = useCallback(
    (e: React.MouseEvent) => {
      const scrubber = e.currentTarget as HTMLElement;
      const rect = scrubber.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, (e.clientY - rect.top) / rect.height)
      );
      const targetIndex = Math.round(progress * (commits.length - 1));
      scrollToItem(targetIndex);
    },
    [commits.length, scrollToItem]
  );

  // Copy to clipboard utility
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  // Get commit stats
  const getStats = useCallback((commit: Commit) => {
    const stats = { additions: 0, deletions: 0, files: 0 };

    if (commit.files) {
      stats.files = commit.files.length;
      commit.files.forEach((file) => {
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
            {fileName ? `${fileName} History` : "Branch Timeline"}
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
            {viewMode === "story" && <GitCommit size={16} />}
            {viewMode === "timeline" && <Clock size={16} />}
            {viewMode === "tree" && <TreeStructure size={16} />}
            {viewMode === "virtual" && <GitBranch size={16} />}
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
          </motion.button>

          <motion.button
            onClick={() => setShowFullHistory(!showFullHistory)}
            className={`history-toggle px-4 py-2 backdrop-blur-sm border rounded-xl transition-all duration-300 flex items-center gap-2 ${
              showFullHistory
                ? "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                : "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
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
              <path d="M1.5 13A1.5 1.5 0 003 14.5h10a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 6v7zM3 6a.5.5 0 01.5-.5h9a.5.5 0 01.5.5v7a.5.5 0 01-.5.5h-9A.5.5 0 013 13V6z" />
              <path d="M5 9.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5zm0 2a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5z" />
              <rect x="9" y="7" width="1" height="3" rx="0.5" />
              <rect x="11" y="5" width="1" height="5" rx="0.5" />
              <rect x="7" y="9" width="1" height="1" rx="0.5" />
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
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="stats-panel-header">
                <h3>Repository Statistics</h3>
                <button
                  className="stats-close-button"
                  onClick={() => setShowStats(false)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
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
              <span className="commit-index text-2xl font-bold">
                {activeIndex + 1}
              </span>
              <span className="commit-total text-sm opacity-70">
                / {commits.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="scrubber-track relative h-64 w-4 mx-auto cursor-pointer"
            onClick={handleScrubberClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
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
                scaleY: scrollProgress,
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
                      isActive
                        ? "border-slate-900 dark:border-white shadow-lg"
                        : "border-slate-400 dark:border-slate-500"
                    } ${isSelected ? "ring-2 ring-blue-400" : ""}`}
                    style={{
                      backgroundColor: isActive
                        ? authorColor
                        : adjustColorOpacity(authorColor, 0.6),
                      boxShadow: isActive
                        ? `0 0 12px ${adjustColorOpacity(authorColor, 0.6)}`
                        : "none",
                    }}
                  />
                </motion.button>
              );
            })}

            <motion.div
              className="scrubber-thumb absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-400"
              style={{
                y: thumbTransform,
              }}
            />
          </button>
        </div>
      </motion.div>

      {/* Story View */}
      {viewMode === "story" && story && (
        <main
          ref={containerRef}
          className="px-6 pb-20 max-h-screen overflow-y-auto custom-scrollbar"
          style={{ paddingTop: "120px" }}
        >
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">The story of {fileName}</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {story.totalCommits} commits over {story.timespanDays} days. First seen on {new Date(story.oldest.date).toLocaleDateString()} — last updated on {new Date(story.newest.date).toLocaleDateString()}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <h3 className="font-medium mb-2 text-slate-900 dark:text-slate-100">Top authors</h3>
                <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                  {story.topAuthors.map((a) => (
                    <li key={a.name} className="flex justify-between">
                      <span>{a.name}</span>
                      <span className="opacity-70">{a.commits} commits</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <h3 className="font-medium mb-2 text-slate-900 dark:text-slate-100">Largest change</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300">Commit {story.largestChange.commit.hash.slice(0,7)} changed the file the most.</p>
                <div className="mt-3">
                  <button
                    className="px-3 py-1.5 text-sm rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
                    onClick={() => scrollToItem(story.largestChange.index)}
                  >
                    Jump to commit
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
              <h3 className="font-medium mb-3 text-slate-900 dark:text-slate-100">Narrative</h3>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li>First appeared in {new Date(story.oldest.date).toLocaleDateString()} as part of "{story.oldest.message}".</li>
                <li>Most significant change around commit {story.largestChange.commit.hash.slice(0,7)}.</li>
                <li>Owned mainly by {story.topAuthors[0]?.name ?? 'unknown'} with {story.topAuthors[0]?.commits ?? 0} commits.</li>
              </ol>
            </div>
          </div>
        </main>
      )}

      {/* Compare View when two commits are selected */}
      {selectedCommits.size === 2 && (
        <main
          ref={containerRef}
          className="px-6 pb-20 max-h-screen overflow-y-auto custom-scrollbar"
          style={{ paddingTop: "120px" }}
        >
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between">
              <div className="text-slate-700 dark:text-slate-300 text-sm">Comparing two versions of {fileName}</div>
              <button
                className="px-3 py-1.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
                onClick={() => setSelectedCommits(new Set())}
              >
                Clear compare
              </button>
            </div>
            <DiffEditor
              height="70vh"
              original={(() => {
                const [a, b] = Array.from(selectedCommits);
                const original = commits.find((c) => c.hash === a)?.content || "";
                return original;
              })()}
              modified={(() => {
                const [a, b] = Array.from(selectedCommits);
                const modified = commits.find((c) => c.hash === b)?.content || "";
                return modified;
              })()}
              language={getFileLanguage(fileName)}
              theme="vs-dark"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
              }}
            />
          </div>
        </main>
      )}

      {/* Main Timeline Content */}
      <main
        ref={containerRef}
        className="enhanced-timeline-container px-6 pb-20 max-h-screen overflow-y-auto custom-scrollbar"
        style={{ paddingTop: "120px" }}
      >
        <div className="timeline-content-enhanced max-w-4xl mx-auto">
          <div className="timeline-items-enhanced space-y-3">
            {commits.map((commit, index) => {
              const isActive = index === activeIndex;
              const isHovered = hoveredIndex === index;
              const stats = getStats(commit);
              const date = new Date(commit.date);
              const authorColor = getAuthorColor(commit.author);

              const commitBadge = getCommitBadge(commit.message);
              const activityColor = getActivityColor(
                stats.additions + stats.deletions
              );

              return (
                <motion.div
                  key={commit.hash}
                  className={`group relative border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800 cursor-pointer transition-colors ${
                    selectedCommits.has(commit.hash) ? 'ring-1 ring-blue-400' : ''
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-10%" }}
                  transition={{ delay: index * 0.01 }}
                  onClick={() => scrollToItem(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  whileHover={{ x: 6 }}
                >
                  <div className="relative">
                      {/* Floating actions */}
                      <motion.div
                        className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 absolute top-3 right-3"
                        initial={{ scale: 0.8 }}
                        whileHover={{ scale: 1 }}
                      >
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommitAction("select", commit);
                          }}
                          className={`p-1.5 rounded-md border transition-colors ${
                            selectedCommits.has(commit.hash)
                              ? 'border-blue-400 text-blue-600 dark:text-blue-300'
                              : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                            handleCommitAction("copy-hash", commit);
                          }}
                          className="p-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Copy hash"
                        >
                          <Copy size={14} />
                        </motion.button>

                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommitAction("create-branch", commit);
                          }}
                          className="p-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Create branch"
                        >
                          <GitBranch size={14} />
                        </motion.button>

                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommitAction("add-to-working", commit);
                          }}
                          className="p-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Add to working area"
                        >
                          <ArrowsClockwise size={14} />
                        </motion.button>

                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommitAction("view-diff", commit);
                          }}
                          className="p-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="View diff"
                        >
                          <Eye size={14} />
                        </motion.button>
                      </motion.div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{commit.message}</h3>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: authorColor }} />{commit.author}</span>
                          <span>•</span>
                          <span>{date.toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(commit.hash); }}
                            className="font-mono hover:underline"
                            title="Copy commit hash"
                          >
                            {commit.hash.slice(0,7)}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Minimal code preview */}
                    <AnimatePresence>
                      {(showFullHistory || isActive) && commit.content && (
                        <motion.div
                          className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg mt-3 overflow-hidden"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{
                            height: showFullHistory ? "240px" : "160px",
                            opacity: 1,
                          }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div>
                            <Editor
                              height={showFullHistory ? "240px" : "160px"}
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
                                padding: { top: 8, bottom: 8 },
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
                {selectedCommits.size} commit
                {selectedCommits.size > 1 ? "s" : ""} selected
              </span>

              <div className="action-buttons flex items-center gap-2">
                <motion.button
                  onClick={() => {
                    selectedCommits.forEach((hash) => {
                      const commit = commits.find((c) => c.hash === hash);
                      if (commit) handleCommitAction("cherry-pick", commit);
                    });
                  }}
                  className="px-4 py-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200 flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowsClockwise size={16} />
                  Cherry-pick
                </motion.button>

                {selectedCommits.size === 2 && (
                  <motion.button
                    onClick={() => {
                      // Compare is automatic via UI section; this is a no-op button for clarity
                    }}
                    className="px-4 py-2 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-all duration-200 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <GitCommit size={16} />
                    Compare
                  </motion.button>
                )}

                <motion.button
                  onClick={() => {
                    const hashesToCopy = Array.from(selectedCommits).join("\n");
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
