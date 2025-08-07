import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RepositoryAnalytics } from '@/types';
import { getTimeAgo } from '@/utils/index';
import { 
  ChartLine, 
  Users, 
  FileText, 
  GitBranch, 
  Warning,
  TrendUp
} from '@phosphor-icons/react';

interface RepositoryAnalyticsProps {
  analytics: RepositoryAnalytics;
  className?: string;
}

export function RepositoryAnalyticsComponent({ 
  analytics, 
  className = "" 
}: RepositoryAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'authors' | 'files' | 'branches' | 'debt'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartLine },
    { id: 'authors', label: 'Authors', icon: Users },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'branches', label: 'Branches', icon: GitBranch },
    { id: 'debt', label: 'Technical Debt', icon: Warning },
  ] as const;

  const totalCommits = useMemo(() => 
    analytics.topAuthors.reduce((sum, author) => sum + author.commits, 0), 
    [analytics.topAuthors]
  );



  return (
    <div className={`repository-analytics ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Repository Analytics
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Insights about your repository's activity and health
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <motion.div
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                         <ChartLine size={20} className="text-white" />
                       </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {totalCommits}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          Total Commits
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                         <TrendUp size={20} className="text-white" />
                       </div>
                      <div>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {analytics.commitFrequency.daily}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Commits Today
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                        <Users size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                          {analytics.topAuthors.length}
                        </p>
                        <p className="text-sm text-purple-600 dark:text-purple-400">
                          Active Authors
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                          {analytics.fileChangePatterns.length}
                        </p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                          Active Files
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Activity Chart */}
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
                    Commit Activity
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Daily</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(analytics.commitFrequency.daily / Math.max(totalCommits, 1)) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {analytics.commitFrequency.daily}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Weekly</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-green-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(analytics.commitFrequency.weekly / Math.max(totalCommits, 1)) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {analytics.commitFrequency.weekly}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Monthly</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-purple-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(analytics.commitFrequency.monthly / Math.max(totalCommits, 1)) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.7 }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {analytics.commitFrequency.monthly}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'authors' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
                  Top Contributors
                </h4>
                {analytics.topAuthors.map((author, index) => (
                  <motion.div
                    key={author.name}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {author.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {author.name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {author.commits} commits
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        +{author.additions} / -{author.deletions}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {((author.commits / totalCommits) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
                  Most Changed Files
                </h4>
                {analytics.fileChangePatterns.slice(0, 10).map((file, index) => (
                  <motion.div
                    key={file.file}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                        <FileText size={16} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {file.file}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {file.changes} changes • {getTimeAgo(file.lastModified)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {file.churn.toFixed(0)} lines
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {file.churn > 100 ? 'High churn' : file.churn > 50 ? 'Medium churn' : 'Low churn'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === 'branches' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
                  Branch Activity
                </h4>
                {analytics.branchActivity.map((branch, index) => (
                  <motion.div
                    key={branch.name}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <GitBranch size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {branch.name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {branch.commits} commits
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {getTimeAgo(branch.lastCommit)}
                      </p>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          branch.isActive ? 'bg-green-500' : 'bg-slate-400'
                        }`} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === 'debt' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
                  Technical Debt
                </h4>
                {analytics.technicalDebt.length > 0 ? (
                  analytics.technicalDebt.map((debt, index) => (
                    <motion.div
                      key={debt.file}
                      className={`p-4 rounded-lg border ${
                        debt.severity === 'high'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                          : debt.severity === 'medium'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          debt.severity === 'high'
                            ? 'bg-red-500'
                            : debt.severity === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}>
                          <Warning size={16} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                            {debt.file}
                          </p>
                                                     <div className="space-y-1">
                             {debt.issues.map((issue, i) => (
                               <p key={`${debt.file}-issue-${i}`} className="text-sm text-slate-600 dark:text-slate-400">
                                 • {issue}
                               </p>
                             ))}
                           </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            debt.severity === 'high'
                              ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300'
                              : debt.severity === 'medium'
                              ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300'
                              : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                          }`}>
                            {debt.severity}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                                         <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                       <TrendUp size={24} className="text-green-600 dark:text-green-400" />
                     </div>
                    <h5 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                      No Technical Debt Found
                    </h5>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Your repository is in good health!
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
} 