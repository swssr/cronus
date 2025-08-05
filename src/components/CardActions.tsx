import { motion, AnimatePresence } from "framer-motion";
import { Copy, Eye, GitBranch, ExternalLink, Download, MoreHorizontal } from "lucide-react";
import { useCallback } from "react";
import type { Commit } from "../types";

interface CardActionsProps {
  commit: Commit;
  isActive: boolean;
  isHovered: boolean;
  onAction: (action: string, commit: Commit) => void;
}

export function CardActions({ commit, isActive, isHovered, onAction }: CardActionsProps) {
  const shouldShow = isActive || isHovered;

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  const actions = [
    {
      id: 'copy-hash',
      icon: Copy,
      label: 'Copy hash',
      onClick: () => {
        copyToClipboard(commit.hash);
        onAction('copy-hash', commit);
      }
    },
    {
      id: 'view-diff',
      icon: Eye,
      label: 'View diff',
      onClick: () => onAction('view-diff', commit)
    },
    {
      id: 'checkout',
      icon: GitBranch,
      label: 'Checkout',
      onClick: () => onAction('checkout', commit)
    },
    {
      id: 'open-external',
      icon: ExternalLink,
      label: 'Open in external',
      onClick: () => onAction('open-external', commit)
    },
    {
      id: 'download',
      icon: Download,
      label: 'Download file',
      onClick: () => onAction('download', commit)
    }
  ];

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="card-actions"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="actions-container">
            {/* Primary actions - always visible */}
            <div className="primary-actions">
              {actions.slice(0, 3).map((action) => (
                <motion.button
                  key={action.id}
                  type="button"
                  className="action-button primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  title={action.label}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <action.icon size={16} />
                </motion.button>
              ))}
            </div>
            
            {/* Secondary actions - in dropdown */}
            {isActive && (
              <div className="secondary-actions">
                <motion.div
                  className="actions-dropdown"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {actions.slice(3).map((action) => (
                    <motion.button
                      key={action.id}
                      type="button"
                      className="action-button secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                      }}
                      title={action.label}
                      whileHover={{ scale: 1.05, x: 2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <action.icon size={14} />
                      <span className="action-label">{action.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            )}
            
            {/* More actions indicator for non-active cards */}
            {!isActive && isHovered && (
              <motion.div
                className="more-indicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <MoreHorizontal size={14} />
                <span className="more-hint">Click to see more</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}