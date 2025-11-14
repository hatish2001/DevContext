import { useState, useEffect } from 'react'
import { 
  Code2, Clock, CheckCircle, AlertCircle, User, Tag, AlertTriangle, 
  ExternalLink, Calendar, Flag, Folder, Layers, FileText, ChevronDown, 
  ChevronUp, MessageSquare, Paperclip, GitBranch, Eye, Send, MoreVertical,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface ExpandableJiraCardProps {
  context: {
    id: string
    title: string
    content: string
    url?: string | null
    metadata: any
    updatedAt: Date | string
  }
  userId: string
  onUpdate?: () => void
}

export function ExpandableJiraCard({ context, userId, onUpdate }: ExpandableJiraCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullIssue, setFullIssue] = useState<any>(null)
  const [commentText, setCommentText] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const { toast } = useToast()

  const meta = context.metadata || {}
  const issueKey = meta.key || context.title.split(':')[0]

  const loadFullIssue = async () => {
    if (fullIssue || loading) return
    
    setLoading(true)
    try {
      const issue = await api.getJiraIssueFull(issueKey, userId)
      setFullIssue(issue)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load issue details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExpand = () => {
    if (!expanded) {
      loadFullIssue()
    }
    setExpanded(!expanded)
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    
    setAddingComment(true)
    try {
      await api.addJiraComment(issueKey, userId, commentText)
      toast({ title: 'Success', description: 'Comment added successfully' })
      setCommentText('')
      await loadFullIssue() // Reload to get new comment
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add comment',
        variant: 'destructive'
      })
    } finally {
      setAddingComment(false)
    }
  }

  const handleStatusChange = async (statusId: string) => {
    try {
      await api.updateJiraStatus(issueKey, userId, statusId)
      toast({ title: 'Success', description: 'Status updated successfully' })
      await loadFullIssue()
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive'
      })
    }
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-gray-400'
    const s = status.toLowerCase()
    if (s.includes('done') || s.includes('resolved') || s.includes('closed')) return 'text-green-400'
    if (s.includes('progress') || s.includes('in progress')) return 'text-yellow-400'
    if (s.includes('blocked') || s.includes('block')) return 'text-red-400'
    return 'text-blue-400'
  }

  const statusIcon = (status?: string) => {
    if (!status) return null
    const s = status.toLowerCase()
    if (s.includes('done')) return <CheckCircle className="w-4 h-4 text-green-400" />
    if (s.includes('progress')) return <AlertCircle className="w-4 h-4 text-yellow-400" />
    if (s.includes('block')) return <AlertTriangle className="w-4 h-4 text-red-400" />
    return <Clock className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-800/50 transition-all overflow-hidden">
      {/* Collapsed Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={handleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xs px-2 py-1 rounded bg-blue-900/30 text-blue-400 flex items-center gap-1 font-medium shrink-0">
              <Code2 className="w-4 h-4" /> Jira
            </span>
            {issueKey && (
              <span className="text-sm font-mono text-blue-400 shrink-0">{issueKey}</span>
            )}
            {meta.status && (
              <span className={`flex items-center gap-1 text-sm font-medium ${getStatusColor(meta.status)} shrink-0`}>
                {statusIcon(meta.status)}
                {meta.status}
              </span>
            )}
            <h3 className="text-base font-semibold text-gray-100 truncate flex-1">
              {String(context.title).replace(/^\w+-\d+\s*:\s*/, '')}
            </h3>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          {meta.assignee && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {meta.assignee}
            </span>
          )}
          {meta.priority && (
            <span className="flex items-center gap-1">
              <Flag className="w-3 h-3" />
              {meta.priority}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(context.updatedAt), { addSuffix: true })}
          </span>
          {fullIssue?.comments?.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {fullIssue.comments.length} comments
            </span>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-800 p-6 space-y-6">
          {loading && !fullIssue ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : fullIssue ? (
            <>
              {/* Description */}
              {fullIssue.renderedDescription || fullIssue.description ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Description</h4>
                  <div 
                    className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-300 prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: fullIssue.renderedDescription || fullIssue.description }}
                  />
                </div>
              ) : null}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {fullIssue.timeTracking && (fullIssue.timeTracking.timeSpent > 0 || fullIssue.timeTracking.originalEstimate > 0) && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Time Tracking</span>
                    <div className="text-sm text-gray-300">
                      <div>Spent: {Math.round(fullIssue.timeTracking.timeSpent / 3600)}h</div>
                      {fullIssue.timeTracking.originalEstimate > 0 && (
                        <div>Estimate: {Math.round(fullIssue.timeTracking.originalEstimate / 3600)}h</div>
                      )}
                    </div>
                  </div>
                )}
                {fullIssue.sprint && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Sprint</span>
                    <span className="text-sm text-gray-300">{fullIssue.sprint.name}</span>
                  </div>
                )}
                {fullIssue.watchers && fullIssue.watchers.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Watchers</span>
                    <span className="text-sm text-gray-300">{fullIssue.watchers.length}</span>
                  </div>
                )}
              </div>

              {/* Subtasks */}
              {fullIssue.subtasks && fullIssue.subtasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Subtasks</h4>
                  <div className="space-y-2">
                    {fullIssue.subtasks.map((subtask: any) => (
                      <div key={subtask.id} className="bg-gray-800/50 rounded p-2 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-blue-400 font-mono">{subtask.key}</span>
                          <span className="text-sm text-gray-300 ml-2">{subtask.summary}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">{subtask.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Issues */}
              {(fullIssue.linkedIssues.blocks.length > 0 || 
                fullIssue.linkedIssues.blockedBy.length > 0 || 
                fullIssue.linkedIssues.relates.length > 0) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Linked Issues</h4>
                  {fullIssue.linkedIssues.blockedBy.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-red-400">Blocked by:</span>
                      <div className="mt-1 space-y-1">
                        {fullIssue.linkedIssues.blockedBy.map((issue: any) => (
                          <div key={issue.id} className="text-sm text-gray-300">
                            <span className="text-blue-400 font-mono">{issue.key}</span> {issue.summary}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {fullIssue.linkedIssues.blocks.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-orange-400">Blocks:</span>
                      <div className="mt-1 space-y-1">
                        {fullIssue.linkedIssues.blocks.map((issue: any) => (
                          <div key={issue.id} className="text-sm text-gray-300">
                            <span className="text-blue-400 font-mono">{issue.key}</span> {issue.summary}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              {fullIssue.attachments && fullIssue.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attachments ({fullIssue.attachments.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {fullIssue.attachments.map((att: any) => (
                      <a
                        key={att.id}
                        href={att.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-800/50 rounded p-2 hover:bg-gray-800 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-gray-400 mb-1" />
                        <div className="text-xs text-gray-300 truncate">{att.filename}</div>
                        <div className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments ({fullIssue.comments?.length || 0})
                </h4>
                
                {/* Comment List */}
                {fullIssue.comments && fullIssue.comments.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {fullIssue.comments.map((comment: any) => (
                      <div key={comment.id} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {comment.authorAvatar && (
                            <img 
                              src={comment.authorAvatar} 
                              alt={comment.author}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-300">{comment.author}</span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.created), { addSuffix: true })}
                          </span>
                        </div>
                        <div 
                          className="text-sm text-gray-300 prose prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: comment.renderedBody || comment.body }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment */}
                <div className="border-t border-gray-800 pt-4">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="mb-2 bg-gray-800/50 border-gray-700"
                    rows={3}
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={addingComment || !commentText.trim()}
                    size="sm"
                  >
                    {addingComment ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Add Comment
                  </Button>
                </div>
              </div>

              {/* Activity History */}
              {fullIssue.changelog && fullIssue.changelog.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Recent Activity</h4>
                  <div className="space-y-2">
                    {fullIssue.changelog.slice(0, 5).map((change: any) => (
                      <div key={change.id} className="bg-gray-800/50 rounded p-2 text-xs">
                        <div className="text-gray-400">
                          {change.author} {formatDistanceToNow(new Date(change.created), { addSuffix: true })}
                        </div>
                        {change.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-gray-300 mt-1">
                            {item.field}: <span className="text-gray-500">{item.from || 'empty'}</span> → <span className="text-gray-300">{item.to || 'empty'}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 border-t border-gray-800 pt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4 mr-2" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {fullIssue.status && (
                      <DropdownMenuItem onClick={() => handleStatusChange('In Progress')}>
                        Mark In Progress
                      </DropdownMenuItem>
                    )}
                    {fullIssue.status && fullIssue.status.name !== 'Done' && (
                      <DropdownMenuItem onClick={() => handleStatusChange('Done')}>
                        Mark as Done
                      </DropdownMenuItem>
                    )}
                    {context.url && (
                      <DropdownMenuItem asChild>
                        <a href={context.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in Jira
                        </a>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

