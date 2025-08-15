import { useState } from 'react';
import { ArrowClockwise, CloudArrowDown, CloudArrowUp } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { fetchRepo, pullRepo, pushRepo } from '@/utils/index';
import { toast } from 'sonner';

interface SyncBarProps {
  repoPath: string;
  onStatusRefresh?: () => void;
  hasUpstream?: boolean;
}

export default function SyncBar({ repoPath, onStatusRefresh, hasUpstream = true }: SyncBarProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [useRebase, setUseRebase] = useState(true);

  const run = async <T,>(label: string, fn: () => Promise<T>) => {
    if (busy) return;
    setBusy(label);
    try {
      toast(`${label}…`, { description: 'Working with remote', duration: 1500 });
      const result = await fn();
      onStatusRefresh?.();
      
      // Show detailed success message with Git output
      const description = result && typeof result === 'string' && result.trim() 
        ? result.trim().split('\n').slice(0, 3).join('\n') // Show first 3 lines
        : `${label} completed successfully`;
      
      toast.success(`${label} complete`, { description });
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(e);
      toast.error(`${label} failed`, { description: message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={!!busy}
        onClick={() => run('fetch', () => fetchRepo(repoPath))}
      >
        {busy === 'fetch' ? (
          <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Fetching…</span>
        ) : (
          <>
            <ArrowClockwise size={14} />
            Fetch
          </>
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={!!busy}
        onClick={() => run('pull', () => pullRepo(repoPath, useRebase))}
      >
        {busy === 'pull' ? (
          <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Pulling…</span>
        ) : (
          <>
            <CloudArrowDown size={14} />
            Pull{useRebase ? ' (rebase)' : ''}
          </>
        )}
      </Button>
      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
        disabled={!!busy || !hasUpstream}
        onClick={() => run('push', () => pushRepo(repoPath))}
        title={!hasUpstream ? 'No upstream branch configured' : undefined}
      >
        {busy === 'push' ? (
          <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Pushing…</span>
        ) : (
          <>
            <CloudArrowUp size={14} />
            Push
          </>
        )}
      </Button>
      <label className="ml-2 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={useRebase} onChange={(e) => setUseRebase(e.target.checked)} />
        Rebase on pull
      </label>
    </div>
  );
}
