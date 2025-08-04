import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue } from "framer-motion";
import { Commit, DiffOptions } from "../types";
import { getVisibleCommits } from "../carousel-utils";
import { CarouselCard } from "./carousel-card";
import { CommitTimeline } from "./commit-timeline";

type ViewMode = 'carousel' | 'timeline';

interface FileHistoryCarouselProps {
  commits: Commit[];
  fileName: string;
  searchQuery: string;
  viewMode: ViewMode;
  cardsToShow: 1 | 3 | 5;
}

export function FileHistoryCarousel({ commits, fileName, searchQuery, viewMode, cardsToShow }: FileHistoryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [diffOptions, setDiffOptions] = useState<DiffOptions>({
    baseCommit: commits[0]?.hash || '', // Default to most recent commit
    compareMode: 'current',
    showLineNumbers: true,
    contextLines: 3
  });
  
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);

  // Apple-like spring animation
  const spring = { 
    type: "spring" as const, 
    stiffness: 400, 
    damping: 40,
    mass: 0.8
  };

  // Update diff options when commits change (set to most recent)
  useEffect(() => {
    if (commits.length > 0) {
      setDiffOptions(prev => ({
        ...prev,
        baseCommit: commits[0].hash // Most recent commit as default
      }));
    }
  }, [commits]);

  // Use commits directly since filtering is done in parent
  const filteredCommits = commits;

  const handleDiffChange = useCallback((newDiffOptions: DiffOptions) => {
    setDiffOptions(newDiffOptions);
  }, []);

  const navigate = useCallback((direction: 'next' | 'prev' | number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    if (typeof direction === 'number') {
      setCurrentIndex(direction);
    } else {
      setCurrentIndex(prev => 
        direction === 'next' 
          ? (prev + 1) % filteredCommits.length
          : (prev - 1 + filteredCommits.length) % filteredCommits.length
      );
    }
    
    // Shorter animation duration for snappier feel
    setTimeout(() => setIsAnimating(false), 400);
  }, [filteredCommits.length, isAnimating]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere when typing in search input (check for any input element)
      if (document.activeElement?.tagName.toLowerCase() === 'input') {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'h':
          e.preventDefault();
          if (currentIndex > 0) navigate('prev');
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          if (currentIndex < filteredCommits.length - 1) navigate('next');
          break;
        case 'Home':
          e.preventDefault();
          navigate(0);
          break;
        case 'End':
          e.preventDefault();
          navigate(filteredCommits.length - 1);
          break;
        case 'd': {
          e.preventDefault();
          // Cycle through diff modes
          const modes: Array<'current' | 'previous' | 'custom'> = ['current', 'previous', 'custom'];
          const currentModeIndex = modes.indexOf(diffOptions.compareMode);
          const nextMode = modes[(currentModeIndex + 1) % modes.length];
          setDiffOptions(prev => ({ ...prev, compareMode: nextMode }));
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, filteredCommits.length, navigate, diffOptions.compareMode]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > 50 || Math.abs(velocity.x) > 300) {
      navigate(offset.x > 0 ? 'prev' : 'next');
    }
    dragX.set(0);
  }, [navigate, dragX]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (isAnimating || Math.abs(e.deltaY) < 15) return;
    
    if (e.deltaY > 0 && currentIndex < filteredCommits.length - 1) navigate('next');
    else if (e.deltaY < 0 && currentIndex > 0) navigate('prev');
  }, [currentIndex, filteredCommits.length, navigate, isAnimating]);

  useEffect(() => {
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Reset current index when commits change (e.g., due to search)
  useEffect(() => {
    setCurrentIndex(0);
  }, [commits]);

    const timeline = (
        <CommitTimeline 
          commits={commits}
          fileName={fileName}
          diffOptions={diffOptions}
          onDiffChange={handleDiffChange}
        />
    );

  if (commits.length === 0) {
    return (
      <div className="carousel-loading">
        <div className="loading-spinner" />
        <p>Loading file history...</p>
      </div>
    );
  }

    const noResults = (
      <div className="carousel-container">
        <div className="no-results">
          <p>No commits found matching "{searchQuery}"</p>
          <p>Try a different search term or clear your search</p>
        </div>
      </div>
    );

  if (filteredCommits.length === 0) {
    return noResults;
  }

  const visibleCommits = getVisibleCommits(filteredCommits, currentIndex, cardsToShow);

  const getPositionProps = (position: string) => {
    const positions = {
      center: { 
        x: 0, 
        y: 0, 
        z: 0, 
        scale: 1, 
        rotateY: 0, 
        opacity: 1,
        filter: 'blur(0px)'
      },
      left: { 
        x: -280, 
        y: 10, 
        z: -100, 
        scale: 0.9, 
        opacity: 0.8,
        filter: 'blur(0.5px)'
      },
      right: { 
        x: 280, 
        y: 10, 
        z: -100, 
        scale: 0.9, 
        opacity: 0.8,
        filter: 'blur(0.5px)'
      },
      'far-left': { 
        x: -480, 
        y: 20, 
        z: -200, 
        scale: 0.75, 
        opacity: 0.5,
        filter: 'blur(1px)'
      },
      'far-right': { 
        x: 480, 
        y: 20, 
        z: -200, 
        scale: 0.75, 
        opacity: 0.5,
        filter: 'blur(1px)'
      }
    };
    return { ...positions[position as keyof typeof positions], transition: spring };
  };

  const carousel = (
    <div className="carousel-container">
      <div 
        ref={constraintsRef}
        className="carousel-viewport"
        style={{ perspective: 1400, transformStyle: "preserve-3d" }}
      >
        <button
          type="button"
          className="carousel-nav prev"
          onClick={() => navigate('prev')}
          disabled={filteredCommits.length <= 1 || currentIndex === 0}
          title="Previous commit (← or h)"
        >
          ‹
        </button>
        
        <motion.div
          className="carousel-track"
          drag="x"
          dragConstraints={{ left: -200, right: 200 }}
          dragElastic={0.05}
          onDragEnd={handleDragEnd}
          style={{ x: dragX }}
        >
          <AnimatePresence mode="popLayout">
            {visibleCommits.map(({ commit, index, position }) => {
              const positionProps = getPositionProps(position);
              const isClickable = position !== 'center';
              
              return (
                <motion.div
                  key={`${index}-${position}-${currentIndex}`}
                  className={`carousel-slide ${position}`}
                  initial={{ 
                    x: position.includes('left') ? -600 : 600,
                    opacity: 0,
                    scale: 0.6,
                    filter: 'blur(2px)'
                  }}
                  animate={positionProps}
                  exit={{ 
                    x: position.includes('left') ? -600 : 600,
                    opacity: 0,
                    scale: 0.6,
                    filter: 'blur(2px)'
                  }}
                  onClick={isClickable ? () => navigate(index) : undefined}
                  whileHover={isClickable ? { 
                    scale: positionProps.scale * 1.02,
                    y: positionProps.y - 5,
                    filter: 'blur(0px)'
                  } : {}}
                  whileTap={isClickable ? { 
                    scale: positionProps.scale * 0.98 
                  } : {}}
                  style={{ 
                    cursor: isClickable ? 'pointer' : 'default',
                    zIndex: position === 'center' ? 10 : 5
                  }}
                >
                  <CarouselCard 
                    commit={commit} 
                    index={index} 
                    diffOptions={diffOptions}
                    onDiffChange={handleDiffChange}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
        
        <button
          type="button"
          className="carousel-nav next"
          onClick={() => navigate('next')}
          disabled={filteredCommits.length <= 1 || currentIndex === filteredCommits.length - 1}
          title="Next commit (→ or l)"
        >
          ›
        </button>
      </div>
      
      <div className="carousel-indicators">
        <div className="timeline-dots">
          {filteredCommits.slice(0, 15).map((commit, index) => (
            <button
              key={`dot-${commit.hash}-${index}`}
              type="button"
              className={`timeline-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => navigate(index)}
              title={`Commit ${commit.hash.slice(0, 8)}`}
            />
          ))}
          {filteredCommits.length > 15 && (
            <span className="dots-overflow">+{filteredCommits.length - 15}</span>
          )}
        </div>
        
        <div className="commit-counter">
          {currentIndex + 1} of {filteredCommits.length}
        </div>
      </div>

      <div className="keyboard-hints">
        <span>💡 Shortcuts: ←→ navigate • d diff mode • Home/End jump to first/last</span>
      </div>
    </div>
  );


  return (
    <div className="view-container">
      {viewMode === 'timeline' ? timeline : carousel}
    </div>
  )
}

