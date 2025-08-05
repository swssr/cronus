
import { Moon, Sun } from '@phosphor-icons/react';
import { Button } from './ui/button';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

export function ThemeToggle({ isDark, onToggle, className }: ThemeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 ${className || ''}`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun size={20} className="text-yellow-500" />
      ) : (
        <Moon size={20} className="text-slate-600" />
      )}
    </Button>
  );
} 