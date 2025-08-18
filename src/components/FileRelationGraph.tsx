import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Network, 
  MagnifyingGlass, 
  ArrowsOutCardinal,
  Gear,
  ArrowClockwise,
  X
} from '@phosphor-icons/react';
import { analyzeFileRelationships } from '../utils/index';
import { FileGraph, GraphFileNode } from '../types';

interface FileRelationGraphProps {
  repoPath: string;
  onClose: () => void;
}

interface GraphNode extends GraphFileNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
  radius: number;
  color: string;
  isHighlighted: boolean;
  isSelected: boolean;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  relationType: string;
  strength: number;
  metadata?: any;
  isHighlighted: boolean;
}

export default function FileRelationGraph({ repoPath, onClose }: FileRelationGraphProps) {
  const [graph, setGraph] = useState<FileGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [layoutType, setLayoutType] = useState<'force' | 'circular' | 'hierarchical'>('force');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  // Load file relationship data
  useEffect(() => {
    loadFileRelationships();
  }, [repoPath]);

  const loadFileRelationships = async () => {
    try {
      setIsLoading(true);
      const graphData = await analyzeFileRelationships(repoPath);
      setGraph(graphData);
      
      // Initialize graph nodes and edges
      initializeGraph(graphData);
    } catch (error) {
      console.error('Failed to load file relationships:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeGraph = (graphData: FileGraph) => {
    const nodes: GraphNode[] = graphData.nodes.map((node, index) => {
      const angle = (index / graphData.nodes.length) * 2 * Math.PI;
      const radius = 300;
      
      return {
        ...node,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: Math.max(8, Math.min(20, node.centrality * 2 + 8)),
        color: getNodeColor(node.fileType),
        isHighlighted: false,
        isSelected: false,
      };
    });

    const edges: GraphEdge[] = graphData.edges.map(edge => {
      const sourceNode = nodes.find(n => n.path === edge.source);
      const targetNode = nodes.find(n => n.path === edge.target);
      
      if (sourceNode && targetNode) {
        return {
          source: sourceNode,
          target: targetNode,
          relationType: edge.relationType,
          strength: edge.strength,
          metadata: edge.metadata,
          isHighlighted: false,
        };
      }
      return null;
    }).filter(Boolean) as GraphEdge[];

    nodesRef.current = nodes;
    edgesRef.current = edges;
    
    // Start animation
    startAnimation();
  };

  const getNodeColor = (fileType: string): string => {
    const baseColors: Record<string, string> = {
      'ts': '#3178c6',
      'tsx': '#3178c6',
      'js': '#f7df1e',
      'jsx': '#f7df1e',
      'rs': '#ce422b',
      'py': '#3776ab',
      'go': '#00add8',
      'java': '#007396',
      'cpp': '#00599c',
      'c': '#00599c',
      'html': '#e34c26',
      'css': '#1572b6',
      'json': '#000000',
      'md': '#000000',
    };

    const baseColor = baseColors[fileType] || '#6b7280';
    
    return baseColor;
  };

  const startAnimation = useCallback(() => {
    const animate = () => {
      if (layoutType === 'force') {
        updateForceLayout();
      }
      renderGraph();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  }, [layoutType]);

  const updateForceLayout = () => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    
    // Simple force-directed layout
    const centerX = 0;
    const centerY = 0;
    const repulsion = 1000;
    const attraction = 0.1;
    
    nodes.forEach(node => {
      // Repulsion between nodes
      let fx = 0;
      let fy = 0;
      
      nodes.forEach(other => {
        if (other !== node) {
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const force = repulsion / (distance * distance);
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        }
      });
      
      // Attraction for connected nodes
      edges.forEach(edge => {
        if (edge.source === node) {
          const dx = edge.target.x - node.x;
          const dy = edge.target.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            fx += (dx / distance) * attraction * distance;
            fy += (dy / distance) * attraction * distance;
          }
        }
      });
      
      // Center attraction
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      fx += dx * 0.001;
      fy += dy * 0.001;
      
      // Update velocity and position
      node.vx = (node.vx + fx) * 0.9;
      node.vy = (node.vy + fy) * 0.9;
      node.x += node.vx;
      node.y += node.vy;
    });
  };

  const renderGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom and pan
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(center.x, center.y);
    
    // Draw edges
    edgesRef.current.forEach(edge => {
      if (edge.isHighlighted || !selectedNode) {
        ctx.strokeStyle = edge.isHighlighted ? '#3b82f6' : '#d1d5db';
        ctx.lineWidth = edge.isHighlighted ? 3 : 1;
        
        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);
        ctx.stroke();
      }
    });
    
    // Draw nodes
    nodesRef.current.forEach(node => {
      if (node.isHighlighted || !selectedNode) {
        ctx.fillStyle = node.color;
        ctx.strokeStyle = node.isSelected ? '#3b82f6' : '#374151';
        ctx.lineWidth = node.isSelected ? 3 : 1;
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw node label
        if (zoom > 0.8) {
          ctx.fillStyle = '#1f2937';
          ctx.font = '12px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(node.name, node.x, node.y + node.radius + 15);
        }
      }
    });
    
    ctx.restore();
  };

  const handleNodeClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / zoom - center.x;
    const y = (event.clientY - rect.top - rect.height / 2) / zoom - center.y;
    
    // Find clicked node
    const clickedNode = nodesRef.current.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });
    
    if (clickedNode) {
      setSelectedNode(clickedNode);
      
      // Highlight connected nodes and edges
      nodesRef.current.forEach(node => {
        const isConnected = edgesRef.current.some(edge => 
          (edge.source === clickedNode && edge.target === node) ||
          (edge.target === clickedNode && edge.source === node)
        );
        node.isHighlighted = node === clickedNode || isConnected;
      });
      
      edgesRef.current.forEach(edge => {
        const isConnected = edge.source === clickedNode || edge.target === clickedNode;
        edge.isHighlighted = isConnected;
      });
    } else {
      // Clear selection
      setSelectedNode(null);
      nodesRef.current.forEach(node => {
        node.isHighlighted = true;
      });
      edgesRef.current.forEach(edge => {
        edge.isHighlighted = false;
      });
    }
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.1, Math.min(3, prev + delta)));
  };

  const resetView = () => {
    setZoom(1);
    setCenter({ x: 0, y: 0 });
    setSelectedNode(null);
    nodesRef.current.forEach(node => {
      node.isHighlighted = true;
    });
    edgesRef.current.forEach(edge => {
      edge.isHighlighted = false;
    });
  };

  const filterByType = (type: string) => {
    setFilterType(type);
    // Implement filtering logic
  };

  const searchNodes = (term: string) => {
    setSearchTerm(term);
    // Implement search logic
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-background border rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4">
          <ArrowClockwise className="w-8 h-8 animate-spin text-primary" />
          <p className="text-lg font-medium">Analyzing file relationships...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Network className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">File Relation Graph</h2>
              <p className="text-sm text-muted-foreground">
                {graph?.metadata.totalFiles} files, {graph?.metadata.totalRelations} relations
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Gear className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleZoom(0.2)}
              >
                <MagnifyingGlass className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleZoom(-0.2)}
              >
                <MagnifyingGlass className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetView}
              >
                <ArrowsOutCardinal className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={layoutType}
                onChange={(e) => setLayoutType(e.target.value as any)}
                className="px-3 py-1 text-sm border rounded-md bg-background"
              >
                <option value="force">Force Layout</option>
                <option value="circular">Circular</option>
                <option value="hierarchical">Hierarchical</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => searchNodes(e.target.value)}
                className="pl-10 w-64 text-sm"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={loadFileRelationships}
            >
              <ArrowClockwise className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b bg-muted/20 overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <h3 className="font-medium">Graph Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="filter-type" className="text-sm font-medium">Filter by File Type</label>
                    <select
                      id="filter-type"
                      value={filterType}
                      onChange={(e) => filterByType(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="code">Code Files</option>
                      <option value="config">Config Files</option>
                      <option value="docs">Documentation</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="node-size" className="text-sm font-medium">Node Size Based On</label>
                    <select id="node-size" className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm">
                      <option value="centrality">Centrality</option>
                      <option value="size">File Size</option>
                      <option value="imports">Import Count</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Graph Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer"
            onClick={handleNodeClick}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.1 : 0.1;
              handleZoom(delta);
            }}
          />
          
          {/* Zoom Indicator */}
          <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2 text-sm">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Node Details Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t bg-muted/20 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">File Details</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedNode(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Name:</strong> {selectedNode.name}</p>
                    <p><strong>Path:</strong> {selectedNode.path}</p>
                    <p><strong>Type:</strong> {selectedNode.fileType}</p>
                    <p><strong>Size:</strong> {(selectedNode.size / 1024).toFixed(1)} KB</p>
                  </div>
                  
                  <div>
                    <p><strong>Centrality:</strong> {selectedNode.centrality.toFixed(2)}</p>
                    <p><strong>Imports:</strong> {selectedNode.importCount}</p>
                    <p><strong>Exports:</strong> {selectedNode.exportCount}</p>
                    <p><strong>Modified:</strong> {new Date(selectedNode.lastModified).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
