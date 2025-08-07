import { ReactElement, useRef } from "react";
import {
  MagnifyingGlass,
  X,
  GitCommit,
  Question,
  CaretLeft,
  CaretLeftIcon,
  GitCommitIcon,
  QuestionIcon,
  CardsThreeIcon,
  StackIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
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
    mode: "file" | "branch" | "commit" | "graph" | "analytics" | "conflicts"
  ) => void;
  // Help props
  onHelpClick?: () => void;

  left?: ReactElement;
  right?: ReactElement;
}

export default function AppHeader({
  title = "Cronus",
  directory,
  fileName,
  searchQuery = "",
  onSearchChange,
  viewMode = "carousel",
  onViewModeChange,
  cardsToShow = 3,
  onCardsToShowChange,
  currentMode = "file",
  onModeChange,
  onHelpClick,
  left,
  right,
}: HeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isFileHistoryView = !!fileName;

  return (
    <header className="app-header-clean flex items-center" data-tuari-drag-region>
      {/* Left Section */}
      {left}

      {/* Center Section - Title and Search */}
      <div className="header-center">
        

        {/* Always visible search when viewing file history */}
        {isFileHistoryView && (
          <div className="search-section">
            <div className="search-container">
              <MagnifyingGlassIcon className="search-icon" size={16} />
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
        {right}
        {/* Help Button */}
        <button
          type="button"
          onClick={onHelpClick}
          className="help-button"
          title="Help (?)"
        >
          <QuestionIcon size={16} />
        </button>

        {directory && !isFileHistoryView && (
          <div className="mode-navigation">
            <button
              type="button"
              className={`mode-button ${
                currentMode === "file" ? "active" : ""
              }`}
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
              className={`mode-button ${
                currentMode === "commit" ? "active" : ""
              }`}
              onClick={() => onModeChange?.("commit")}
              title="Smart commit assistant"
            >
              <GitCommitIcon size={16} />
              Commit
            </button>
          </div>
        )}

        {viewMode === "carousel" && (
          <div className="cards-selector mr-2">
            {[1, 3, 5].map((count) => (
              <button
                key={count}
                type="button"
                className={`cards-count-button ${
                  cardsToShow === count ? "active" : ""
                }`}
                onClick={() => onCardsToShowChange?.(count as 1 | 3 | 5)}
                title={`Show ${count} card(s)`}
              >
                {count}
              </button>
            ))}
          </div>
        )}

        {isFileHistoryView && (
          <div className="view-controls">
            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-button ${
                  viewMode === "carousel" ? "active" : ""
                }`}
                onClick={() => onViewModeChange?.("carousel")}
                title="Carousel view"
              >
                <CardsThreeIcon />
                Cards
              </button>
              <button
                type="button"
                className={`view-mode-button ${
                  viewMode === "immersive" ? "active" : ""
                }`}
                onClick={() => onViewModeChange?.("immersive")}
                title="Immersive timeline view"
              >
                <StackIcon weight="duotone" />
                Timeline
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
