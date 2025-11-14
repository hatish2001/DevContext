import { useState, useEffect } from 'react'
import { 
  MessageSquare, ChevronDown, ChevronUp, User, Hash, 
  Paperclip, Send, Loader2, ExternalLink, AtSign, Image as ImageIcon
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ExpandableSlackCardProps {
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

export function ExpandableSlackCard({ context, userId, onUpdate }: ExpandableSlackCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullMessage, setFullMessage] = useState<any>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const { toast } = useToast()

  const meta = context.metadata || {}
  const channelId = meta.channel?.id || meta.channelId
  const messageTs = meta.message?.ts || meta.timestamp

  const loadFullMessage = async () => {
    if (fullMessage || loading || !channelId || !messageTs) return
    
    setLoading(true)
    try {
      const message = await api.getSlackMessageFull(channelId, messageTs, userId)
      setFullMessage(message)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load message details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExpand = () => {
    if (!expanded) {
      loadFullMessage()
    }
    setExpanded(!expanded)
  }

  const handleReply = async () => {
    if (!replyText.trim() || !channelId || !messageTs) return
    
    setReplying(true)
    try {
      // Use thread_ts if available, otherwise use message ts to create thread
      const threadTs = fullMessage?.thread_ts || fullMessage?.ts || messageTs
      await api.replyToSlackMessage(channelId, threadTs, userId, replyText)
      toast({ title: 'Success', description: 'Reply sent successfully' })
      setReplyText('')
      await loadFullMessage() // Reload to get new reply
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reply',
        variant: 'destructive'
      })
    } finally {
      setReplying(false)
    }
  }

  const formatSlackText = (text: string) => {
    // Simple formatting for Slack markdown
    // Replace @mentions
    let formatted = text.replace(/<@([A-Z0-9]+)>/g, '<span class="text-blue-400 font-medium">@user</span>')
    // Replace #channels
    formatted = formatted.replace(/<#([A-Z0-9]+)\|([^>]+)>/g, '<span class="text-purple-400">#$2</span>')
    // Replace links
    formatted = formatted.replace(/<([^|>]+)\|([^>]+)>/g, '<a href="$1" class="text-blue-400 hover:underline">$2</a>')
    formatted = formatted.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1" class="text-blue-400 hover:underline">$1</a>')
    // Replace bold
    formatted = formatted.replace(/\*([^*]+)\*/g, '<strong class="font-semibold">$1</strong>')
    // Replace italic
    formatted = formatted.replace(/_([^_]+)_/g, '<em class="italic">$1</em>')
    // Replace code blocks
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    
    return formatted
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 hover:border-purple-800/50 transition-all overflow-hidden">
      {/* Collapsed Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={handleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xs px-2 py-1 rounded bg-purple-900/30 text-purple-400 flex items-center gap-1 font-medium shrink-0">
              <MessageSquare className="w-4 h-4" /> Slack
            </span>
            {meta.channel?.name && (
              <span className="text-sm text-purple-400 shrink-0 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {meta.channel.name}
              </span>
            )}
            {meta.author?.real_name && (
              <span className="text-sm text-gray-400 shrink-0">
                {meta.author.real_name}
              </span>
            )}
            <h3 className="text-base font-semibold text-gray-100 truncate flex-1">
              {context.title.replace(/^Slack:\s*[^-\s]+-\s*/, '')}
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
          {meta.message?.reply_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {meta.message.reply_count} replies
            </span>
          )}
          {meta.files && meta.files.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {meta.files.length} file{meta.files.length > 1 ? 's' : ''}
            </span>
          )}
          {meta.mentions && meta.mentions.length > 0 && (
            <span className="flex items-center gap-1 text-yellow-400">
              <AtSign className="w-3 h-3" />
              {meta.mentions.length} mention{meta.mentions.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            {formatDistanceToNow(new Date(context.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-800 p-6 space-y-6">
          {loading && !fullMessage ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : fullMessage ? (
            <>
              {/* Main Message */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  {fullMessage.author?.image_48 && (
                    <img 
                      src={fullMessage.author.image_48} 
                      alt={fullMessage.author.real_name || fullMessage.author.name}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-200">
                        {fullMessage.author?.real_name || fullMessage.author?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(parseFloat(fullMessage.ts) * 1000), { addSuffix: true })}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-gray-300 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: formatSlackText(fullMessage.text || '') }}
                    />
                  </div>
                </div>

                {/* Files */}
                {fullMessage.files && fullMessage.files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {fullMessage.files.map((file: any) => (
                      <div key={file.id} className="bg-gray-950 rounded border border-gray-700 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {file.thumb_64 || file.mimetype?.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Paperclip className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-sm text-gray-300 font-medium">{file.name || file.title}</span>
                          {file.size && (
                            <span className="text-xs text-gray-500 ml-auto">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                        {file.thumb_360 && (
                          <img 
                            src={file.thumb_360} 
                            alt={file.name}
                            className="max-w-full rounded border border-gray-700"
                          />
                        )}
                        {file.permalink && (
                          <a 
                            href={file.permalink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                          >
                            View file
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                {fullMessage.reactions && fullMessage.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {fullMessage.reactions.map((reaction: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        :{reaction.name}: {reaction.count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Thread Replies */}
              {fullMessage.threadReplies && fullMessage.threadReplies.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">
                    Thread Replies ({fullMessage.threadReplies.length})
                  </h4>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-3 pl-6 border-l-2 border-gray-800">
                      {fullMessage.threadReplies.map((reply: any, idx: number) => (
                        <div key={idx} className="bg-gray-800/50 rounded-lg p-3">
                          <div className="flex items-start gap-2 mb-2">
                            {reply.author?.image_48 && (
                              <img 
                                src={reply.author.image_48} 
                                alt={reply.author.real_name || reply.author.name}
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-300">
                                  {reply.author?.real_name || reply.author?.name || 'Unknown'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(parseFloat(reply.ts) * 1000), { addSuffix: true })}
                                </span>
                              </div>
                              <div 
                                className="text-sm text-gray-300 whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: formatSlackText(reply.text || '') }}
                              />
                              {reply.files && reply.files.length > 0 && (
                                <div className="mt-2 flex gap-2">
                                  {reply.files.map((file: any, fileIdx: number) => (
                                    file.thumb_64 ? (
                                      <img 
                                        key={fileIdx}
                                        src={file.thumb_64} 
                                        alt={file.name}
                                        className="w-16 h-16 rounded border border-gray-700"
                                      />
                                    ) : (
                                      <div key={fileIdx} className="flex items-center gap-1 text-xs text-gray-500">
                                        <Paperclip className="w-3 h-3" />
                                        {file.name}
                                      </div>
                                    )
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Reply Box */}
              <div className="border-t border-gray-800 pt-4">
                <Textarea
                  placeholder="Reply in thread..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="mb-2 bg-gray-800/50 border-gray-700"
                  rows={3}
                />
                <Button 
                  onClick={handleReply}
                  disabled={replying || !replyText.trim()}
                  size="sm"
                >
                  {replying ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Reply
                </Button>
              </div>

              {/* Actions */}
              {context.url && (
                <div className="flex items-center gap-2 border-t border-gray-800 pt-4">
                  <Button variant="outline" size="sm" asChild>
                    <a href={context.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in Slack
                    </a>
                  </Button>
                </div>
              )}
            </>
          ) : (
            // Fallback to metadata if full message not loaded
            <>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div 
                  className="text-sm text-gray-300 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatSlackText(context.content) }}
                />
              </div>
              {meta.files && meta.files.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Files</h4>
                  <div className="space-y-2">
                    {meta.files.map((file: any, idx: number) => (
                      <div key={idx} className="bg-gray-800/50 rounded p-2 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">{file.name || file.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

