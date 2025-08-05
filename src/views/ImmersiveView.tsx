import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import type { Commit } from "../types";
import { Editor } from "@monaco-editor/react";
import { getFileLanguage } from "../utils/index";
import { useMomentumScroll } from "../hooks/useMomentumScroll";
import { CardActions } from "../components/CardActions";

interface ImmersiveViewProps {
  commits: Commit[];
  fileName: string;
}

export function ImmersiveView({ commits, fileName }: ImmersiveViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Setup momentum scrolling
  useMomentumScroll(containerRef, {
    friction: 0.92,
    elasticity: 0.15,
    minVelocity: 0.8,
    maxVelocity: 45
  });
  
  // Scroll progress tracking
  const { scrollYProgress } = useScroll({
    container: containerRef,
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

  // Handle scrubber interaction
  const handleScrubberClick = useCallback((e: React.MouseEvent) => {
    const scrubber = e.currentTarget as HTMLElement;
    const rect = scrubber.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const targetIndex = Math.round(progress * (commits.length - 1));
    scrollToItem(targetIndex);
  }, [commits.length, scrollToItem]);

  // Handle card actions
  const handleCardAction = useCallback((action: string, commit: Commit) => {
    switch (action) {
      case 'copy-hash':
        navigator.clipboard.writeText(commit.hash).catch(console.error);
        break;
      case 'view-diff':
        // TODO: Implement diff view
        console.log('View diff for:', commit.hash);
        break;
      case 'checkout':
        // TODO: Implement checkout
        console.log('Checkout:', commit.hash);
        break;
      case 'open-external':
        // TODO: Implement external open
        console.log('Open external:', commit.hash);
        break;
      case 'download':
        // TODO: Implement download
        console.log('Download file at:', commit.hash);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, []);

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
                  {/* Timeline dot */}
                  <div className="timeline-dot-clean">
                    <motion.div 
                      className="dot-inner"
                      animate={{
                        scale: isActive ? 1.3 : 1,
                        backgroundColor: isActive ? "#0A84FF" : "#48484A"
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
                          <span className="commit-message-clean">{commit.message}</span>
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
                        
                        {stats.files > 0 && (
                          <div className="commit-stats-clean">
                            <span className="files-count">
                              {stats.files} file{stats.files > 1 ? 's' : ''}
                            </span>
                            {stats.additions > 0 && <span className="additions">+{stats.additions}</span>}
                            {stats.deletions > 0 && <span className="deletions">-{stats.deletions}</span>}
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