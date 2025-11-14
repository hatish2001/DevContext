import {
  CommandDialog as CmdDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Search, GitPullRequest, MessageSquare, FileText, Hash, AtSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface CommandDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CommandDialog({ open, onOpenChange }: CommandDialogProps) {
  const navigate = useNavigate()

  const handleSelect = (value: string) => {
    onOpenChange?.(false)
    
    // Handle navigation based on value
    if (value.startsWith('nav-')) {
      navigate(value.replace('nav-', '/'))
    }
  }

  return (
    <CmdDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem value="search-payment" onSelect={handleSelect}>
            <Search className="mr-2 h-4 w-4" />
            <span>Search "payment processing error"</span>
          </CommandItem>
          <CommandItem value="nav-mentions" onSelect={handleSelect}>
            <AtSign className="mr-2 h-4 w-4" />
            <span>View mentions</span>
          </CommandItem>
          <CommandItem value="filter-jira" onSelect={handleSelect}>
            <Hash className="mr-2 h-4 w-4" />
            <span>Filter by Jira</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Recent">
          <CommandItem value="pr-234" onSelect={handleSelect}>
            <GitPullRequest className="mr-2 h-4 w-4" />
            <span>PR #234 - Fix payment bug</span>
          </CommandItem>
          <CommandItem value="slack-thread" onSelect={handleSelect}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Slack: Deployment issue discussion</span>
          </CommandItem>
          <CommandItem value="doc-api" onSelect={handleSelect}>
            <FileText className="mr-2 h-4 w-4" />
            <span>API Documentation</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Navigation">
          <CommandItem value="nav-" onSelect={handleSelect}>
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem value="nav-contexts" onSelect={handleSelect}>
            <span>All Contexts</span>
          </CommandItem>
          <CommandItem value="nav-integrations" onSelect={handleSelect}>
            <span>Integrations</span>
          </CommandItem>
          <CommandItem value="nav-settings" onSelect={handleSelect}>
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CmdDialog>
  )
}
