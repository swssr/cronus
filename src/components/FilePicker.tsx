import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  FolderOpen, 
  Folder, 
  GitBranch, 
  CheckCircle, 
  Warning, 
  Spinner, 
  SpinnerBallIcon,
  FolderOpenIcon,
  SpinnerIcon,
  WarningIcon
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

  const showLoader = isLoading || isPicking;

  return (
    <div className="file-picker w-md h-max cursor-pointer" onClick={handlePickDirectory} onKeyUp={handlePickDirectory} onKeyDown={handlePickDirectory} role="button" tabIndex={0}>
      <div className="h-max flex flex-col items-center justify-center text-center">
        <div className="file-picker-icon m-0!">
          {showLoader ? (
            <SpinnerIcon size={64} className="animate-spin text-primary text-gray-500" weight="light" />
          ) : (
            <FolderOpenIcon size={64} className="text-gray-500" weight="light" />
          )}
        </div>
        
        <h5 className="text-lg font-bold text-gray-500">
          {showLoader ? 'Loading Repository...' : 'Select a Repository'}
        </h5>
        
        <p className="text-sm text-gray-500 font-light">
          {showLoader 
            ? 'Analyzing files history...' 
            : 'Choose a git repository to explore file history'
          }
        </p>

        {error && (
          <div className="file-picker-error">
            <WarningIcon className="w-5 h-5 text-destructive" weight="fill" />
            <span>{error}</span>
          </div>
        )}
        
      </div>
    </div>
  );
} 