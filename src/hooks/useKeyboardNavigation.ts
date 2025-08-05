import { useEffect, useCallback } from 'react';

interface KeyboardNavigationOptions {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onSpace?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
  // Custom shortcuts
  onToggleView?: () => void; // Cmd/Ctrl + T
  onFocusSearch?: () => void; // Cmd/Ctrl + F
  onRefresh?: () => void; // F5 or Cmd/Ctrl + R
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onSpace,
    onEnter,
    onEscape,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    onToggleView,
    onFocusSearch,
    onRefresh,
    enabled = true,
    preventDefault = true
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, metaKey, ctrlKey, target } = event;
    const modifierKey = metaKey || ctrlKey;
    
    // Don't interfere with input fields unless it's a global shortcut
    const isInputField = (target as HTMLElement)?.tagName?.toLowerCase() === 'input' ||
                        (target as HTMLElement)?.tagName?.toLowerCase() === 'textarea' ||
                        (target as HTMLElement)?.contentEditable === 'true';

    // Global shortcuts that work even in input fields
    if (modifierKey) {
      switch (key.toLowerCase()) {
        case 't':
          if (onToggleView) {
            if (preventDefault) event.preventDefault();
            onToggleView();
            return;
          }
          break;
        case 'f':
          if (onFocusSearch) {
            if (preventDefault) event.preventDefault();
            onFocusSearch();
            return;
          }
          break;
        case 'r':
          if (onRefresh) {
            if (preventDefault) event.preventDefault();
            onRefresh();
            return;
          }
          break;
      }
    }

    // F5 for refresh
    if (key === 'F5' && onRefresh) {
      if (preventDefault) event.preventDefault();
      onRefresh();
      return;
    }

    // Navigation shortcuts - only when not in input fields
    if (isInputField) return;

    switch (key) {
      case 'ArrowUp':
      case 'k': // Vim-style
        if (onArrowUp) {
          if (preventDefault) event.preventDefault();
          onArrowUp();
        }
        break;
      case 'ArrowDown':
      case 'j': // Vim-style
        if (onArrowDown) {
          if (preventDefault) event.preventDefault();
          onArrowDown();
        }
        break;
      case 'ArrowLeft':
      case 'h': // Vim-style
        if (onArrowLeft) {
          if (preventDefault) event.preventDefault();
          onArrowLeft();
        }
        break;
      case 'ArrowRight':
      case 'l': // Vim-style
        if (onArrowRight) {
          if (preventDefault) event.preventDefault();
          onArrowRight();
        }
        break;
      case ' ':
        if (onSpace) {
          if (preventDefault) event.preventDefault();
          onSpace();
        }
        break;
      case 'Enter':
        if (onEnter) {
          if (preventDefault) event.preventDefault();
          onEnter();
        }
        break;
      case 'Escape':
        if (onEscape) {
          if (preventDefault) event.preventDefault();
          onEscape();
        }
        break;
      case 'Home':
      case 'g':
        if (onHome) {
          if (preventDefault) event.preventDefault();
          onHome();
        }
        break;
      case 'End':
      case 'G':
        if (onEnd) {
          if (preventDefault) event.preventDefault();
          onEnd();
        }
        break;
      case 'PageUp':
        if (onPageUp) {
          if (preventDefault) event.preventDefault();
          onPageUp();
        }
        break;
      case 'PageDown':
        if (onPageDown) {
          if (preventDefault) event.preventDefault();
          onPageDown();
        }
        break;
    }
  }, [
    enabled,
    preventDefault,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onSpace,
    onEnter,
    onEscape,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    onToggleView,
    onFocusSearch,
    onRefresh
  ]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  return {
    enabled
  };
}