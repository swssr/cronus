import { Commit } from "./types";

export type CarouselPosition = 'far-left' | 'left' | 'center' | 'right' | 'far-right';

export interface VisibleCommit {
  commit: Commit;
  index: number;
  position: CarouselPosition;
}

export function getVisibleCommits(
  commits: Commit[], 
  currentIndex: number, 
  cardsToShow: number = 3
): VisibleCommit[] {
  const total = commits.length;
  
  if (total === 0) return [];
  if (total === 1) {
    return [{ commit: commits[0], index: 0, position: 'center' }];
  }
  
  const visible: VisibleCommit[] = [];
  const positions: CarouselPosition[] = [];
  
  // Calculate positions based on cards to show
  if (cardsToShow === 1) {
    positions.push('center');
  } else if (cardsToShow === 3) {
    positions.push('left', 'center', 'right');
  } else if (cardsToShow === 5) {
    positions.push('far-left', 'left', 'center', 'right', 'far-right');
  } else {
    // Default to 3 cards for unsupported numbers
    positions.push('left', 'center', 'right');
  }
  
  const centerIdx = Math.floor(positions.length / 2);
  
  for (let i = 0; i < positions.length; i++) {
    const offset = i - centerIdx;
    let commitIndex = (currentIndex + offset + total) % total;
    
    // Skip duplicates for small arrays
    if (total < positions.length && i >= total) {
      continue;
    }
    
    visible.push({
      commit: commits[commitIndex],
      index: commitIndex,
      position: positions[i]
    });
  }
  
  return visible;
}