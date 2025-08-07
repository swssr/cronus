import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import RepoCard from "./RepoCard";
import { RecentRepository } from '../types';
import { 
  getRecentRepositories, 
  removeRecentRepository, 
  clearRecentRepositories 
} from '../utils/index';

export default function RecentRepoCard() {
  const [recentRepos, setRecentRepos] = useState<RecentRepository[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setRecentRepos(getRecentRepositories());
  }, []);

  const handleRemoveRecentRepo = (path: string) => {
    removeRecentRepository(path);
    setRecentRepos(getRecentRepositories());
  };

  const handleClearRecentRepos = () => {
    clearRecentRepositories();
    setRecentRepos([]);
  };

  const openRepository = (path: string) => {
    navigate({ to: `/repo/${encodeURIComponent(path)}/files` });
  };

  if (recentRepos.length === 0) {
    return null;
  }

  return (
    <div className="recent-repositories">
      <div className="recent-header">
        <h3>Recent Repositories</h3>
        <button
          type="button"
          className="clear-recents-btn"
          onClick={handleClearRecentRepos}
          title="Clear all recent repositories"
        >
          Clear All
        </button>
      </div>

      <div className="recent-repos-list">
        {recentRepos.map((repo) => (
          <RepoCard
            key={repo.path}
            {...repo}
            fileCount={repo.fileCount || 0}
            openRepository={openRepository}
            handleRemoveRecentRepo={handleRemoveRecentRepo}
          />
        ))}
      </div>
    </div>
  );
}
