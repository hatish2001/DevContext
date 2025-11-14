import { useState, useEffect } from 'react'
import { 
  GitPullRequest, ChevronDown, ChevronUp, CheckCircle, XCircle, 
  Clock, User, FileCode, MessageSquare, GitMerge, ExternalLink,
  ChevronRight, Loader2, Send, AlertCircle, Play, Code2, GitBranch
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ExpandablePRCardProps {
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

// Simple diff viewer component
function DiffViewer({ patch, filename }: { patch?: string; filename: string }) {
  if (!patch) {
    return (
      <div className="bg-gray-800/50 rounded p-4 text-sm text-gray-400">
        No diff available
      </div>
    )
  }

  const lines = patch.split('\n').slice(4) // Skip diff header lines
  
  return (
    <div className="bg-gray-950 rounded border border-gray-800 overflow-hidden">
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <span className="text-sm font-mono text-gray-300">{filename}</span>
      </div>
      <ScrollArea className="max-h-96">
        <pre className="text-xs font-mono p-4">
          {lines.map((line, idx) => {
            const lineNum = idx + 1
            if (line.startsWith('+') && !line.startsWith('+++')) {
              return (
                <div key={idx} className="flex">
                  <span className="text-gray-600 w-8 text-right pr-2">{lineNum}</span>
                  <span className="text-green-400 bg-green-900/20 flex-1">{line}</span>
                </div>
              )
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              return (
                <div key={idx} className="flex">
                  <span className="text-gray-600 w-8 text-right pr-2">{lineNum}</span>
                  <span className="text-red-400 bg-red-900/20 flex-1">{line}</span>
                </div>
              )
            } else if (line.startsWith('@@')) {
              return (
                <div key={idx} className="flex text-blue-400 bg-blue-900/20 my-1">
                  <span className="w-8"></span>
                  <span className="flex-1">{line}</span>
                </div>
              )
            } else {
              return (
                <div key={idx} className="flex">
                  <span className="text-gray-600 w-8 text-right pr-2">{lineNum}</span>
                  <span className="text-gray-300 flex-1">{line || ' '}</span>
                </div>
              )
            }
          })}
        </pre>
      </ScrollArea>
    </div>
  )
}

export function ExpandablePRCard({ context, userId, onUpdate }: ExpandablePRCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullPR, setFullPR] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewEvent, setReviewEvent] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'>('COMMENT')
  const [addingReview, setAddingReview] = useState(false)
  const { toast } = useToast()

  const meta = context.metadata || {}
  const repo = meta.repo || ''
  const [owner, repoName] = repo.split('/')
  const prNumber = meta.number

  const loadFullPR = async () => {
    if (fullPR || loading || !owner || !repoName || !prNumber) return
    
    setLoading(true)
    try {
      const pr = await api.getPRFull(owner, repoName, prNumber, userId)
      setFullPR(pr)
      if (pr.files && pr.files.length > 0) {
        setSelectedFile(pr.files[0].filename)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load PR details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExpand = () => {
    if (!expanded) {
      loadFullPR()
    }
    setExpanded(!expanded)
  }

  const handleSubmitReview = async () => {
    if (!reviewComment.trim() && reviewEvent === 'COMMENT') return
    
    setAddingReview(true)
    try {
      await api.createPRReview(owner, repoName, prNumber, userId, reviewEvent, reviewComment || undefined)
      toast({ 
        title: 'Success', 
        description: reviewEvent === 'APPROVE' 
          ? 'PR approved successfully' 
          : reviewEvent === 'REQUEST_CHANGES'
          ? 'Changes requested'
          : 'Review comment added'
      })
      setReviewComment('')
      await loadFullPR() // Reload to get updated reviews
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review',
        variant: 'destructive'
      })
    } finally {
      setAddingReview(false)
    }
  }

  const handleMerge = async () => {
    if (!confirm('Are you sure you want to merge this PR?')) return
    
    try {
      await api.mergePR(owner, repoName, prNumber, userId, 'squash')
      toast({ title: 'Success', description: 'PR merged successfully' })
      await loadFullPR()
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to merge PR',
        variant: 'destructive'
      })
    }
  }

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'open': return 'text-green-400'
      case 'closed': return 'text-red-400'
      case 'merged': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  const getCheckStatusIcon = (status: string, conclusion?: string) => {
    if (status === 'completed') {
      if (conclusion === 'success') return <CheckCircle className="w-4 h-4 text-green-400" />
      if (conclusion === 'failure') return <XCircle className="w-4 h-4 text-red-400" />
      return <AlertCircle className="w-4 h-4 text-yellow-400" />
    }
    return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 hover:border-green-800/50 transition-all overflow-hidden">
      {/* Collapsed Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={handleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400 flex items-center gap-1 font-medium shrink-0">
              <GitPullRequest className="w-4 h-4" /> PR
            </span>
            {meta.number && (
              <span className="text-sm font-mono text-green-400 shrink-0">#{meta.number}</span>
            )}
            {meta.state && (
              <Badge 
                variant="outline" 
                className={`text-xs shrink-0 ${getStatusColor(meta.state)}`}
              >
                {meta.state}
              </Badge>
            )}
            {meta.draft && (
              <Badge variant="outline" className="text-xs shrink-0 text-gray-400">
                Draft
              </Badge>
            )}
            <h3 className="text-base font-semibold text-gray-100 truncate flex-1">
              {context.title}
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
          {meta.repo && (
            <span className="flex items-center gap-1">
              <Code2 className="w-3 h-3" />
              {repo.split('/').pop()}
            </span>
          )}
          {meta.author && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {meta.author}
            </span>
          )}
          {fullPR && (
            <>
              <span className="text-green-400">+{fullPR.additions}</span>
              <span className="text-red-400">-{fullPR.deletions}</span>
              <span className="text-gray-500">{fullPR.changedFiles} files</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(context.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-800 p-6 space-y-6">
          {loading && !fullPR ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-400" />
            </div>
          ) : fullPR ? (
            <>
              {/* PR Description */}
              {fullPR.bodyHtml || fullPR.body ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Description</h4>
                  <div 
                    className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-300 prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: fullPR.bodyHtml || fullPR.body }}
                  />
                </div>
              ) : null}

              {/* CI/CD Status */}
              {(fullPR.checkRuns && fullPR.checkRuns.length > 0) || 
               (fullPR.commitStatuses && fullPR.commitStatuses.length > 0) ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">CI/CD Status</h4>
                  <div className="space-y-2">
                    {fullPR.checkRuns?.map((check: any) => (
                      <div key={check.id} className="bg-gray-800/50 rounded p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCheckStatusIcon(check.status, check.conclusion)}
                          <span className="text-sm text-gray-300">{check.name}</span>
                        </div>
                        {check.detailsUrl && (
                          <a 
                            href={check.detailsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline"
                          >
                            Details
                          </a>
                        )}
                      </div>
                    ))}
                    {fullPR.commitStatuses?.map((status: any) => (
                      <div key={status.id} className="bg-gray-800/50 rounded p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {status.state === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : status.state === 'failure' ? (
                            <XCircle className="w-4 h-4 text-red-400" />
                          ) : (
                            <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                          )}
                          <span className="text-sm text-gray-300">{status.context}</span>
                          <span className="text-xs text-gray-500">{status.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Reviews */}
              {fullPR.reviews && fullPR.reviews.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Reviews</h4>
                  <div className="space-y-3">
                    {fullPR.reviews.map((review: any) => (
                      <div key={review.id} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <img 
                            src={review.author.avatar} 
                            alt={review.author.login}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm font-medium text-gray-300">{review.author.login}</span>
                          <Badge 
                            variant="outline"
                            className={
                              review.state === 'APPROVED' 
                                ? 'text-green-400 border-green-400'
                                : review.state === 'CHANGES_REQUESTED'
                                ? 'text-red-400 border-red-400'
                                : 'text-gray-400'
                            }
                          >
                            {review.state.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-gray-500 ml-auto">
                            {formatDistanceToNow(new Date(review.submittedAt), { addSuffix: true })}
                          </span>
                        </div>
                        {review.body && (
                          <div className="text-sm text-gray-300 mt-2">
                            {review.body}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Changed with Diff Viewer */}
              {fullPR.files && fullPR.files.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">
                    Files Changed ({fullPR.changedFiles})
                  </h4>
                  <Tabs defaultValue="files" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="files">Files</TabsTrigger>
                      <TabsTrigger value="diff">Diff</TabsTrigger>
                    </TabsList>
                    <TabsContent value="files" className="mt-4">
                      <ScrollArea className="h-64 border border-gray-800 rounded">
                        <div className="divide-y divide-gray-800">
                          {fullPR.files.map((file: any) => (
                            <div
                              key={file.filename}
                              onClick={() => setSelectedFile(file.filename)}
                              className={`p-3 cursor-pointer hover:bg-gray-800/50 transition-colors ${
                                selectedFile === file.filename ? 'bg-gray-800/70' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileCode className="w-4 h-4 text-gray-400 shrink-0" />
                                  <span className="text-sm text-gray-300 truncate font-mono">
                                    {file.filename}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs shrink-0">
                                  <span className="text-green-400">+{file.additions}</span>
                                  <span className="text-red-400">-{file.deletions}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {file.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="diff" className="mt-4">
                      {selectedFile ? (
                        <DiffViewer 
                          patch={fullPR.files.find((f: any) => f.filename === selectedFile)?.patch}
                          filename={selectedFile}
                        />
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          Select a file to view diff
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Review Comments */}
              {fullPR.reviewComments && fullPR.reviewComments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">
                    Review Comments ({fullPR.reviewComments.length})
                  </h4>
                  <div className="space-y-3">
                    {fullPR.reviewComments.map((comment: any) => (
                      <div key={comment.id} className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <img 
                            src={comment.author.avatar} 
                            alt={comment.author.login}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm font-medium text-gray-300">{comment.author.login}</span>
                          <span className="text-xs text-gray-500 font-mono">
                            {comment.path}:{comment.line}
                          </span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {formatDistanceToNow(new Date(comment.created), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="text-sm text-gray-300 mt-2">
                          {comment.body}
                        </div>
                        {comment.diffHunk && (
                          <div className="mt-3 bg-gray-950 rounded p-3">
                            <pre className="text-xs font-mono text-gray-400 overflow-x-auto">
                              {comment.diffHunk}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Review */}
              {fullPR.state === 'open' && !fullPR.merged && (
                <div className="border-t border-gray-800 pt-6">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Submit Review</h4>
                  <Textarea
                    placeholder="Add a review comment..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="mb-3 bg-gray-800/50 border-gray-700"
                    rows={4}
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <Button
                        variant={reviewEvent === 'APPROVE' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setReviewEvent('APPROVE')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant={reviewEvent === 'REQUEST_CHANGES' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setReviewEvent('REQUEST_CHANGES')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Request Changes
                      </Button>
                      <Button
                        variant={reviewEvent === 'COMMENT' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setReviewEvent('COMMENT')}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Comment
                      </Button>
                    </div>
                    <Button 
                      onClick={handleSubmitReview}
                      disabled={addingReview || (!reviewComment.trim() && reviewEvent === 'COMMENT')}
                      size="sm"
                    >
                      {addingReview ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Submit Review
                    </Button>
                  </div>
                </div>
              )}

              {/* Merge Button */}
              {fullPR.state === 'open' && !fullPR.merged && fullPR.mergeable && (
                <div className="flex items-center gap-3 border-t border-gray-800 pt-4">
                  <Button 
                    onClick={handleMerge}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <GitMerge className="w-4 h-4 mr-2" />
                    Merge Pull Request
                  </Button>
                  {context.url && (
                    <Button variant="outline" asChild>
                      <a href={context.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open on GitHub
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

