import { ReactElement, useRef } from "react";
import {
  CaretLeftIcon,
  GitCommitIcon,
  QuestionIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useTheme } from '../contexts/ThemeContext'
import { useHelp } from '../contexts/HelpContext'
import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
  left?: ReactElement;
  right?: ReactElement;
}

export default function AppHeader({
  left,
  right,
}: HeaderProps) {
  const { toggleHelp } = useHelp();
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
    }
  }

  const getCurrentMode = () => {
    if (location.pathname.includes('/files')) return 'files'
    if (location.pathname.includes('/commit')) return 'commit'
    if (location.pathname.includes('/graph')) return 'graph'
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
            </h5>
          </div>
        </div>
      )}

      {/* Center Section - Search (only for file views) */}
      <div className="header-center">
        {isFileView && (
          <div className="search-section">
            <div className="search-container">
              <MagnifyingGlassIcon className="search-icon text-slate-500 dark:text-slate-400" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search commits..."
                className="search-input text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                        onClick={toggleHelp}
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
            {/* Temporarily hide Analytics/Conflicts to reduce clutter in MVP */}
          </div>
        )}
      </div>
    </header>
  );
}
