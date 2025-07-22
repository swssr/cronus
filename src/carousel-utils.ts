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

export function getCarouselSettings(cardsToShow: number) {
  const settings = {
    3: {
      cardWidth: 400,
      gap: '2rem',
      scales: { left: 0.85, center: 1, right: 0.85 },
      rotations: { left: 15, center: 0, right: -15 },
      opacities: { left: 0.6, center: 1, right: 0.6 },
      translations: { left: '-20%', center: '0', right: '20%' }
    },
    5: {
      cardWidth: 320,
      gap: '1.5rem', 
      scales: { 'far-left': 0.7, left: 0.85, center: 1, right: 0.85, 'far-right': 0.7 },
      rotations: { 'far-left': 25, left: 15, center: 0, right: -15, 'far-right': -25 },
      opacities: { 'far-left': 0.4, left: 0.6, center: 1, right: 0.6, 'far-right': 0.4 },
      translations: { 'far-left': '-40%', left: '-20%', center: '0', right: '20%', 'far-right': '40%' }
    },
    1: {
      cardWidth: 500,
      gap: '0',
      scales: { center: 1 },
      rotations: { center: 0 },
      opacities: { center: 1 },
      translations: { center: '0' }
    }
  };
  
  return settings[cardsToShow as keyof typeof settings] || settings[3];
} 