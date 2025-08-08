import { useMemo, useCallback } from 'react';
import { GitGraph, GitGraphNode } from '../types';
import { getTimeAgo, truncateText } from '../utils/index';
import { GitCommit } from '@phosphor-icons/react';

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
  const maxLane = useMemo(() => Math.max(0, ...graph.nodes.map(n => n.x)), [graph.nodes]);
  const rowHeight = 28;
  const laneWidth = 14;
  const gutter = 12;
  const graphWidth = gutter * 2 + laneWidth * (maxLane + 1);

  const rowIndex: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    graph.nodes.forEach((n, i) => { map[n.hash] = i; });
    return map;
  }, [graph.nodes]);

  const laneX = (lane: number) => gutter + lane * laneWidth;
  const rowY = (idx: number) => idx * rowHeight + rowHeight / 2;

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  return (
    <div className={`git-graph-visualization ${className}`}>
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">{graph.nodes.length} commits</div>

      <div className="relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {/* Edges overlay */}
        <svg
          className="absolute left-0 top-0"
          width={graphWidth}
          height={Math.max(1, graph.nodes.length) * rowHeight}
          style={{ pointerEvents: 'none' }}
        >
          {graph.edges.map((e) => {
            const from = graph.nodes.find(n => n.hash === e.from);
            const to = graph.nodes.find(n => n.hash === e.to);
            if (!from || !to) return null;
            const x1 = laneX(from.x);
            const y1 = rowY(rowIndex[from.hash]);
            const x2 = laneX(to.x);
            const y2 = rowY(rowIndex[to.hash]);
            return (
              <line key={`${e.from}-${e.to}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={1.5} />
            );
          })}
        </svg>

        {/* Rows */}
        <div>
          {graph.nodes.map((node, idx) => {
            const isSelected = selectedNodes.has(node.hash);
            return (
              <div
                key={node.hash}
                className={`flex items-center border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors ${idx === graph.nodes.length - 1 ? 'border-b-0' : ''}`}
                style={{ height: rowHeight }}
                onClick={() => onNodeClick?.(node)}
              >
                {/* Graph cell */}
                <div className="relative" style={{ width: graphWidth, height: '100%' }}>
                  <svg width={graphWidth} height={rowHeight} style={{ position: 'absolute', left: 0, top: 0 }}>
                    <circle cx={laneX(node.x)} cy={rowHeight / 2} r={4} fill={isSelected ? '#3b82f6' : '#0ea5e9'} />
                  </svg>
                </div>

                {/* Content cell */}
                <div className="flex-1 min-w-0 pr-3">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{truncateText(node.message, 120)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {node.author} • {getTimeAgo(node.date)} •
                    <button
                      className="ml-1 font-mono hover:underline"
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(node.hash); }}
                      title="Copy hash"
                    >
                      {node.hash.slice(0,7)}
                    </button>
                  </div>
                </div>

                {/* Action cell */}
                <div className="px-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onNodeSelect?.(node as any); }}
                    className={`p-1.5 rounded-md border text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 ${isSelected ? 'ring-1 ring-blue-400' : ''}`}
                    title="Select commit"
                  >
                    <GitCommit size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}