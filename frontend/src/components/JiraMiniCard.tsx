import { Code2, Clock, CheckCircle, AlertCircle, User, Tag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface JiraMiniCardProps {
  context: {
    id: string
    title: string
    url?: string | null
    metadata: any
    updatedAt: Date | string
  }
}

export function JiraMiniCard({ context }: JiraMiniCardProps) {
  const statusIcon = (status?: string) => {
    if (!status) return null
    if (status.toLowerCase().includes('done')) return <CheckCircle className="w-3 h-3 text-green-400" />
    if (status.toLowerCase().includes('progress')) return <AlertCircle className="w-3 h-3 text-yellow-400" />
    return <Clock className="w-3 h-3 text-gray-400" />
  }

  const meta = context.metadata || {}

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-800/50 transition-all p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 flex items-center gap-1">
            <Code2 className="w-3 h-3" /> Jira
          </span>
          {meta.key && (
            <span className="text-xs text-gray-400">{meta.key}</span>
          )}
        </div>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(context.updatedAt), { addSuffix: true })}
        </span>
      </div>

      <a 
        href={context.url || '#'} 
        target="_blank" 
        rel="noopener noreferrer"
        className="font-medium text-gray-100 mb-2 hover:text-blue-400 transition-colors cursor-pointer block"
      >
        {String(context.title).replace(/^\w+-\d+\s*:\s*/, '')}
      </a>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        {meta.type && (
          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{meta.type}</span>
        )}
        {meta.status && (
          <span className="flex items-center gap-1">{statusIcon(meta.status)}{meta.status}</span>
        )}
        {meta.assignee && (
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{meta.assignee}</span>
        )}
      </div>
    </div>
  )
}



