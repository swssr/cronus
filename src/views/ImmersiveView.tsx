import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import type { Commit, DiffOptions } from "../types";
import { Editor } from "@monaco-editor/react";
import { getFileLanguage } from "../utils/index";

interface ImmersiveViewProps {
  commits: Commit[];
  fileName: string;
  diffOptions?: DiffOptions;
  onDiffChange?: (options: DiffOptions) => void;
}

interface TimelineItem {
  commit: Commit;
  date: Date;
  year: number;
  month: string;
  day: number;
  index: number;
}

export function ImmersiveView({ commits, fileName }: ImmersiveViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
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
  const thumbTransform = useTransform(scrollProgress, [0, 1], ["0%", "calc(100% - 20px)"]);

  // Transform timeline items data
  const timelineItems: TimelineItem[] = useMemo(() => {
    return commits.map((commit, index) => {
      const date = new Date(commit.date);
      return {
        commit,
        date,
        year: date.getFullYear(),
        month: date.toLocaleDateString('en', { month: 'short' }),
        day: date.getDate(),
        index
      };
    });
  }, [commits]);

  // Group items by year for better organization
  const groupedByYear = useMemo(() => {
    const groups: { [year: number]: TimelineItem[] } = {};
    timelineItems.forEach(item => {
      if (!groups[item.year]) {
        groups[item.year] = [];
      }
      groups[item.year].push(item);
    });
    return groups;
  }, [timelineItems]);

  const years = Object.keys(groupedByYear).map(Number).sort((a, b) => b - a);

  // Auto-detect active item based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isDragging) return;
      
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const scrollHeight = container.scrollHeight;
      
      // Calculate which item should be active based on scroll position
      const progress = scrollTop / (scrollHeight - containerHeight);
      const newActiveIndex = Math.round(progress * (timelineItems.length - 1));
      
      if (newActiveIndex !== activeIndex && newActiveIndex >= 0 && newActiveIndex < timelineItems.length) {
        setActiveIndex(newActiveIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, timelineItems.length, isDragging]);

  // Scroll to specific item
  const scrollToItem = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const scrollHeight = container.scrollHeight;
    const containerHeight = container.clientHeight;
    const progress = index / (timelineItems.length - 1);
    const targetScroll = progress * (scrollHeight - containerHeight);
    
    container.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
    setActiveIndex(index);
  }, [timelineItems.length]);

  // Handle scrubber interaction
  const handleScrubberInteraction = useCallback((clientY: number) => {
    const scrubber = document.querySelector('.timeline-scrubber') as HTMLElement;
    if (!scrubber) return;

    const rect = scrubber.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const targetIndex = Math.round(progress * (timelineItems.length - 1));
    
    scrollToItem(targetIndex);
  }, [scrollToItem, timelineItems.length]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStats = (commit: Commit) => {
    if (commit.stats) {
      return commit.stats;
    }
    
    const lines = commit.content.split('\n').length;
    return {
      additions: Math.floor(lines * 0.7),
      deletions: Math.floor(lines * 0.3)
    };
  };

  // const activeItem = timelineItems[activeIndex];

  if (timelineItems.length === 0) {
    return (
      <div className="immersive-timeline-empty">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-content"
        >
          <h2>No commits found</h2>
          <p>Try adjusting your search or check back later</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="immersive-timeline">
      {/* Timeline Scrubber */}
      <motion.div 
        className="timeline-scrubber"
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
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
          />
        </div>
        
        {/* Year markers */}
        <div className="year-markers">
          {years.map((year) => {
            const firstItemOfYear = groupedByYear[year][0];
            const progress = firstItemOfYear.index / (timelineItems.length - 1);
            
            return (
              <motion.button
                key={year}
                type="button"
                className="year-marker"
                style={{
                  top: `${progress * 100}%`
                }}
                onClick={() => scrollToItem(firstItemOfYear.index)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <span>{year}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Main Timeline Content */}
      <main 
        ref={containerRef}
        className="timeline-content-container"
        onMouseMove={(e) => {
          if (isDragging) {
            handleScrubberInteraction(e.clientY);
          }
        }}
        onMouseUp={() => setIsDragging(false)}
      >
        <div className="timeline-content">
          {years.map((year) => (
            <motion.div
              key={year}
              className="timeline-year-section"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-20%" }}
            >
              <motion.div 
                className="year-header"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <h2>{year}</h2>
                <div className="year-line" />
              </motion.div>

              <div className="timeline-items">
                {groupedByYear[year].map((item) => {
                  const isActive = item.index === activeIndex;
                  const stats = getStats(item.commit);
                  
                  return (
                    <motion.div
                      key={item.commit.hash}
                      className={`timeline-item ${isActive ? 'active' : ''}`}
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-10%" }}
                      transition={{ 
                        delay: (item.index % 5) * 0.1,
                        duration: 0.6,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                      onClick={() => scrollToItem(item.index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          scrollToItem(item.index);
                        }
                      }}
                      tabIndex={0}
                    >
                      <div className="timeline-node">
                        <motion.div 
                          className="timeline-dot"
                          animate={{
                            scale: isActive ? 1.5 : 1,
                            backgroundColor: isActive ? 'var(--accent-blue)' : 'var(--surface-tertiary)'
                          }}
                          transition={{ duration: 0.3 }}
                        />
                        <div className="timeline-line" />
                      </div>

                      <motion.div 
                        className="timeline-card"
                        animate={{
                          scale: isActive ? 1.02 : 1,
                          y: isActive ? -5 : 0
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="card-header">
                          <div className="commit-date">
                            <span className="month">{item.month}</span>
                            <span className="day">{item.day}</span>
                          </div>
                          
                          <div className="commit-info">
                            <h3 className="commit-message">{item.commit.message}</h3>
                            <div className="commit-meta">
                              <span className="author">👤 {item.commit.author}</span>
                              <button
                                type="button"
                                className="hash"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(item.commit.hash);
                                }}
                              >
                                📋 {item.commit.hash.slice(0, 8)}
                              </button>
                            </div>
                            
                            <div className="commit-stats">
                              <span className="stat additions">+{stats.additions}</span>
                              <span className="stat deletions">-{stats.deletions}</span>
                              <span className="stat total">∼{stats.additions + stats.deletions}</span>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              className="card-content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ 
                                duration: 0.4,
                                ease: [0.4, 0, 0.2, 1]
                              }}
                            >
                              <div className="code-preview">
                                <Editor
                                  height="400px"
                                  language={getFileLanguage(fileName)}
                                  value={item.commit.content}
                                  theme="vs-dark"
                                  options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 12,
                                    lineNumbers: "on",
                                    wordWrap: "on",
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    scrollbar: { 
                                      vertical: 'auto', 
                                      horizontal: 'auto',
                                      verticalSliderSize: 8,
                                      horizontalSliderSize: 8
                                    },
                                    folding: false,
                                    renderLineHighlight: 'none',
                                    selectionHighlight: false,
                                    contextmenu: false
                                  }}
                                />
                              </div>
                              
                              <div className="card-actions">
                                <button 
                                  type="button"
                                  className="action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(item.commit.content);
                                  }}
                                >
                                  📄 Copy Content
                                </button>
                                <button type="button" className="action-btn">
                                  🔍 View Diff
                                </button>
                                <button type="button" className="action-btn">
                                  ↩️ Restore
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Content fade masks */}
      <div className="timeline-masks">
        <div className="mask-top" />
        <div className="mask-bottom" />
      </div>

      {/* Navigation hints */}
      <motion.div 
        className="timeline-hints"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <span>Scroll to explore • Click items to expand • Drag timeline scrubber</span>
      </motion.div>
    </div>
  );
}