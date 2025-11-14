import { useState, useEffect } from 'react'
import { 
  GitPullRequest, Code2, MessageSquare, GitCommit, Github,
  Clock, ChevronRight, Filter
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface ActivityFeedProps {
  userId: string
  limit?: number
  sourceFilter?: string
}

interface Activity {
  id: string
  source: string
  title: string
  type: string
  timestamp: Date
  metadata: any
  url?: string | null
}

export function ActivityFeed({ userId, limit = 50, sourceFilter }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>(sourceFilter || 'all')
  const [timeFilter, setTimeFilter] = useState<string>('all')

  useEffect(() => {
    loadActivities()
  }, [userId, filter, timeFilter])

  const loadActivities = async () => {
    setLoading(true)
    try {
      const options: any = { limit }
      if (filter !== 'all') {
        options.source = filter
      }

      const data = await api.getContexts(userId, options)
      
      // Transform contexts to activities
      let transformed = data.contexts.map(ctx => ({
        id: ctx.id,
        source: ctx.source,
        title: ctx.title,
        type: getActivityType(ctx.source, ctx.metadata),
        timestamp: new Date(ctx.updatedAt),
        metadata: ctx.metadata,
        url: ctx.url,
      }))

      // Apply time filter
      if (timeFilter !== 'all') {
        const now = new Date()
        const filterDate = new Date()
        
        switch (timeFilter) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0)
            break
          case 'week':
            filterDate.setDate(now.getDate() - 7)
            break
          case 'month':
            filterDate.setMonth(now.getMonth() - 1)
            break
        }
        
        transformed = transformed.filter(a => a.timestamp >= filterDate)
      }

      // Sort by timestamp descending
      transformed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
      setActivities(transformed)
    } catch (error) {
      console.error('Failed to load activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityType = (source: string, metadata: any): string => {
    if (source.startsWith('github_pr')) {
      if (metadata?.merged) return 'pr_merged'
      if (metadata?.state === 'closed') return 'pr_closed'
      if (metadata?.state === 'open') return 'pr_opened'
      return 'pr_updated'
    }
    if (source.startsWith('github_issue')) {
      if (metadata?.state === 'closed') return 'issue_closed'
      return 'issue_updated'
    }
    if (source.startsWith('github_commit')) return 'commit'
    if (source.startsWith('github_review')) return 'review'
    if (source.startsWith('jira')) {
      if (metadata?.status?.toLowerCase().includes('done')) return 'jira_resolved'
      if (metadata?.status?.toLowerCase().includes('progress')) return 'jira_in_progress'
      return 'jira_updated'
    }
    if (source.startsWith('slack')) return 'slack_message'
    return 'updated'
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'pr_opened':
      case 'pr_merged':
      case 'pr_closed':
      case 'pr_updated':
        return <GitPullRequest className="w-4 h-4 text-green-400" />
      case 'issue_closed':
      case 'issue_updated':
        return <Github className="w-4 h-4 text-blue-400" />
      case 'commit':
        return <GitCommit className="w-4 h-4 text-purple-400" />
      case 'review':
        return <MessageSquare className="w-4 h-4 text-yellow-400" />
      case 'jira_resolved':
      case 'jira_in_progress':
      case 'jira_updated':
        return <Code2 className="w-4 h-4 text-blue-500" />
      case 'slack_message':
        return <MessageSquare className="w-4 h-4 text-purple-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getActivityColor = (type: string) => {
    if (type.includes('pr_merged') || type.includes('jira_resolved')) return 'text-green-400'
    if (type.includes('pr_opened') || type.includes('jira_in_progress')) return 'text-blue-400'
    if (type.includes('closed')) return 'text-red-400'
    return 'text-gray-400'
  }

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      pr_opened: 'PR Opened',
      pr_merged: 'PR Merged',
      pr_closed: 'PR Closed',
      pr_updated: 'PR Updated',
      issue_closed: 'Issue Closed',
      issue_updated: 'Issue Updated',
      commit: 'Commit',
      review: 'Review',
      jira_resolved: 'Jira Resolved',
      jira_in_progress: 'Jira In Progress',
      jira_updated: 'Jira Updated',
      slack_message: 'Slack Message',
    }
    return labels[type] || 'Updated'
  }

  const groupByDate = (activities: Activity[]) => {
    const groups: Record<string, Activity[]> = {}
    const now = new Date()
    
    activities.forEach(activity => {
      const date = activity.timestamp
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      
      let groupKey: string
      if (diffDays === 0) {
        groupKey = 'Today'
      } else if (diffDays === 1) {
        groupKey = 'Yesterday'
      } else if (diffDays < 7) {
        groupKey = 'This Week'
      } else if (diffDays < 30) {
        groupKey = 'This Month'
      } else {
        groupKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(activity)
    })
    
    return groups
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading activities...</div>
      </div>
    )
  }

  const grouped = groupByDate(activities)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="github_pr">GitHub PRs</SelectItem>
            <SelectItem value="github_issue">GitHub Issues</SelectItem>
            <SelectItem value="github_commit">Commits</SelectItem>
            <SelectItem value="jira_issue">Jira</SelectItem>
            <SelectItem value="slack_message">Slack</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity List */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateGroup, items]) => (
            <div key={dateGroup}>
              <div className="sticky top-0 z-10 bg-background/60 backdrop-blur border-b border-gray-800 py-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                  {dateGroup} • {items.length}
                </h3>
              </div>
              <div className="space-y-2">
                {items.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer group"
                    onClick={() => activity.url && window.open(activity.url, '_blank')}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', getActivityColor(activity.type))}
                        >
                          {getActivityLabel(activity.type)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 truncate group-hover:text-gray-100">
                        {activity.title}
                      </p>
                      {activity.metadata?.repo && (
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.metadata.repo}
                        </p>
                      )}
                    </div>
                    {activity.url && (
                      <ChevronRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No activities found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

