import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

interface VirtualScrollContainerProps {
  items: any[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualScrollContainer({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
}: VirtualScrollContainerProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();

  const getItemHeight = useCallback((index: number) => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
  }, [itemHeight]);

  const itemOffsets = useMemo(() => {
    const offsets = [0];
    for (let i = 0; i < items.length; i++) {
      offsets.push(offsets[i] + getItemHeight(i));
    }
    return offsets;
  }, [items.length, getItemHeight]);

  const totalHeight = itemOffsets[items.length] || 0;

  const visibleRange = useMemo(() => {
    if (items.length === 0) return { start: 0, end: 0, offsetY: 0 };

    let start = 0;
    let end = items.length - 1;

    // Binary search for start index
    let left = 0, right = items.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (itemOffsets[mid] < scrollTop) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    start = Math.max(0, left - 1);

    // Binary search for end index
    left = start;
    right = items.length;
    const scrollBottom = scrollTop + containerHeight;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (itemOffsets[mid] < scrollBottom) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    end = Math.min(items.length - 1, left);

    const overscanStart = Math.max(0, start - overscan);
    const overscanEnd = Math.min(items.length - 1, end + overscan);

    return {
      start: overscanStart,
      end: overscanEnd,
      offsetY: itemOffsets[overscanStart] || 0,
    };
  }, [scrollTop, containerHeight, items.length, overscan, itemOffsets]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange.start, visibleRange.end]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(e.currentTarget.scrollTop);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={`virtual-scroll-container ${className}`}
      style={{ 
        height: containerHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${visibleRange.offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            width: '100%'
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index;
            return (
              <div
                key={`item-${actualIndex}-${item.hash || actualIndex}`}
                style={{ 
                  height: getItemHeight(actualIndex),
                  minHeight: getItemHeight(actualIndex),
                  width: '100%',
                  position: 'relative'
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}