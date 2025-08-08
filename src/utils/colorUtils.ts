/**
 * Utility functions for generating consistent colors for different entities
 */

// Color palette inspired by modern design systems
const AUTHOR_COLORS = [
  '#0A84FF', // Blue
  '#30D158', // Green 
  '#FF9F0A', // Orange
  '#BF5AF2', // Purple
  '#FF453A', // Red
  '#64D2FF', // Light Blue
  '#FFD60A', // Yellow
  '#FF2D92', // Pink
  '#32D74B', // Light Green
  '#FF9500', // Dark Orange
  '#5E5CE6', // Indigo
  '#AF52DE', // Light Purple
];

const FILE_TYPE_COLORS = {
  // Programming languages
  typescript: '#3178C6',
  javascript: '#F7DF1E',
  python: '#3776AB',
  java: '#007396',
  cpp: '#00599C',
  csharp: '#239120',
  go: '#00ADD8',
  rust: '#000000',
  swift: '#FA7343',
  kotlin: '#7F52FF',
  
  // Web technologies
  html: '#E34F26',
  css: '#1572B6',
  scss: '#CF649A',
  less: '#1D365D',
  vue: '#4FC08D',
  react: '#61DAFB',
  angular: '#DD0031',
  
  // Data/Config
  json: '#000000',
  xml: '#FF6600',
  yaml: '#CB171E',
  toml: '#9C4221',
  ini: '#427819',
  
  // Documentation
  markdown: '#083FA1',
  text: '#89E051',
  
  // Assets
  image: '#FF69B4',
  video: '#800080',
  audio: '#FF4500',
  
  // Default
  default: '#8E8E93'
};

/**
 * Generate a consistent color for an author based on their name
 */
export function getAuthorColor(authorName: string): string {
  if (!authorName) return AUTHOR_COLORS[0];
  
  // Create a simple hash of the author name
  let hash = 0;
  for (let i = 0; i < authorName.length; i++) {
    const char = authorName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get a color index
  const colorIndex = Math.abs(hash) % AUTHOR_COLORS.length;
  return AUTHOR_COLORS[colorIndex];
}

/**
 * Get color for file type based on extension
 */
export function getFileTypeColor(fileName: string): string {
  if (!fileName) return FILE_TYPE_COLORS.default;
  
  const extension = fileName.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'ts':
    case 'tsx':
      return FILE_TYPE_COLORS.typescript;
    case 'js':
    case 'jsx':
    case 'mjs':
      return FILE_TYPE_COLORS.javascript;
    case 'py':
      return FILE_TYPE_COLORS.python;
    case 'java':
      return FILE_TYPE_COLORS.java;
    case 'cpp':
    case 'cc':
    case 'cxx':
      return FILE_TYPE_COLORS.cpp;
    case 'cs':
      return FILE_TYPE_COLORS.csharp;
    case 'go':
      return FILE_TYPE_COLORS.go;
    case 'rs':
      return FILE_TYPE_COLORS.rust;
    case 'swift':
      return FILE_TYPE_COLORS.swift;
    case 'kt':
      return FILE_TYPE_COLORS.kotlin;
    case 'html':
      return FILE_TYPE_COLORS.html;
    case 'css':
      return FILE_TYPE_COLORS.css;
    case 'scss':
    case 'sass':
      return FILE_TYPE_COLORS.scss;
    case 'less':
      return FILE_TYPE_COLORS.less;
    case 'vue':
      return FILE_TYPE_COLORS.vue;
    case 'json':
      return FILE_TYPE_COLORS.json;
    case 'xml':
      return FILE_TYPE_COLORS.xml;
    case 'yml':
    case 'yaml':
      return FILE_TYPE_COLORS.yaml;
    case 'toml':
      return FILE_TYPE_COLORS.toml;
    case 'ini':
      return FILE_TYPE_COLORS.ini;
    case 'md':
    case 'mdx':
      return FILE_TYPE_COLORS.markdown;
    case 'txt':
      return FILE_TYPE_COLORS.text;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return FILE_TYPE_COLORS.image;
    case 'mp4':
    case 'mov':
    case 'avi':
      return FILE_TYPE_COLORS.video;
    case 'mp3':
    case 'wav':
    case 'flac':
      return FILE_TYPE_COLORS.audio;
    default:
      return FILE_TYPE_COLORS.default;
  }
}

/**
 * Generate a lighter/darker shade of a color
 */
export function adjustColorOpacity(color: string, opacity: number): string {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get commit type color based on commit message patterns
 */
export function getCommitTypeColor(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.startsWith('feat') || msg.includes('feature')) {
    return '#30D158'; // Green for features
  }
  if (msg.startsWith('fix') || msg.includes('bug')) {
    return '#FF453A'; // Red for fixes
  }
  if (msg.startsWith('docs') || msg.includes('documentation')) {
    return '#64D2FF'; // Light blue for docs
  }
  if (msg.startsWith('style') || msg.includes('formatting')) {
    return '#FF9F0A'; // Orange for styling
  }
  if (msg.startsWith('refactor')) {
    return '#BF5AF2'; // Purple for refactoring
  }
  if (msg.startsWith('test')) {
    return '#FFD60A'; // Yellow for tests
  }
  if (msg.startsWith('chore') || msg.startsWith('build')) {
    return '#8E8E93'; // Gray for chores
  }
  
  return '#0A84FF'; // Default blue
}

/**
 * Get semantic commit badge info
 */
export function getCommitBadge(message: string): { text: string; color: string } | null {
  const msg = message.toLowerCase();
  
  if (msg.startsWith('feat')) return { text: 'FEAT', color: '#30D158' };
  if (msg.startsWith('fix')) return { text: 'FIX', color: '#FF453A' };
  if (msg.startsWith('docs')) return { text: 'DOCS', color: '#64D2FF' };
  if (msg.startsWith('style')) return { text: 'STYLE', color: '#FF9F0A' };
  if (msg.startsWith('refactor')) return { text: 'REFACTOR', color: '#BF5AF2' };
  if (msg.startsWith('test')) return { text: 'TEST', color: '#FFD60A' };
  if (msg.startsWith('chore')) return { text: 'CHORE', color: '#8E8E93' };
  if (msg.startsWith('build')) return { text: 'BUILD', color: '#8E8E93' };
  if (msg.startsWith('ci')) return { text: 'CI', color: '#8E8E93' };
  if (msg.startsWith('perf')) return { text: 'PERF', color: '#FF9500' };
  
  return null;
}

/**
 * Generate activity level color based on changes count
 */
export function getActivityColor(changesCount: number): string {
  if (changesCount < 5) return '#30D158';      // Low activity - green
  if (changesCount < 20) return '#FFD60A';     // Medium activity - yellow
  if (changesCount < 50) return '#FF9F0A';     // High activity - orange
  return '#FF453A';                            // Very high activity - red
}

/**
 * Map a date (YYYY-MM-DD or ISO) to a recency color.
 * Today/very recent -> green, older -> yellow/orange, stale -> gray.
 */
export function getRecencyColor(dateStr?: string): string {
  if (!dateStr) return '#8E8E93';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return '#8E8E93';

  const now = new Date();
  const days = Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 1) return '#30D158';      // today / yesterday
  if (days <= 7) return '#34C759';      // this week
  if (days <= 30) return '#FFD60A';     // this month
  if (days <= 90) return '#FF9F0A';     // this quarter
  return '#8E8E93';                     // older
}

/**
 * Pick a readable text color (dark or light) for a given hex background.
 * Returns '#111827' (slate-900) for light backgrounds, '#FFFFFF' for dark ones.
 */
export function getReadableTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  // Per WCAG relative luminance
  const lum = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const L = 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
  return L > 0.5 ? '#111827' : '#FFFFFF';
}