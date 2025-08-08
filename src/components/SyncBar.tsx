import { useState } from 'react';
import { ArrowClockwise, CloudArrowDown, CloudArrowUp } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { fetchRepo, pullRepo, pushRepo } from '@/utils/index';

interface SyncBarProps {
  repoPath: string;
  onStatusRefresh?: () => void;
}

export default function SyncBar({ repoPath, onStatusRefresh }: SyncBarProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [useRebase, setUseRebase] = useState(true);

  const run = async (label: string, fn: () => Promise<any>) => {
    if (busy) return;
    setBusy(label);
    try {
      await fn();
      onStatusRefresh?.();
    } catch (e) {
      console.error(e);
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
        <ArrowClockwise size={14} />
        Fetch
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={!!busy}
        onClick={() => run('pull', () => pullRepo(repoPath, useRebase))}
      >
        <CloudArrowDown size={14} />
        Pull{useRebase ? ' (rebase)' : ''}
      </Button>
      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
        disabled={!!busy}
        onClick={() => run('push', () => pushRepo(repoPath))}
      >
        <CloudArrowUp size={14} />
        Push
      </Button>
      <label className="ml-2 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={useRebase} onChange={(e) => setUseRebase(e.target.checked)} />
        Rebase on pull
      </label>
    </div>
  );
}
