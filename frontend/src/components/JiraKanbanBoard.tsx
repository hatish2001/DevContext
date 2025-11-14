import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  MoreVertical, 
  Flag, 
  Clock, 
  User, 
  Plus,
  Circle,
  CircleDot,
  Clock4,
  Package,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExpandableJiraCard } from './ExpandableJiraCard';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface JiraIssue {
  id: string;
  userId: string;
  source: string;
  sourceId: string;
  title: string;
  content: string;
  url: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

interface JiraKanbanBoardProps {
  issues: JiraIssue[];
  userId: string;
  onUpdate: () => void;
}

// Map Jira statuses to board columns
const STATUS_COLUMNS = [
  {
    id: 'to-do',
    label: 'TO DO',
    statuses: ['To Do', 'Open', 'Backlog', 'Selected for Development'],
    icon: CircleDot,
    color: 'bg-card border-gray-800',
    headerBg: 'bg-gray-900/50 border-gray-800',
    borderColor: 'border-gray-800',
    textColor: 'text-gray-400'
  },
  {
    id: 'in-progress',
    label: 'IN PROCESS',
    statuses: ['In Progress', 'In Development', 'In Review', 'Review'],
    icon: Clock,
    color: 'bg-card border-gray-800',
    headerBg: 'bg-gray-900/50 border-gray-800',
    borderColor: 'border-gray-800',
    textColor: 'text-purple-400'
  },
  {
    id: 'pending-qa',
    label: 'PENDING QA',
    statuses: ['Pending QA', 'QA', 'Testing', 'In Testing', 'QA Review'],
    icon: Clock4,
    color: 'bg-card border-gray-800',
    headerBg: 'bg-gray-900/50 border-gray-800',
    borderColor: 'border-gray-800',
    textColor: 'text-amber-400'
  },
  {
    id: 'pending-deployment',
    label: 'PENDING DEPLOYMENT',
    statuses: ['Ready for Deployment', 'Deploy', 'Deployment', 'Staging', 'Ready to Deploy'],
    icon: Package,
    color: 'bg-card border-gray-800',
    headerBg: 'bg-gray-900/50 border-gray-800',
    borderColor: 'border-gray-800',
    textColor: 'text-blue-400'
  },
  {
    id: 'on-hold',
    label: 'ON HOLD',
    statuses: ['On Hold', 'Blocked', 'Waiting', 'Blocked'],
    icon: Pause,
    color: 'bg-card border-gray-800',
    headerBg: 'bg-gray-900/50 border-gray-800',
    borderColor: 'border-gray-800',
    textColor: 'text-red-400'
  }
];

export function JiraKanbanBoard({ issues, userId, onUpdate }: JiraKanbanBoardProps) {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const { toast } = useToast();

  // Get Jira base URL from any issue
  const getJiraBaseUrl = (): string | null => {
    if (issues.length === 0) return null;
    
    // Try to get URL from first issue
    const firstIssue = issues[0];
    if (firstIssue.url) {
      try {
        const jiraUrl = new URL(firstIssue.url);
        return `${jiraUrl.protocol}//${jiraUrl.host}`;
      } catch (e) {
        // Invalid URL, try metadata
      }
    }
    
    // Try to get from metadata
    const metadata = firstIssue.metadata || {};
    if (metadata.site?.url) {
      return metadata.site.url;
    }
    
    return null;
  };

  // Group issues by status
  const getIssueStatus = (issue: JiraIssue): string => {
    const status = issue.metadata?.status?.name || issue.metadata?.status || 'To Do';
    return status;
  };

  const getIssueColumn = (issue: JiraIssue): string => {
    const status = getIssueStatus(issue);
    
    for (const column of STATUS_COLUMNS) {
      if (column.statuses.some(s => status.toLowerCase().includes(s.toLowerCase()))) {
        return column.id;
      }
    }
    
    // Default to "to-do" if status doesn't match
    return 'to-do';
  };

  const groupedIssues = STATUS_COLUMNS.reduce((acc, column) => {
    acc[column.id] = issues.filter(issue => getIssueColumn(issue) === column.id);
    return acc;
  }, {} as Record<string, JiraIssue[]>);

  const handleStatusUpdate = async (issueKey: string, newStatusId: string) => {
    try {
      await api.updateJiraStatus(userId, issueKey, newStatusId);
      toast({
        title: 'Status updated',
        description: 'Issue status has been updated',
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.error || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    const p = priority?.toLowerCase() || '';
    if (p.includes('urgent') || p.includes('critical')) return 'text-red-400';
    if (p.includes('high')) return 'text-orange-400';
    if (p.includes('medium')) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getPriorityIcon = (priority: string) => {
    return <Flag className="w-3 h-3" />;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {STATUS_COLUMNS.map((column) => {
        const Icon = column.icon;
        const columnIssues = groupedIssues[column.id] || [];
        
        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 flex flex-col ${column.borderColor} border rounded-lg overflow-hidden ${column.color}`}
          >
            {/* Column Header */}
            <div className={`px-4 py-3 ${column.headerBg} border-b ${column.borderColor} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${column.textColor}`} />
                <span className={`font-semibold text-sm ${column.textColor}`}>{column.label}</span>
                <Badge variant="outline" className="ml-auto text-xs bg-gray-900/50 border-gray-800 text-gray-400">
                  {columnIssues.length}
                </Badge>
              </div>
            </div>

            {/* Issues List */}
            <ScrollArea className="flex-1 px-2 py-3 bg-gray-950/30">
              <div className="space-y-2 min-h-[200px]">
                {columnIssues.map((issue) => {
                  const metadata = issue.metadata || {};
                  const priority = metadata.priority?.name || metadata.priority || 'Medium';
                  const assignee = metadata.assignee?.displayName || metadata.assignee?.name || null;
                  const issueKey = metadata.key || issue.sourceId;
                  const isExpanded = expandedIssue === issue.id;

                  return (
                    <div key={issue.id}>
                      {isExpanded ? (
                        <div className="mb-2">
                          <ExpandableJiraCard
                            context={issue as any}
                            userId={userId}
                            onUpdate={onUpdate}
                          />
                        </div>
                      ) : (
                        <div
                          className="bg-gray-900/40 border border-gray-800 rounded-lg p-3 cursor-pointer hover:border-gray-700 hover:bg-gray-900/60 transition-colors"
                          onClick={() => setExpandedIssue(issue.id)}
                        >
                          {/* Issue Key and Title */}
                          <div className="mb-2">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="text-xs font-mono text-blue-400">{issueKey}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedIssue(issue.id);
                                }}
                              >
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </div>
                            <h4 className="text-sm font-medium text-foreground line-clamp-2">
                              {issue.title}
                            </h4>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {priority && (
                              <div className={`flex items-center gap-1 text-xs ${getPriorityColor(priority)}`}>
                                {getPriorityIcon(priority)}
                                <span>{priority}</span>
                              </div>
                            )}
                            
                            {assignee && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <User className="w-3 h-3" />
                                <span className="truncate max-w-[100px]">{assignee}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                              <Clock className="w-3 h-3" />
                              <span>{formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {columnIssues.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No issues
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Add Task Button */}
            <div className="p-2 border-t border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-400 hover:text-foreground"
                onClick={() => {
                  const baseUrl = getJiraBaseUrl();
                  if (baseUrl) {
                    // Open Jira to create new issue
                    window.open(`${baseUrl}/secure/CreateIssue!default.jspa`, '_blank');
                  } else {
                    toast({
                      title: 'Cannot create issue',
                      description: 'Jira URL not available. Please sync your Jira issues first.',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

