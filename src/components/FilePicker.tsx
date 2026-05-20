import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useNavigate } from "@tanstack/react-router";
import {
  FolderOpenIcon,
  SpinnerIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { addRecentRepository } from "../utils/index";

interface FilePickerProps {
  isLoading?: boolean;
}

export function FilePicker({ isLoading = false }: FilePickerProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
        // Add to recent repositories
        addRecentRepository(selected, 0);

        // Navigate to the repository files view
        navigate({
          to: `/repo/${encodeURIComponent(selected)}/files`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open directory");
    } finally {
      setIsPicking(false);
    }
  };

  const showLoader = isLoading || isPicking;

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <button
          type="button"
          className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handlePickDirectory}
          disabled={showLoader}
        >
          {showLoader ? (
            <SpinnerIcon
              size={32}
              className="animate-spin text-slate-500"
              weight="light"
            />
          ) : (
            <FolderOpenIcon
              size={32}
              className="text-slate-500"
              weight="light"
            />
          )}
        </button>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {showLoader ? "Loading Repository..." : "Select a Repository"}
        </h3>

        <p className="text-slate-600 dark:text-slate-400 mb-4">
          {showLoader
            ? "Analyzing files and commit history..."
            : "Choose a git repository to explore file history"}
        </p>

        {error && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            <WarningIcon className="w-4 h-4" weight="fill" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

