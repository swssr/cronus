import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { Commit } from "../types";
import { getVisibleCommits } from "../carousel-utils";
import { getCarouselSettings } from "../carousel-utils";
import { CarouselCard } from "./carousel-card";

export function FileHistoryCarousel({ commits, fileName }: { commits: Commit[]; fileName: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [cardsToShow, setCardsToShow] = useState<1 | 3 | 5>(3);
    const [isAnimating, setIsAnimating] = useState(false);
    
    const constraintsRef = useRef<HTMLDivElement>(null);
    const dragX = useMotionValue(0);
    const dragProgress = useTransform(dragX, [-300, 0, 300], [1, 0, -1]);

    // Time Machine-like spring configuration
    const springConfig = {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    };

    // More dramatic spring for snapping
    const snapSpring = {
      type: "spring" as const,
      stiffness: 400,
      damping: 35,
      mass: 0.6,
    };

    const nextSlide = useCallback(() => {
      if (isAnimating || commits.length <= 1) return;
      setIsAnimating(true);
      setCurrentIndex((prev) => (prev + 1) % commits.length);
      setTimeout(() => setIsAnimating(false), 600);
    }, [commits.length, isAnimating]);

    const prevSlide = useCallback(() => {
      if (isAnimating || commits.length <= 1) return;
      setIsAnimating(true);
      setCurrentIndex((prev) => (prev - 1 + commits.length) % commits.length);
      setTimeout(() => setIsAnimating(false), 600);
    }, [commits.length, isAnimating]);

    const goToSlide = useCallback((index: number) => {
      if (isAnimating || index === currentIndex) return;
      setIsAnimating(true);
      setCurrentIndex(index);
      setTimeout(() => setIsAnimating(false), 600);
    }, [currentIndex, isAnimating]);

    // Handle drag end with momentum
    const handleDragEnd = useCallback((event: any, info: PanInfo) => {
      const threshold = 50;
      const velocity = info.velocity.x;
      const offset = info.offset.x;
      
      // Add momentum based on velocity
      const momentum = Math.abs(velocity) > 500 ? Math.sign(velocity) * 2 : Math.sign(velocity);
      
      if (Math.abs(offset) > threshold || Math.abs(velocity) > 400) {
        if (offset > 0 || velocity > 400) {
          // Drag right - go to previous
          const steps = Math.min(Math.ceil(Math.abs(offset) / 150) + (momentum > 0 ? momentum : 0), 3);
          const newIndex = Math.max(currentIndex - steps, 0);
          setCurrentIndex(newIndex);
        } else {
          // Drag left - go to next  
          const steps = Math.min(Math.ceil(Math.abs(offset) / 150) + (momentum < 0 ? -momentum : 0), 3);
          const newIndex = Math.min(currentIndex + steps, commits.length - 1);
          setCurrentIndex(newIndex);
        }
      }
      
      // Reset drag value
      dragX.set(0);
    }, [currentIndex, commits.length, dragX]);

    // Handle wheel events with smooth momentum
    const handleWheel = useCallback((e: WheelEvent) => {
      e.preventDefault();
      if (isAnimating) return;
      
      const delta = e.deltaY || e.deltaX;
      if (Math.abs(delta) < 10) return;
      
      if (delta > 0 && currentIndex < commits.length - 1) {
        nextSlide();
      } else if (delta < 0 && currentIndex > 0) {
        prevSlide();
      }
    }, [currentIndex, commits.length, nextSlide, prevSlide, isAnimating]);

    // Add wheel listener
    useEffect(() => {
      const handleWheelEvent = (e: WheelEvent) => handleWheel(e);
      document.addEventListener('wheel', handleWheelEvent, { passive: false });
      return () => document.removeEventListener('wheel', handleWheelEvent);
    }, [handleWheel]);

    if (commits.length === 0) {
      return (
        <motion.div 
          className="carousel-loading"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springConfig}
        >
          <motion.div 
            className="loading-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, ...springConfig }}
          >
            Loading file history...
          </motion.p>
        </motion.div>
      );
    }

    const visibleCommits = getVisibleCommits(commits, currentIndex, cardsToShow);
    const settings = getCarouselSettings(cardsToShow);

    // Calculate positions for Time Machine effect
    const getPositionProps = (position: string, index: number) => {
      const baseZ = position === 'center' ? 0 : position === 'left' || position === 'right' ? -150 : -300;
      const baseX = position === 'center' ? 0 : 
                   position === 'left' ? -300 : 
                   position === 'right' ? 300 :
                   position === 'far-left' ? -500 : 500;
      const baseY = position === 'center' ? 0 : 
                   position === 'left' || position === 'right' ? 20 : 40;
      const scale = position === 'center' ? 1 : 
                   position === 'left' || position === 'right' ? 0.85 : 0.7;
      const rotateY = position === 'center' ? 0 :
                     position === 'left' ? 25 :
                     position === 'right' ? -25 :
                     position === 'far-left' ? 35 : -35;
      const opacity = position === 'center' ? 1 :
                     position === 'left' || position === 'right' ? 0.75 : 0.4;

      return {
        x: baseX,
        y: baseY,
        z: baseZ,
        scale,
        rotateY,
        opacity,
        transition: position === 'center' ? snapSpring : springConfig,
      };
    };

    return (
      <motion.div 
        className="carousel-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div 
          className="carousel-header"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, ...springConfig }}
        >
          <div className="file-info">
            <motion.h2
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, ...springConfig }}
            >
              {fileName}
            </motion.h2>
            <motion.p
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, ...springConfig }}
            >
              {commits.length} commits • Time travel through history
            </motion.p>
          </div>
          
          <motion.div 
            className="carousel-controls"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, ...springConfig }}
          >
            <div className="view-selector">
              {[1, 3, 5].map((count) => (
                <motion.button
                  key={count}
                  className={cardsToShow === count ? 'active' : ''}
                  onClick={() => setCardsToShow(count as 1 | 3 | 5)}
                  title={`${count === 1 ? 'Single' : count === 3 ? 'Three' : 'Five'} card view`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springConfig}
                >
                  {count}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <motion.div 
          ref={constraintsRef}
          className="carousel-viewport"
          style={{ 
            perspective: 1200,
            transformStyle: "preserve-3d"
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, ...springConfig }}
        >
          <motion.button
            className="carousel-nav prev"
            onClick={prevSlide}
            disabled={commits.length <= 1 || currentIndex === 0}
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.9 }}
            transition={springConfig}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
          >
            ‹
          </motion.button>
          
          <motion.div
            className="carousel-track"
            drag="x"
            dragConstraints={{ left: -300, right: 300 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={{ x: dragX }}
            whileDrag={{ cursor: "grabbing" }}
          >
            <AnimatePresence mode="popLayout">
              {visibleCommits.map(({ commit, index, position }) => {
                const positionProps = getPositionProps(position, index);
                const isClickable = position !== 'center';
                
                return (
                  <motion.div
                    key={`${index}-${position}-${currentIndex}`}
                    className={`carousel-slide ${position}`}
                    initial={{ 
                      x: position === 'left' || position === 'far-left' ? -800 : 800,
                      opacity: 0,
                      scale: 0.5,
                      rotateY: position === 'left' || position === 'far-left' ? 90 : -90
                    }}
                    animate={positionProps}
                    exit={{ 
                      x: position === 'left' || position === 'far-left' ? -800 : 800,
                      opacity: 0,
                      scale: 0.5,
                      rotateY: position === 'left' || position === 'far-left' ? 90 : -90,
                      transition: { duration: 0.4 }
                    }}
                    layout
                    layoutId={`card-${index}`}
                    onClick={isClickable ? () => goToSlide(index) : undefined}
                    whileHover={isClickable ? { 
                      scale: positionProps.scale * 1.05,
                      y: positionProps.y - 10,
                      transition: { type: "spring", stiffness: 400, damping: 25 }
                    } : {}}
                    style={{ 
                      cursor: isClickable ? 'pointer' : 'default',
                      zIndex: position === 'center' ? 10 : 5
                    }}
                  >
                    <motion.div
                      whileHover={{ 
                        boxShadow: position === 'center' 
                          ? "0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)"
                          : "0 15px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)"
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <CarouselCard commit={commit} index={index} />
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
          
          <motion.button
            className="carousel-nav next"
            onClick={nextSlide}
            disabled={commits.length <= 1 || currentIndex === commits.length - 1}
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.9 }}
            transition={springConfig}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
          >
            ›
          </motion.button>
        </motion.div>
        
        <motion.div 
          className="carousel-indicators"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, ...springConfig }}
        >
          <motion.div className="timeline-dots">
            {commits.slice(0, 15).map((_, index) => (
              <motion.button
                key={index}
                className={`timeline-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                title={`Commit ${commits[index].hash.slice(0, 8)}`}
                whileHover={{ scale: 1.4 }}
                whileTap={{ scale: 1.1 }}
                animate={{ 
                  scale: index === currentIndex ? 1.4 : 1,
                  backgroundColor: index === currentIndex 
                    ? "rgba(255, 255, 255, 0.9)" 
                    : "rgba(255, 255, 255, 0.3)"
                }}
                transition={springConfig}
                initial={{ scale: 0, opacity: 0 }}
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                }}
              />
            ))}
            {commits.length > 15 && (
              <motion.span 
                className="dots-overflow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, ...springConfig }}
              >
                +{commits.length - 15}
              </motion.span>
            )}
          </motion.div>
          
          <motion.div 
            className="commit-counter"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.2, ...springConfig }}
          >
            <motion.span
              key={currentIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={springConfig}
            >
              {currentIndex + 1} of {commits.length}
            </motion.span>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }