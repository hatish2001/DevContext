import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Search, ChevronDown, PanelRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth'
import { CommandDialog } from './CommandDialog'

interface HeaderProps {
  onToggleSmartPanel?: () => void
}

export function Header({ onToggleSmartPanel }: HeaderProps) {
  const user = useAuthStore((state) => state.user)
  const [commandOpen, setCommandOpen] = useState(false)

  // Open command palette with Cmd+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between">
        {/* App Title / Home */}
        <div className="flex items-center gap-4 mr-4">
          <Link to="/" className="font-bold gradient-text tracking-tight">
            DevContext
          </Link>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search or press ⌘K..."
              className="pl-8 pr-4"
              onClick={() => setCommandOpen(true)}
              readOnly
            />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive"></span>
          </Button>

          {/* User Menu */}
          <Button variant="ghost" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <span className="text-sm font-medium">{user?.name || 'User'}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>

          {/* Smart Panel Toggle */}
          <Button variant="ghost" size="icon" onClick={onToggleSmartPanel}>
            <PanelRight className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}
