import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  FolderOpen, 
  Folder, 
  GitBranch, 
  CheckCircle, 
  Warning, 
  Spinner 
} from '@phosphor-icons/react';

interface FilePickerProps {
  onDirectorySelected: (path: string) => Promise<void>;
  isLoading?: boolean;
}

export function FilePicker({ onDirectorySelected, isLoading = false }: FilePickerProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickDirectory = async () => {
    setIsPicking(true);
    setError(null);
    
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select a Git Repository Directory",
      });

      if (typeof selected === "string") {
        await onDirectorySelected(selected);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open directory');
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <div className="file-picker">
      <div className="file-picker-content">
        <div className="file-picker-icon">
          {isLoading ? (
            <Spinner className="w-16 h-16 animate-spin text-primary" weight="bold" />
          ) : (
            <FolderOpen className="w-16 h-16 text-primary" weight="duotone" />
          )}
        </div>
        
        <h2 className="file-picker-title">
          {isLoading ? 'Loading Repository...' : 'Select a Repository'}
        </h2>
        
        <p className="file-picker-description">
          {isLoading 
            ? 'Analyzing files and git history...' 
            : 'Choose a git repository to explore file history'
          }
        </p>

        {error && (
          <div className="file-picker-error">
            <Warning className="w-5 h-5 text-destructive" weight="fill" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && (
          <button
            type="button"
            className="file-picker-button"
            onClick={handlePickDirectory}
            disabled={isPicking}
          >
            {isPicking ? (
              <>
                <Spinner className="w-5 h-5 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <Folder className="w-5 h-5" weight="duotone" />
                Browse Repository
              </>
            )}
          </button>
        )}

        <div className="file-picker-features">
          <div className="feature-item">
            <GitBranch className="w-5 h-5 text-muted-foreground" weight="duotone" />
            <span>Git history tracking</span>
          </div>
          <div className="feature-item">
            <CheckCircle className="w-5 h-5 text-muted-foreground" weight="duotone" />
            <span>File change visualization</span>
          </div>
        </div>
      </div>
    </div>
  );
} 