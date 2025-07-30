import RepoCard from "./RepoCard";

interface RecentRepoProps {
  recentRepos: any[];
  handleRemoveRecentRepo: (path: string) => void;
  openRepository: (path: string) => void;
  handleClearRecentRepos: () => void;
}

export default function RecentRepoCard({
  handleClearRecentRepos,
  recentRepos,
  openRepository,
  handleRemoveRecentRepo,
}: RecentRepoProps) {
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
            openRepository={openRepository}
            handleRemoveRecentRepo={handleRemoveRecentRepo}
          />
        ))}
      </div>
    </div>
  );
}
