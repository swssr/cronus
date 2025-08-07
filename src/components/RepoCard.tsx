import { FolderSimpleDottedIcon, XIcon } from "@phosphor-icons/react";
import {
  startTransition
} from 'react';
import { Badge } from "./ui/badge";

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
    <div key={repo.path} className="recent-repo-card font-mono flex">
      <button
        type="button"
        className="recent-repo-btn"
        onClick={() => repo.openRepository(repo.path)}
        title={`Open ${repo.path}`}
      >
        <div className="repo-icon">
          <FolderSimpleDottedIcon size={34} weight="duotone" className="text-green-300" />
        </div>
        <div className="repo-details">
          <div className="text-lg text-white font-mono">{repo.name}</div>
          <div className="text-xs text-gray-500">{repo.path}</div>
          <div className="repo-meta">
            {repo.fileCount && (
                <Badge
                  className="h-5 min-w-5 p-2 rounded-full px-1 font-mono tabular-nums bg-blue-100/40 text-gray-900"
                  variant="destructive"
                >
                  {repo.fileCount}
                  <span>files</span>
                </Badge>
            )}
            <span>•</span>
            <span>{new Date(repo.lastAccessed).toLocaleDateString()}</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        className="h-full w-[5em] grid place-content-center text-gray-500 hover:text-red-400 p-4 cursor-pointer"
        onClick={() => {
          startTransition(() => {
            repo.handleRemoveRecentRepo(repo.path);
          })
        }}
        title="Remove from recent repositories"
      >
        <XIcon size={18} />
      </button>
    </div>
  );
}
