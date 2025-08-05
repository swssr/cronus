import { useRef, useCallback, useEffect } from 'react';

interface MomentumScrollOptions {
  friction?: number;
  elasticity?: number;
  minVelocity?: number;
  maxVelocity?: number;
}

export function useMomentumScroll(
  containerRef: React.RefObject<HTMLElement>,
  options: MomentumScrollOptions = {}
) {
  const {
    friction = 0.95,
    elasticity = 0.2,
    minVelocity = 0.5,
    maxVelocity = 50
  } = options;

  const isDragging = useRef(false);
  const startY = useRef(0);
  const lastY = useRef(0);
  const velocityY = useRef(0);
  const lastTime = useRef(0);
  const animationId = useRef<number>();

  const animate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (Math.abs(velocityY.current) > minVelocity) {
      const currentScrollTop = container.scrollTop;
      const maxScroll = container.scrollHeight - container.clientHeight;
      
      let newScrollTop = currentScrollTop + velocityY.current;
      
      // Apply elastic effect when overscrolling
      if (newScrollTop < 0) {
        newScrollTop = newScrollTop * elasticity;
        velocityY.current *= friction * 0.5;
      } else if (newScrollTop > maxScroll) {
        const overflow = newScrollTop - maxScroll;
        newScrollTop = maxScroll + overflow * elasticity;
        velocityY.current *= friction * 0.5;
      }
      
      container.scrollTop = Math.max(0, Math.min(maxScroll, newScrollTop));
      velocityY.current *= friction;
      
      animationId.current = requestAnimationFrame(animate);
    }
  }, [friction, elasticity, minVelocity, containerRef]);

  const stopAnimation = useCallback(() => {
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
      animationId.current = undefined;
    }
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;
    
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container) return;

    const currentTime = Date.now();
    const deltaY = lastY.current - e.clientY;
    const deltaTime = currentTime - lastTime.current;
    
    // Update scroll position
    container.scrollTop += deltaY;
    
    // Calculate velocity for momentum
    if (deltaTime > 0) {
      velocityY.current = deltaY / deltaTime * 16; // Normalize to 60fps
      velocityY.current = Math.max(-maxVelocity, Math.min(maxVelocity, velocityY.current));
    }
    
    lastY.current = e.clientY;
    lastTime.current = currentTime;
  }, [maxVelocity, containerRef]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    isDragging.current = false;
    
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
    
    // Release pointer capture
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    
    // Start momentum animation if there's enough velocity
    if (Math.abs(velocityY.current) > minVelocity) {
      animationId.current = requestAnimationFrame(animate);
    }
  }, [animate, minVelocity, handlePointerMove]);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    // Prevent text selection
    e.preventDefault();
    
    isDragging.current = true;
    startY.current = e.clientY;
    lastY.current = e.clientY;
    velocityY.current = 0;
    lastTime.current = Date.now();
    
    stopAnimation();
    
    // Capture pointer for smooth tracking
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [stopAnimation, handlePointerMove, handlePointerUp]);

  const setupMomentumScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Disable native scrolling momentum to replace with custom
    container.style.overscrollBehavior = 'none';
    container.style.userSelect = 'none';
    container.style.webkitUserSelect = 'none';
    container.style.touchAction = 'none';
    
    container.addEventListener('pointerdown', handlePointerDown);
    
    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      stopAnimation();
    };
  }, [handlePointerDown, stopAnimation, containerRef]);

  useEffect(() => {
    return setupMomentumScroll();
  }, [setupMomentumScroll]);

  return {
    isDragging: isDragging.current,
    stopAnimation
  };
}