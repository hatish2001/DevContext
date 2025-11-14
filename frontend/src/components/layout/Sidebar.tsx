import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  Clock, 
  AtSign, 
  Activity, 
  Star, 
  Filter,
  Search,
  Home,
  Layers,
  Settings
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const sidebarItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Layers, label: 'All Contexts', path: '/contexts' },
  { icon: Clock, label: 'Timeline', path: '/timeline' },
  { icon: AtSign, label: 'Mentions', path: '/mentions' },
  { icon: Activity, label: 'Activity', path: '/activity' },
  { icon: Star, label: 'Starred', path: '/starred' },
]

const filterOptions = [
  { id: 'github', label: 'GitHub', checked: true },
  { id: 'jira', label: 'Jira', checked: true },
  { id: 'slack', label: 'Slack', checked: true },
]

export function Sidebar() {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState(filterOptions)

  const toggleFilter = (id: string) => {
    setFilters(filters.map(f => 
      f.id === id ? { ...f, checked: !f.checked } : f
    ))
  }

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo/Title */}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">DevContext</h1>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contexts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-4">
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <Button
                key={item.path}
                variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                asChild
              >
                <Link to={item.path}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <Separator className="mx-4" />

        {/* Filters */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Filters</h3>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {filters.map((filter) => (
              <label
                key={filter.id}
                className="flex items-center space-x-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={filter.checked}
                  onChange={() => toggleFilter(filter.id)}
                  className="rounded border-gray-300"
                />
                <span className={cn(
                  "flex items-center",
                  filter.id === 'github' && "text-[#333]",
                  filter.id === 'jira' && "text-[#0052CC]",
                  filter.id === 'slack' && "text-[#4A154B]"
                )}>
                  {filter.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Settings */}
      <div className="p-2 border-t border-border">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  )
}
