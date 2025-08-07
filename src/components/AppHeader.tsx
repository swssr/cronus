import { ReactElement, useRef } from "react";
import {
  CaretLeftIcon,
  GitCommitIcon,
  QuestionIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useTheme } from '../contexts/ThemeContext'
import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
  onHelpClick?: () => void;
  left?: ReactElement;
  right?: ReactElement;
}

export default function AppHeader({
  onHelpClick,
  left,
  right,
}: HeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate()
  const location = useLocation()
  const { isDark, setTheme } = useTheme()

  // Extract route information
  const isRepoRoute = location.pathname.startsWith('/repo/')
  const isFileView = location.pathname.includes('/file/')
  
  // Extract repo path and file name from URL
  const pathParts = location.pathname.split('/')
  const repoPath = isRepoRoute ? pathParts[2] : null
  const fileName = isFileView ? pathParts[4] : null

  const handleBackClick = () => {
    if (isFileView) {
      // Go back to files view
      navigate({ to: `/repo/${repoPath}/files` })
    } else if (isRepoRoute) {
      // Go back to home
      navigate({ to: '/' })
    }
  }

  const handleModeChange = (mode: string) => {
    if (!repoPath) return
    
    switch (mode) {
      case 'files':
        navigate({ to: `/repo/${repoPath}/files` })
        break
      case 'commit':
        navigate({ to: `/repo/${repoPath}/commit` })
        break
      case 'graph':
        navigate({ to: `/repo/${repoPath}/graph` })
        break
      case 'analytics':
        navigate({ to: `/repo/${repoPath}/analytics` })
        break
      case 'conflicts':
        navigate({ to: `/repo/${repoPath}/conflicts` })
        break
    }
  }

  const getCurrentMode = () => {
    if (location.pathname.includes('/files')) return 'files'
    if (location.pathname.includes('/commit')) return 'commit'
    if (location.pathname.includes('/graph')) return 'graph'
    if (location.pathname.includes('/analytics')) return 'analytics'
    if (location.pathname.includes('/conflicts')) return 'conflicts'
    return 'files'
  }

  return (
    <header className="app-header-clean flex items-center" data-tauri-drag-region>
      {/* Left Section */}
      {left || (
        <div className="header-left">
          {isRepoRoute && (
            <button
              type="button"
              className="back-button mr-2"
              onClick={handleBackClick}
              title="Back"
            >
              <CaretLeftIcon size={18} />
            </button>
          )}

          <div className="header-title-section">
            <h5 className="header-title">
              {fileName || "Cronus"}
              <span className="text-xs text-gray-500 ml-2">v0.1.0</span>
            </h5>
          </div>
        </div>
      )}

      {/* Center Section - Search (only for file views) */}
      <div className="header-center">
        {isFileView && (
          <div className="search-section">
            <div className="search-container">
              <MagnifyingGlassIcon className="search-icon" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search commits..."
                className="search-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Right Section - Controls */}
      <div className="header-right">
        {right || (
          <>
            <ThemeToggle
              isDark={isDark}
              onToggle={() => setTheme(isDark ? "light" : "dark")}
            />
          </>
        )}

        {/* Help Button */}
        <button
          type="button"
          onClick={onHelpClick}
          className="help-button"
          title="Help (?)"
        >
          <QuestionIcon size={16} />
        </button>

        {/* Mode Navigation */}
        {isRepoRoute && !isFileView && (
          <div className="mode-navigation">
            <button
              type="button"
              className={`mode-button ${
                getCurrentMode() === "files" ? "active" : ""
              }`}
              onClick={() => handleModeChange("files")}
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
                getCurrentMode() === "commit" ? "active" : ""
              }`}
              onClick={() => handleModeChange("commit")}
              title="Smart commit assistant"
            >
              <GitCommitIcon size={16} />
              Commit
            </button>
            <button
              type="button"
              className={`mode-button ${
                getCurrentMode() === "graph" ? "active" : ""
              }`}
              onClick={() => handleModeChange("graph")}
              title="Git graph visualization"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M1 1v14h14V1H1zm1 1h12v12H2V2z"/>
                <path d="M4 4h2v2H4V4zm3 0h2v2H7V4zm3 0h2v2h-2V4zM4 7h2v2H4V7zm3 0h2v2H7V7zm3 0h2v2h-2V7z"/>
              </svg>
              Graph
            </button>
            <button
              type="button"
              className={`mode-button ${
                getCurrentMode() === "analytics" ? "active" : ""
              }`}
              onClick={() => handleModeChange("analytics")}
              title="Repository analytics"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M2 2v12h12V2H2zm1 1h10v10H3V3z"/>
                <path d="M4 8h2v4H4V8zm3-2h2v6H7V6zm3 1h2v5h-2V7z"/>
              </svg>
              Analytics
            </button>
            <button
              type="button"
              className={`mode-button ${
                getCurrentMode() === "conflicts" ? "active" : ""
              }`}
              onClick={() => handleModeChange("conflicts")}
              title="Conflict resolution"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM0 8a8 8 0 1116 0A8 8 0 010 8z"/>
                <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
              </svg>
              Conflicts
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
