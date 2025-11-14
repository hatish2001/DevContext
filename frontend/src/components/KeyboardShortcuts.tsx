import { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['⌘', 'K'], description: 'Open command palette', category: 'Navigation' },
  { keys: ['⌘', 'S'], description: 'Sync GitHub data', category: 'Actions' },
  { keys: ['⌘', '/'], description: 'Focus search', category: 'Navigation' },
  { keys: ['⌘', '?'], description: 'Show keyboard shortcuts', category: 'Help' },
  { keys: ['G', 'D'], description: 'Go to dashboard', category: 'Navigation' },
  { keys: ['G', 'S'], description: 'Go to settings', category: 'Navigation' },
  { keys: ['G', 'G'], description: 'Go to groups', category: 'Navigation' },
  { keys: ['⌘', ','], description: 'Open preferences', category: 'Settings' },
  { keys: ['ESC'], description: 'Close modals/dialogs', category: 'General' },
  { keys: ['⌘', 'T'], description: 'Toggle theme', category: 'Settings' },
];

export function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘? or Ctrl+? to show shortcuts
      if (e.key === '?' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowHelp(true);
      }

      // ESC to close
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showHelp]);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <>
      {/* Floating help button */}
      <Button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 rounded-full shadow-lg z-40"
        size="icon"
        title="Keyboard shortcuts (⌘?)"
      >
        <Keyboard className="w-5 h-5" />
      </Button>

      {/* Shortcuts modal */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, j) => (
                          <kbd
                            key={j}
                            className="px-2 py-1 bg-muted border border-border rounded text-xs font-mono"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Press <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-xs">⌘?</kbd>{' '}
              anytime to show this help
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}





