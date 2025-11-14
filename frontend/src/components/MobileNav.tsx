import { useState } from 'react';
import { Menu, X, Home, Search, RefreshCw, Settings, Layers } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';

interface MobileNavProps {
  onNavigate?: (page: string) => void;
}

export function MobileNav({ onNavigate }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (page: string) => {
    setIsOpen(false);
    onNavigate?.(page);
  };

  return (
    <div className="lg:hidden">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 bg-background border-b border-border z-40">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold">DevContext</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => setIsOpen(!isOpen)}
              variant="ghost"
              size="icon"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border z-50 animate-in slide-in-from-left">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold">DevContext</h2>
            </div>

            <nav className="p-4 space-y-2">
              <Button
                onClick={() => handleNavigate('dashboard')}
                variant="ghost"
                className="w-full justify-start"
              >
                <Home className="w-5 h-5 mr-3" />
                Dashboard
              </Button>
              
              <Button
                onClick={() => handleNavigate('search')}
                variant="ghost"
                className="w-full justify-start"
              >
                <Search className="w-5 h-5 mr-3" />
                Search
              </Button>
              
              <Button
                onClick={() => handleNavigate('groups')}
                variant="ghost"
                className="w-full justify-start"
              >
                <Layers className="w-5 h-5 mr-3" />
                Groups
              </Button>
              
              <Button
                onClick={() => handleNavigate('sync')}
                variant="ghost"
                className="w-full justify-start"
              >
                <RefreshCw className="w-5 h-5 mr-3" />
                Sync
              </Button>
              
              <Button
                onClick={() => handleNavigate('settings')}
                variant="ghost"
                className="w-full justify-start"
              >
                <Settings className="w-5 h-5 mr-3" />
                Settings
              </Button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}





