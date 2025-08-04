import { useRef } from 'react';

type ViewMode = 'carousel' | 'timeline' | 'immersive';

interface HeaderProps {
  title?: string;
  subtext?: string;
  directory: string;
  setDirectory: (path?: string | null) => void;
  // File history specific props
  fileName?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  cardsToShow?: 1 | 3 | 5;
  onCardsToShowChange?: (count: 1 | 3 | 5) => void;
  commits?: any[];
  filteredCommits?: any[];
}

export default function AppHeader({
  title = "Cronus",
  subtext = "git time machine",
  directory,
  setDirectory,
  fileName,
  searchQuery = "",
  onSearchChange,
  viewMode = 'carousel',
  onViewModeChange,
  cardsToShow = 3,
  onCardsToShowChange,
  commits = [],
  filteredCommits = [],
}: HeaderProps) {
  const repoName = directory ? directory.split('/').pop() || 'Repository' : '';
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isFileHistoryView = !!fileName;
  
  return (
    <header className="app-header">
      <div className="control-container">
        {directory && (
          <button
            type="button"
            className="back-btn"
            onClick={() => setDirectory(null)}
            title="Back to repository selection"
          >
            ← Back
          </button>
        )}
      </div>
      
      <div className="header-content">
        <h1>
          {isFileHistoryView 
            ? `📄 ${fileName}` 
            : directory 
            ? `📁 ${repoName}` 
            : `⏰ ${title}`
          }
        </h1>
        <p>
          {isFileHistoryView 
            ? `${searchQuery 
                ? `${filteredCommits.length} of ${commits.length} commits` 
                : `${commits.length} commits`
              } • ${viewMode === 'carousel' ? 'Carousel' : viewMode === 'timeline' ? 'Timeline' : 'Immersive'} view`
            : directory 
            ? `Exploring git history • ${directory}` 
            : subtext
          }
        </p>
      </div>
      
      <div className="control-container">
        {isFileHistoryView && (
          <div className="header-controls">
            {/* Search Input */}
            <div className="search-container">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search commits..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="clear-search" 
                  onClick={() => onSearchChange?.("")}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Toggle */}
            <div className="view-toggle">
              <button 
                className={`view-mode-btn ${viewMode === 'carousel' ? 'active' : ''}`}
                onClick={() => onViewModeChange?.('carousel')}
                title="Carousel view"
              >
                🎠
              </button>
              <button 
                className={`view-mode-btn ${viewMode === 'timeline' ? 'active' : ''}`}
                onClick={() => onViewModeChange?.('timeline')}
                title="Timeline view"
              >
                📈
              </button>
              <button 
                className={`view-mode-btn ${viewMode === 'immersive' ? 'active' : ''}`}
                onClick={() => onViewModeChange?.('immersive')}
                title="Immersive timeline view"
              >
                🌊
              </button>
            </div>
            
            {/* Cards Selector for Carousel */}
            {viewMode === 'carousel' && (
              <div className="view-selector">
                {[1, 3, 5].map((count) => (
                  <button
                    key={count}
                    className={cardsToShow === count ? 'active' : ''}
                    onClick={() => onCardsToShowChange?.(count as 1 | 3 | 5)}
                    title={`${count} card view (${count})`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
