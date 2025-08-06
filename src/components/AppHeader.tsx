import { useRef } from "react";
import { MagnifyingGlass, X, GitCommit, Question, CaretLeft, CaretLeftIcon } from "@phosphor-icons/react";
import type { Commit } from "../types";

type ViewMode = "carousel" | "immersive";

interface HeaderProps {
  title?: string;
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
  commits?: Commit[];
  filteredCommits?: Commit[];
  // Commit mode props
  currentMode?:
    | "file"
    | "branch"
    | "commit"
    | "graph"
    | "analytics"
    | "conflicts";
  onModeChange?: (
    mode: "file" | "branch" | "commit" | "graph" | "analytics" | "conflicts",
  ) => void;
  // Help props
  onHelpClick?: () => void;
}

export default function AppHeader({
  title = "Cronus",
  directory,
  setDirectory,
  fileName,
  searchQuery = "",
  onSearchChange,
  viewMode = "carousel",
  onViewModeChange,
  cardsToShow = 3,
  onCardsToShowChange,
  commits = [],
  filteredCommits = [],
  currentMode = "file",
  onModeChange,
  onHelpClick,
}: HeaderProps) {
  const repoName = directory ? directory.split("/").pop() || "Repository" : "";
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isFileHistoryView = !!fileName;

  return (
    <header className="app-header-clean" data-tuari-drag-region>
      {/* Left Section */}
      <div className="header-left">
        {directory && (
          <button
            type="button"
            className="back-button"
            onClick={() => setDirectory(null)}
            title="Back to repository selection"
          >
           <CaretLeftIcon size={18} />
            Back
          </button>
        )}
      </div>

      {/* Center Section - Title and Search */}
      <div className="header-center" >
        <div className="header-title-section">
          <h1 className="header-title">
            {isFileHistoryView ? fileName : directory ? repoName : title}
          </h1>
          {isFileHistoryView && (
            <div className="commit-count">
              {searchQuery
                ? `${filteredCommits.length} of ${commits.length}`
                : `${commits.length} commits`}
            </div>
          )}
        </div>

        {/* Always visible search when viewing file history */}
        {isFileHistoryView && (
          <div className="search-section">
            <div className="search-container">
              <MagnifyingGlass className="search-icon" size={16} />
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
                  type="button"
                  className="clear-search-button"
                  onClick={() => onSearchChange?.("")}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Section - View Controls */}
      <div className="header-right">
        {/* Help Button */}
        <button
          type="button"
          onClick={onHelpClick}
          className="help-button"
          title="Help (?)"
        >
          <Question size={16} />
        </button>

        {/* Mode Navigation (when in repository) */}
        {directory && !isFileHistoryView && (
          <div className="mode-navigation">
            <button
              type="button"
              className={`mode-button ${currentMode === "file" ? "active" : ""}`}
              onClick={() => onModeChange?.("file")}
              title="File explorer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm2-1a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V4a1 1 0 00-1-1H4z" />
              </svg>
              Files
            </button>
            <button
              type="button"
              className={`mode-button ${currentMode === "commit" ? "active" : ""}`}
              onClick={() => onModeChange?.("commit")}
              title="Smart commit assistant"
            >
              <GitCommit size={16} />
              Commit
            </button>
          </div>
        )}

        {isFileHistoryView && (
          <div className="view-controls">
            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-button ${viewMode === "carousel" ? "active" : ""}`}
                onClick={() => onViewModeChange?.("carousel")}
                title="Carousel view"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm2-1a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V4a1 1 0 00-1-1H4z" />
                  <path d="M5 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H6a1 1 0 01-1-1V6z" />
                </svg>
                Cards
              </button>
              <button
                type="button"
                className={`view-mode-button ${viewMode === "immersive" ? "active" : ""}`}
                onClick={() => onViewModeChange?.("immersive")}
                title="Immersive timeline view"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M1.5 2.5A1.5 1.5 0 013 1h10a1.5 1.5 0 011.5 1.5v11A1.5 1.5 0 0113 15H3a1.5 1.5 0 01-1.5-1.5v-11z" />
                </svg>
                Timeline
              </button>
            </div>

            {/* Cards Count Selector (only for carousel) */}
            {viewMode === "carousel" && (
              <div className="cards-selector">
                {[1, 3, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`cards-count-button ${cardsToShow === count ? "active" : ""}`}
                    onClick={() => onCardsToShowChange?.(count as 1 | 3 | 5)}
                    title={`Show ${count} card${count > 1 ? "s" : ""}`}
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
