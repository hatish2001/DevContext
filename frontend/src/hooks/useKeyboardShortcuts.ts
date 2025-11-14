import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const metaKey = e.metaKey || e.ctrlKey;
        
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (!shortcut.ctrlOrCmd || metaKey) &&
          (!shortcut.shift || e.shiftKey)
        ) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

