import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { 
  Search, 
  Github, 
  GitPullRequest, 
  GitCommit, 
  RefreshCw,
  Settings,
  LogOut,
  ExternalLink,
  Home,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import './CommandPalette.css';

interface CommandPaletteProps {
  userId: string | null;
  onSync?: () => void;
}

export function CommandPalette({ userId, onSync }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [contexts, setContexts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Toggle with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      
      // Close with Escape
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search contexts when query changes
  useEffect(() => {
    if (!open || !userId || search.length < 2) {
      setContexts([]);
      return;
    }

    const searchContexts = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:3000/api/contexts/search?userId=${userId}&query=${encodeURIComponent(search)}&limit=10`,
          { credentials: 'include' }
        );
        const data = await response.json();
        setContexts(data.results || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchContexts, 300);
    return () => clearTimeout(debounceTimer);
  }, [search, open, userId]);

  const runCommand = (callback: () => void) => {
    setOpen(false);
    setSearch('');
    callback();
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[20vh]" 
      onClick={() => setOpen(false)}
    >
      <div 
        className="w-full max-w-2xl bg-card rounded-lg shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-border px-3">
            <Search className="w-5 h-5 text-muted-foreground mr-2" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex-1 px-2 py-4 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Command.List className="max-h-96 overflow-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Quick Actions Group */}
            <Command.Group heading="Quick Actions" className="mb-2">
              <Command.Item
                onSelect={() => runCommand(() => {
                  navigate('/dashboard');
                })}
                className="px-3 py-2 rounded cursor-pointer flex items-center gap-2 aria-selected:bg-accent"
              >
                <Home className="w-4 h-4 text-muted-foreground" />
                <span>Go to Dashboard</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘D</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => {
                  if (onSync) {
                    onSync();
                    toast({
                      title: 'Syncing GitHub data...',
                      description: 'This may take a moment'
                    });
                  }
                })}
                className="px-3 py-2 rounded cursor-pointer flex items-center gap-2 aria-selected:bg-accent"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <span>Sync GitHub</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘S</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => {
                  navigate('/settings');
                })}
                className="px-3 py-2 rounded cursor-pointer flex items-center gap-2 aria-selected:bg-accent"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Settings</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘,</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => {
                  localStorage.removeItem('userId');
                  navigate('/');
                  toast({
                    title: 'Logged out',
                    description: 'You have been logged out successfully'
                  });
                })}
                className="px-3 py-2 rounded cursor-pointer flex items-center gap-2 aria-selected:bg-accent"
              >
                <LogOut className="w-4 h-4 text-muted-foreground" />
                <span>Logout</span>
                <span className="ml-auto text-xs text-muted-foreground">⌘Q</span>
              </Command.Item>
            </Command.Group>

            {/* Search Results */}
            {contexts.length > 0 && (
              <Command.Group heading="Search Results" className="mb-2">
                {contexts.map((context) => (
                  <Command.Item
                    key={context.id}
                    value={context.title}
                    onSelect={() => runCommand(() => {
                      if (context.url) {
                        window.open(context.url, '_blank');
                      }
                    })}
                    className="px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      {context.source === 'github_pr' && <GitPullRequest className="w-4 h-4 text-green-500" />}
                      {context.source === 'github_commit' && <GitCommit className="w-4 h-4 text-purple-500" />}
                      {context.source === 'github_issue' && <Github className="w-4 h-4 text-blue-500" />}
                      {context.source === 'github_review' && <MessageSquare className="w-4 h-4 text-yellow-500" />}
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{context.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {context.metadata?.repo}
                        </div>
                      </div>
                      
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Loading State */}
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
          </Command.List>

          {/* Footer */}
          <div className="border-t border-border px-3 py-2 bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
              <span>⌘K to toggle</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}

