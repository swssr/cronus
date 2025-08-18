import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Question, 
  GitCommit, 
  FileText, 
  Clock, 
  GitBranch, 
  Sparkle,
  Lightbulb,
  ArrowRight,
  CheckCircle,
  Info
} from '@phosphor-icons/react';
import { Button } from './ui/button';
import { useHelp } from '../contexts/HelpContext';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  tips: string[];
  examples?: string[];
}

export default function HelpOverlay() {
  const { showHelp: isOpen, setShowHelp } = useHelp();
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  
  const onClose = () => setShowHelp(false);

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Question size={24} />,
      description: 'Learn the basics of using Cronus for git management',
      tips: [
        'Open a git repository to see your project files',
        'Use the search to quickly find files or commits',
        'Switch between Files and Commit modes using the header buttons',
        'Click on files to see their history and changes'
      ]
    },
    {
      id: 'smart-commit',
      title: 'Smart Commit Assistant',
      icon: <Sparkle size={24} />,
      description: 'Create meaningful commits with intelligent suggestions',
      tips: [
        'Stage files by clicking the "Stage" button next to them',
        'Write clear commit messages that explain what changed',
        'Use conventional commits like "feat:", "fix:", "docs:"',
        'Review staged changes before committing',
        'Get automatic commit message suggestions based on your changes'
      ],
      examples: [
        'feat: add user authentication system',
        'fix: resolve login button not working',
        'docs: update README with installation steps',
        'chore: update dependencies'
      ]
    },
    {
      id: 'file-status',
      title: 'File Status Indicators',
      icon: <FileText size={24} />,
      description: 'Understand what each file status means',
      tips: [
        '🟢 Staged: Files ready to be committed',
        '🟡 Modified: Files with changes not yet staged',
        '🔵 Untracked: New files not yet added to git',
        '🔴 Deleted: Files removed from the project',
        'Click "Stage" to prepare files for commit',
        'Click "Unstage" to remove files from commit'
      ]
    },
    {
      id: 'commit-history',
      title: 'Commit History',
      icon: <Clock size={24} />,
      description: 'Explore your project\'s timeline and changes',
      tips: [
        'View commits in timeline or carousel mode',
        'Click on commits to see detailed changes',
        'Search commits by message, author, or hash',
        'See file changes, additions, and deletions',
        'Use keyboard navigation (arrow keys) to browse'
      ]
    },
    {
      id: 'branch-management',
      title: 'Branch Management',
      icon: <GitBranch size={24} />,
      description: 'Work with different versions of your code',
      tips: [
        'Create virtual branches from any commit',
        'Switch between branches to see different code states',
        'Compare changes between branches',
        'Merge changes from one branch to another',
        'Keep your main branch clean and stable'
      ]
    },
    {
      id: 'git-concepts',
      title: 'Git Concepts Explained',
      icon: <GitCommit size={24} />,
      description: 'Learn the fundamental git concepts',
      tips: [
        'Repository: Your project\'s complete history',
        'Commit: A snapshot of your code at a point in time',
        'Branch: A separate line of development',
        'Stage: Prepare files for the next commit',
        'Push/Pull: Share changes with others',
        'Merge: Combine changes from different branches'
      ]
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      icon: <Lightbulb size={24} />,
      description: 'Speed up your workflow with keyboard shortcuts',
      tips: [
        '? - Open this help overlay',
        'Escape - Close dialogs and overlays',
        'Arrow keys - Navigate through commits and files',
        'Enter - Select highlighted item',
        'Ctrl/Cmd + F - Search in current view',
        'Ctrl/Cmd + K - Quick file search'
      ]
    }
  ];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Question size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Cronus Help Center
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Learn how to use Cronus effectively
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X size={20} />
              </Button>
            </div>

            <div className="flex h-[calc(90vh-120px)]">
              {/* Sidebar Navigation */}
              <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Topics
                  </h3>
                  <nav className="space-y-1">
                    {helpSections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeSection === section.id
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {section.icon}
                        <span className="text-sm font-medium">{section.title}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto">
                {helpSections.map((section) => (
                  <AnimatePresence key={section.id}>
                    {activeSection === section.id && (
                      <motion.div
                        className="p-6"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          {section.icon}
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {section.title}
                          </h3>
                        </div>
                        
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                          {section.description}
                        </p>

                        <div className="space-y-6">
                          {/* Tips */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                              <Lightbulb size={16} />
                              Pro Tips
                            </h4>
                            <ul className="space-y-2">
                              {section.tips.map((tip, index) => (
                                <motion.li
                                  key={`tip-${section.id}-${index}`}
                                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                >
                                  <ArrowRight size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                  <span>{tip}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </div>

                          {/* Examples */}
                          {section.examples && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <CheckCircle size={16} />
                                Examples
                              </h4>
                              <div className="space-y-2">
                                {section.examples.map((example, index) => (
                                  <motion.div
                                    key={`example-${section.id}-${index}`}
                                    className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 text-sm font-mono text-slate-800 dark:text-slate-200"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                  >
                                    {example}
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Info size={14} />
                  <span>Press Escape to close</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Need more help?</span>
                  <Button size="sm" variant="outline">
                    Documentation
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 