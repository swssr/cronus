import { Badge } from "./ui/badge";
import { Folder, X } from "@phosphor-icons/react";

interface RepoCarProps {
  path: string;
  name: string;
  fileCount: number;
  lastAccessed: string;
  openRepository: (path: string) => void;
  handleRemoveRecentRepo: (path: string) => void;
}

export default function RepoCard(repo: RepoCarProps) {
  return (
    <div key={repo.path} className="recent-repo-card">
      <button
        type="button"
        className="recent-repo-btn"
        onClick={() => repo.openRepository(repo.path)}
        title={`Open ${repo.path}`}
      >
        <div className="repo-icon">
          <Folder className="w-5 h-5" weight="duotone" />
        </div>
        <div className="repo-details">
          <div className="repo-name">{repo.name}</div>
          <div className="repo-path">{repo.path}</div>
          <div className="repo-meta">
            {repo.fileCount && (
              <>
                <Badge
                  className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                  variant="outline"
                >
                  {repo.fileCount}
                </Badge>
                <span>files</span>
              </>
            )}
            <span>•</span>
            <span>{new Date(repo.lastAccessed).toLocaleDateString()}</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        className="remove-repo-btn"
        onClick={() => repo.handleRemoveRecentRepo(repo.path)}
        title="Remove from recent repositories"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
