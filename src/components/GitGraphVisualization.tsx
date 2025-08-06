import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitGraph, GitGraphNode } from '../types';
import { getCommitType, getCommitColor, getTimeAgo, truncateText } from '../utils/index';
import { 
  GitCommit, 
  Tag, 
  Eye, 
  Copy, 
  GitBranch as BranchIcon,
  ArrowsClockwise,
  Trash
} from '@phosphor-icons/react';

interface GitGraphVisualizationProps {
  graph: GitGraph;
  onNodeClick?: (node: GitGraphNode) => void;
  onNodeSelect?: (node: GitGraphNode) => void;
  selectedNodes?: Set<string>;
  className?: string;
}

export function GitGraphVisualization({ 
  graph, 
  onNodeClick, 
  onNodeSelect, 
  selectedNodes = new Set(),
  className = "" 
}: GitGraphVisualizationProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list' | 'timeline'>('graph');
  const [showDetails, setShowDetails] = useState(false);

  const maxX = useMemo(() => Math.max(...graph.nodes.map(n => n.x)), [graph.nodes]);

  const nodeSize = 12;
  const levelSpacing = 120;

  const getNodePosition = useCallback((node: GitGraphNode) => {
    const x = (node.x / Math.max(maxX, 1)) * (window.innerWidth * 0.8);
    const y = node.y * levelSpacing;
    return { x, y };
  }, [maxX]);

  const handleNodeClick = useCallback((node: GitGraphNode) => {
    onNodeClick?.(node);
  }, [onNodeClick]);

  const handleNodeSelect = useCallback((node: GitGraphNode, event: React.MouseEvent) => {
    event.stopPropagation();
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  const getNodeColor = useCallback((node: GitGraphNode) => {
    const commitType = getCommitType(node.message);
    return getCommitColor(commitType);
  }, []);

  const isNodeSelected = useCallback((node: GitGraphNode) => {
    return selectedNodes.has(node.hash);
  }, [selectedNodes]);

  return (
    <div className={`git-graph-visualization ${className}`}>
      {/* Header Controls */}
      <div className="graph-controls mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Git Graph
          </h3>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {graph.nodes.length} commits
          </div>
          {selectedNodes.size > 0 && (
            <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded-full">
              {selectedNodes.size} selected
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="view-mode-toggle flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            {(['graph', 'list', 'timeline'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="graph-container relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {viewMode === 'graph' && (
          <div className="graph-view relative" style={{ height: `${Math.max(graph.nodes.length * 40, 400)}px` }}>
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {graph.edges.map((edge, index) => {
                const fromNode = graph.nodes.find(n => n.hash === edge.from);
                const toNode = graph.nodes.find(n => n.hash === edge.to);
                
                if (!fromNode || !toNode) return null;

                const fromPos = getNodePosition(fromNode);
                const toPos = getNodePosition(toNode);

                return (
                  <motion.line
                    key={`${edge.from}-${edge.to}`}
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke={edge.edge_type === 'merge' ? '#8b5cf6' : '#3b82f6'}
                    strokeWidth={edge.edge_type === 'merge' ? 3 : 2}
                    strokeDasharray={edge.edge_type === 'rebase' ? '5,5' : 'none'}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                );
              })}
            </svg>

            {/* Commit Nodes */}
            {graph.nodes.map((node, index) => {
              const position = getNodePosition(node);
              const nodeColor = getNodeColor(node);
              const isSelected = isNodeSelected(node);
              const isHovered = hoveredNode === node.hash;

              return (
                <motion.div
                  key={node.hash}
                  className="absolute cursor-pointer"
                  style={{
                    left: position.x - nodeSize / 2,
                    top: position.y - nodeSize / 2,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHoveredNode(node.hash)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Node */}
                  <motion.div
                    className={`relative rounded-full border-2 transition-all duration-200 ${
                      isSelected 
                        ? 'border-blue-500 shadow-lg shadow-blue-500/50' 
                        : 'border-white dark:border-slate-700'
                    }`}
                    style={{
                      width: nodeSize,
                      height: nodeSize,
                      backgroundColor: nodeColor,
                    }}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <GitCommit size={8} className="text-white" />
                  </motion.div>

                  {/* Branch Labels */}
                  {node.branches.length > 0 && (
                    <motion.div
                      className="absolute -top-6 left-1/2 transform -translate-x-1/2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 + 0.2 }}
                    >
                      <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                        <BranchIcon size={10} />
                        {node.branches[0]}
                        {node.branches.length > 1 && ` +${node.branches.length - 1}`}
                      </div>
                    </motion.div>
                  )}

                  {/* Tag Labels */}
                  {node.tags.length > 0 && (
                    <motion.div
                      className="absolute -bottom-6 left-1/2 transform -translate-x-1/2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 + 0.3 }}
                    >
                      <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">
                        <Tag size={10} />
                        {node.tags[0]}
                        {node.tags.length > 1 && ` +${node.tags.length - 1}`}
                      </div>
                    </motion.div>
                  )}

                  {/* Node Details Tooltip */}
                  <AnimatePresence>
                    {isHovered && showDetails && (
                      <motion.div
                        className="absolute z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 min-w-80"
                        style={{
                          left: position.x + 20,
                          top: position.y - 40,
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: nodeColor }}
                              />
                              <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                                {node.hash.slice(0, 7)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(node.hash);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                title="Copy hash"
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNodeSelect(node, e);
                                }}
                                className={`p-1 rounded ${
                                  isSelected
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                                title="Select commit"
                              >
                                <GitCommit size={12} />
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                              {truncateText(node.message, 60)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              by {node.author} • {getTimeAgo(node.date)}
                            </p>
                          </div>

                          {node.branches.length > 0 && (
                            <div className="flex items-center gap-1">
                              <BranchIcon size={12} className="text-blue-500" />
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {node.branches.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="list-view p-4">
            <div className="space-y-2">
              {graph.nodes.map((node, index) => {
                const nodeColor = getCommitColor(getCommitType(node.message));
                const isSelected = isNodeSelected(node);

                return (
                  <motion.div
                    key={node.hash}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNodeClick(node)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: nodeColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {node.message}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {node.author} • {getTimeAgo(node.date)} • {node.hash.slice(0, 7)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {node.branches.length > 0 && (
                          <BranchIcon size={14} className="text-blue-500" />
                        )}
                        {node.tags.length > 0 && (
                          <Tag size={14} className="text-green-500" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNodeSelect(node, e);
                          }}
                          className={`p-1 rounded ${
                            isSelected
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                          }`}
                        >
                          <GitCommit size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="timeline-view p-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
              
              <div className="space-y-4">
                {graph.nodes.map((node, index) => {
                  const nodeColor = getCommitColor(getCommitType(node.message));
                  const isSelected = isNodeSelected(node);

                  return (
                    <motion.div
                      key={node.hash}
                      className="relative flex items-start gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10">
                        <div 
                          className={`w-4 h-4 rounded-full border-2 transition-all ${
                            isSelected 
                              ? 'border-blue-500 shadow-lg' 
                              : 'border-white dark:border-slate-700'
                          }`}
                          style={{ backgroundColor: nodeColor }}
                        />
                      </div>

                      {/* Content */}
                      <div 
                        className={`flex-1 p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                        onClick={() => handleNodeClick(node)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                              {node.message}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {node.author} • {getTimeAgo(node.date)} • {node.hash.slice(0, 7)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {node.branches.length > 0 && (
                              <BranchIcon size={14} className="text-blue-500" />
                            )}
                            {node.tags.length > 0 && (
                              <Tag size={14} className="text-green-500" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNodeSelect(node, e);
                              }}
                              className={`p-1 rounded ${
                                isSelected
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                              }`}
                            >
                              <GitCommit size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selection Actions */}
      <AnimatePresence>
        {selectedNodes.size > 0 && (
          <motion.div
            className="selection-actions mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedNodes.size} commit{selectedNodes.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-700 transition-all flex items-center gap-1">
                  <ArrowsClockwise size={14} />
                  Cherry-pick
                </button>
                <button className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-700 transition-all flex items-center gap-1">
                  <Trash size={14} />
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 