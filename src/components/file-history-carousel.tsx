import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue } from "framer-motion";
import { Commit } from "../types";
import { getVisibleCommits } from "../carousel-utils";
import { CarouselCard } from "./carousel-card";

export function FileHistoryCarousel({ commits, fileName }: { commits: Commit[]; fileName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsToShow, setCardsToShow] = useState<1 | 3 | 5>(3);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);

  const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

  const navigate = useCallback((direction: 'next' | 'prev' | number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    if (typeof direction === 'number') {
      setCurrentIndex(direction);
    } else {
      setCurrentIndex(prev => 
        direction === 'next' 
          ? (prev + 1) % commits.length
          : (prev - 1 + commits.length) % commits.length
      );
    }
    
    setTimeout(() => setIsAnimating(false), 600);
  }, [commits.length, isAnimating]);

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
    
    if (e.deltaY > 0 && currentIndex < commits.length - 1) navigate('next');
    else if (e.deltaY < 0 && currentIndex > 0) navigate('prev');
  }, [currentIndex, commits.length, navigate, isAnimating]);

  useEffect(() => {
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  if (commits.length === 0) {
    return (
      <div className="carousel-loading">
        <div className="loading-spinner" />
        <p>Loading file history...</p>
      </div>
    );
  }

  const visibleCommits = getVisibleCommits(commits, currentIndex, cardsToShow);

  const getPositionProps = (position: string) => {
    const positions = {
      center: { x: 0, y: 0, z: 0, scale: 1, rotateY: 0, opacity: 1 },
      left: { x: -300, y: 20, z: -150, scale: 0.85, rotateY: 25, opacity: 0.75 },
      right: { x: 300, y: 20, z: -150, scale: 0.85, rotateY: -25, opacity: 0.75 },
      'far-left': { x: -500, y: 40, z: -300, scale: 0.7, rotateY: 35, opacity: 0.4 },
      'far-right': { x: 500, y: 40, z: -300, scale: 0.7, rotateY: -35, opacity: 0.4 }
    };
    return { ...positions[position as keyof typeof positions], transition: spring };
  };

  return (
    <div className="carousel-container">
      <div className="carousel-header">
        <div className="file-info">
          <h2>{fileName}</h2>
          <p>{commits.length} commits • Time travel through history</p>
        </div>
        
        <div className="carousel-controls">
          <div className="view-selector">
            {[1, 3, 5].map((count) => (
              <button
                key={count}
                className={cardsToShow === count ? 'active' : ''}
                onClick={() => setCardsToShow(count as 1 | 3 | 5)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div 
        ref={constraintsRef}
        className="carousel-viewport"
        style={{ perspective: 1200, transformStyle: "preserve-3d" }}
      >
        <button
          className="carousel-nav prev"
          onClick={() => navigate('prev')}
          disabled={commits.length <= 1 || currentIndex === 0}
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
                  <CarouselCard commit={commit} index={index} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
        
        <button
          className="carousel-nav next"
          onClick={() => navigate('next')}
          disabled={commits.length <= 1 || currentIndex === commits.length - 1}
        >
          ›
        </button>
      </div>
      
      <div className="carousel-indicators">
        <div className="timeline-dots">
          {commits.slice(0, 15).map((_, index) => (
            <button
              key={index}
              className={`timeline-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => navigate(index)}
              title={`Commit ${commits[index].hash.slice(0, 8)}`}
            />
          ))}
          {commits.length > 15 && (
            <span className="dots-overflow">+{commits.length - 15}</span>
          )}
        </div>
        
        <div className="commit-counter">
          {currentIndex + 1} of {commits.length}
        </div>
      </div>
    </div>
  );
}