import React, { useEffect, useMemo, useState } from 'react';
import { CaretRight, CaretDown, Folder as FolderIcon, FileText } from '@phosphor-icons/react';
import { getRepoHistoryData } from '@/utils/index';
import { getRecencyColor } from '@/utils/colorUtils';
import { FileIcon } from './FileIcon';

interface FileTreeProps {
  repoPath: string;
  files: string[];
  onSelect: (filePath: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: Record<string, TreeNode>;
  lastModified?: string; // YYYY-MM-DD
}

function buildTree(files: string[], fileToLastModified: Record<string, string>): TreeNode {
  const root: TreeNode = { name: '', path: '', type: 'folder', children: {} };

  for (const file of files) {
    const segments = file.split('/');
    let current = root;
    let currentPath = '';

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      current.children = current.children || {};
      if (!current.children[segment]) {
        current.children[segment] = {
          name: segment,
          path: currentPath,
          type: isLast ? 'file' : 'folder',
          children: isLast ? undefined : {},
        };
      }
      current = current.children[segment]!;
      if (isLast) {
        current.lastModified = fileToLastModified[file];
      }
    });
  }

  // Propagate lastModified up the tree as the most recent among descendants
  const propagateDates = (node: TreeNode): string | undefined => {
    if (node.type === 'file') return node.lastModified;
    let mostRecent: string | undefined;
    if (node.children) {
      for (const child of Object.values(node.children)) {
        const childDate = propagateDates(child);
        if (!mostRecent) {
          mostRecent = childDate;
        } else if (childDate && new Date(childDate) > new Date(mostRecent)) {
          mostRecent = childDate;
        }
      }
    }
    node.lastModified = mostRecent;
    return mostRecent;
  };

  propagateDates(root);
  return root;
}

function sortChildrenByRecency(node: TreeNode): void {
  if (!node.children) return;
  const entries = Object.entries(node.children);
  entries.sort(([, a], [, b]) => {
    // Folders above files if equally recent? We'll sort by recency desc, then folders first.
    const aDate = a.lastModified ? new Date(a.lastModified).getTime() : 0;
    const bDate = b.lastModified ? new Date(b.lastModified).getTime() : 0;
    if (bDate !== aDate) return bDate - aDate;
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  node.children = Object.fromEntries(entries);
  for (const child of Object.values(node.children)) {
    sortChildrenByRecency(child);
  }
}

export function FileTree({ repoPath, files, onSelect }: FileTreeProps) {
  const [fileToLastModified, setFileToLastModified] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    getRepoHistoryData(repoPath, 200).then((data) => {
      if (!isMounted) return;
      setFileToLastModified(data.fileToLastModified);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [repoPath]);

  const tree = useMemo(() => {
    const root = buildTree(files, fileToLastModified);
    sortChildrenByRecency(root);
    return root;
  }, [files, fileToLastModified]);

  const toggle = (path: string) => setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    if (node.type === 'file') {
      const recency = node.lastModified;
      const color = getRecencyColor(recency);
      return (
        <button
          type="button"
          className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
          onClick={() => onSelect(node.path)}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          <FileIcon fileName={node.name} size={16} className="text-slate-500 dark:text-slate-400" />
          <span className="truncate flex-1 text-slate-800 dark:text-slate-100">{node.name}</span>
        </button>
      );
    }

    const isOpen = expanded[node.path ?? '__root'] ?? true; // root open by default
    const color = getRecencyColor(node.lastModified);

    return (
      <div>
        {node.path && (
          <button
            type="button"
            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
            onClick={() => toggle(node.path)}
          >
            {isOpen ? <CaretDown size={14} /> : <CaretRight size={14} />}
            <FolderIcon size={16} className="text-slate-600 dark:text-slate-300" />
            <span className="truncate flex-1 text-slate-900 dark:text-slate-100">{node.name}</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          </button>
        )}
        <div className={node.path ? 'ml-4' : ''}>
          {isOpen && node.children && Object.values(node.children).map((child) => (
            <div key={child.path}>
              {renderNode(child, depth + 1)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {tree.children && Object.values(tree.children).map((child) => (
        <div key={child.path}>
          {renderNode(child, 0)}
        </div>
      ))}
      {!tree.children || Object.keys(tree.children).length === 0 ? (
        <div className="text-sm text-slate-500 flex items-center gap-2 px-2 py-2">
          <FileText size={16} />
          No files
        </div>
      ) : null}
    </div>
  );
}

export default FileTree;
