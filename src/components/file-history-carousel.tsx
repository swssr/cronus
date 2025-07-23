import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue } from "framer-motion";
import { Commit, DiffOptions } from "../types";
import { getVisibleCommits } from "../carousel-utils";
import { CarouselCard } from "./carousel-card";

export function FileHistoryCarousel({ commits, fileName }: { commits: Commit[]; fileName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsToShow, setCardsToShow] = useState<1 | 3 | 5>(3);
  const [isAnimating, setIsAnimating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [diffOptions, setDiffOptions] = useState<DiffOptions>({
    baseCommit: commits[0]?.hash || '', // Default to most recent commit
    compareMode: 'current',
    showLineNumbers: true,
    contextLines: 3
  });
  
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

  // Update diff options when commits change (set to most recent)
  useEffect(() => {
    if (commits.length > 0) {
      setDiffOptions(prev => ({
        ...prev,
        baseCommit: commits[0].hash // Most recent commit as default
      }));
    }
  }, [commits]);

  // Filter commits based on search query
  const filteredCommits = searchQuery.trim() 
    ? commits.filter(commit => 
        commit.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commit.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commit.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : commits;

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
    
    setTimeout(() => setIsAnimating(false), 600);
  }, [filteredCommits.length, isAnimating]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere when typing in search
      if (document.activeElement === searchInputRef.current) {
        if (e.key === 'Escape') {
          setShowSearch(false);
          setSearchQuery("");
          searchInputRef.current?.blur();
        }
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
        case '/':
        case 'f':
          e.preventDefault();
          setShowSearch(true);
          setTimeout(() => searchInputRef.current?.focus(), 100);
          break;
        case 'Escape':
          if (showSearch) {
            setShowSearch(false);
            setSearchQuery("");
          }
          break;
        case '1':
        case '3':
        case '5':
          e.preventDefault();
          setCardsToShow(parseInt(e.key) as 1 | 3 | 5);
          break;
        case 'd':
          e.preventDefault();
          // Cycle through diff modes
          const modes: Array<'current' | 'previous' | 'custom'> = ['current', 'previous', 'custom'];
          const currentModeIndex = modes.indexOf(diffOptions.compareMode);
          const nextMode = modes[(currentModeIndex + 1) % modes.length];
          setDiffOptions(prev => ({ ...prev, compareMode: nextMode }));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, filteredCommits.length, navigate, showSearch, diffOptions.compareMode]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > 50 || Math.abs(velocity.x) > 400) {
      navigate(offset.x > 0 ? 'prev' : 'next');
    }
    dragX.set(0);
  }, [navigate, dragX]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (isAnimating || Math.abs(e.deltaY) < 10) return;
    
    if (e.deltaY > 0 && currentIndex < filteredCommits.length - 1) navigate('next');
    else if (e.deltaY < 0 && currentIndex > 0) navigate('prev');
  }, [currentIndex, filteredCommits.length, navigate, isAnimating]);

  useEffect(() => {
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Reset current index when search changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [searchQuery]);

  if (commits.length === 0) {
    return (
      <div className="carousel-loading">
        <div className="loading-spinner" />
        <p>Loading file history...</p>
      </div>
    );
  }

  if (filteredCommits.length === 0) {
    return (
      <div className="carousel-container">
        <div className="carousel-header">
          <div className="file-info">
            <h2>{fileName}</h2>
            <p>No commits found matching "{searchQuery}"</p>
          </div>
          <div className="carousel-controls">
            <button 
              className="search-toggle" 
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery("");
              }}
            >
              🔍
            </button>
          </div>
        </div>
        {showSearch && (
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search commits, authors, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>
        )}
        <div className="no-results">
          <p>Try a different search term or clear your search</p>
          <button 
            className="clear-search-btn" 
            onClick={() => setSearchQuery("")}
          >
            Clear Search
          </button>
        </div>
      </div>
    );
  }

  const visibleCommits = getVisibleCommits(filteredCommits, currentIndex, cardsToShow);

  const getPositionProps = (position: string) => {
    const positions = {
      center: { x: 0, y: 0, z: 0, scale: 1, rotateY: 0, opacity: 1 },
      left: { x: -300, y: 20, z: -150, scale: 0.85, opacity: 0.75 },
      right: { x: 300, y: 20, z: -150, scale: 0.85, opacity: 0.75 },
      'far-left': { x: -500, y: 40, z: -300, scale: 0.7, opacity: 0.4 },
      'far-right': { x: 500, y: 40, z: -300, scale: 0.7, opacity: 0.4 }
    };
    return { ...positions[position as keyof typeof positions], transition: spring };
  };

  return (
    <div className="carousel-container">
      <div className="carousel-header">
        <div className="file-info">
          <h2>{fileName}</h2>
          <p>
            {searchQuery 
              ? `${filteredCommits.length} of ${commits.length} commits` 
              : `${commits.length} commits`
            } • Showing diffs against {diffOptions.compareMode} version
          </p>
        </div>
        
        <div className="carousel-controls">
          <button 
            className={`search-toggle ${showSearch ? 'active' : ''}`}
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery("");
              else setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            title="Search commits (/ or f)"
          >
            🔍
          </button>
          
          <div className="view-selector">
            {[1, 3, 5].map((count) => (
              <button
                key={count}
                className={cardsToShow === count ? 'active' : ''}
                onClick={() => setCardsToShow(count as 1 | 3 | 5)}
                title={`${count} card view (${count})`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSearch && (
        <div className="search-container">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search commits, authors, or code... (ESC to close)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            autoFocus
          />
          {searchQuery && (
            <button 
              className="clear-search" 
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div 
        ref={constraintsRef}
        className="carousel-viewport"
        style={{ perspective: 1200, transformStyle: "preserve-3d" }}
      >
        <button
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
          dragConstraints={{ left: -300, right: 300 }}
          dragElastic={0.1}
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
                    x: position.includes('left') ? -800 : 800,
                    opacity: 0,
                    scale: 0.5
                  }}
                  animate={positionProps}
                  exit={{ 
                    x: position.includes('left') ? -800 : 800,
                    opacity: 0,
                    scale: 0.5
                  }}
                  onClick={isClickable ? () => navigate(index) : undefined}
                  whileHover={isClickable ? { 
                    scale: positionProps.scale * 1.05,
                    y: positionProps.y - 10
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
          {filteredCommits.slice(0, 15).map((_, index) => (
            <button
              key={index}
              className={`timeline-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => navigate(index)}
              title={`Commit ${filteredCommits[index].hash.slice(0, 8)}`}
            />
          ))}
          {filteredCommits.length > 15 && (
            <span className="dots-overflow">+{filteredCommits.length - 15}</span>
          )}
        </div>
        
        <div className="commit-counter">
          {currentIndex + 1} of {filteredCommits.length}
          {searchQuery && ` (filtered)`}
        </div>
      </div>

      <div className="keyboard-hints">
        <span>💡 Shortcuts: ←→ navigate • / search • d diff mode • 1,3,5 view modes • ESC close</span>
      </div>
    </div>
  );
}