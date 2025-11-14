import { Code2, Clock, CheckCircle, AlertCircle, User, Tag, AlertTriangle, ExternalLink, Calendar, Flag, Folder, Layers, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface JiraDetailCardProps {
  context: {
    id: string
    title: string
    content: string
    url?: string | null
    metadata: any
    updatedAt: Date | string
  }
}

export function JiraDetailCard({ context }: JiraDetailCardProps) {
  const getStatusColor = (status?: string) => {
    if (!status) return 'text-gray-400'
    const s = status.toLowerCase()
    if (s.includes('done') || s.includes('resolved') || s.includes('closed')) return 'text-green-400'
    if (s.includes('progress') || s.includes('in progress')) return 'text-yellow-400'
    if (s.includes('blocked') || s.includes('block')) return 'text-red-400'
    return 'text-blue-400'
  }

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'bg-gray-700'
    const p = priority.toLowerCase()
    if (p.includes('critical') || p.includes('highest')) return 'bg-red-900'
    if (p.includes('high')) return 'bg-orange-900'
    if (p.includes('medium')) return 'bg-yellow-900'
    if (p.includes('low')) return 'bg-green-900'
    return 'bg-gray-700'
  }

  const statusIcon = (status?: string) => {
    if (!status) return null
    const s = status.toLowerCase()
    if (s.includes('done')) return <CheckCircle className="w-4 h-4 text-green-400" />
    if (s.includes('progress')) return <AlertCircle className="w-4 h-4 text-yellow-400" />
    if (s.includes('block')) return <AlertTriangle className="w-4 h-4 text-red-400" />
    return <Clock className="w-4 h-4 text-gray-400" />
  }

  const meta = context.metadata || {}

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-800/50 transition-all p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-1 rounded bg-blue-900/30 text-blue-400 flex items-center gap-1 font-medium">
            <Code2 className="w-4 h-4" /> Jira
          </span>
          {meta.key && (
            <span className="text-sm font-mono text-blue-400">{meta.key}</span>
          )}
          {meta.status && (
            <span className={`flex items-center gap-1 text-sm font-medium ${getStatusColor(meta.status)}`}>
              {statusIcon(meta.status)}
              {meta.status}
            </span>
          )}
        </div>
        {context.url && (
          <a 
            href={context.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-100 mb-3">
        {String(context.title).replace(/^\w+-\d+\s*:\s*/, '')}
      </h3>

      {/* Description */}
      {context.content && (
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4 text-sm text-gray-300 whitespace-pre-wrap">
          {context.content}
        </div>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {meta.type && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Tag className="w-4 h-4" />
            <span className="text-gray-300">{meta.type}</span>
          </div>
        )}
        
        {meta.priority && (
          <div className="flex items-center gap-2 text-sm">
            <Flag className="w-4 h-4 text-gray-400" />
            <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(meta.priority)}`}>
              {meta.priority}
            </span>
          </div>
        )}
        
        {meta.assignee && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <User className="w-4 h-4" />
            <span className="text-gray-300">{meta.assignee}</span>
          </div>
        )}
        
        {meta.reporter && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <FileText className="w-4 h-4" />
            <span className="text-gray-300">{meta.reporter}</span>
          </div>
        )}
        
        {meta.projectName && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Folder className="w-4 h-4" />
            <span className="text-gray-300">{meta.projectName}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-gray-300">
            {formatDistanceToNow(new Date(context.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Labels */}
      {meta.labels && Array.isArray(meta.labels) && meta.labels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {meta.labels.map((label: string, idx: number) => (
            <span 
              key={idx}
              className="text-xs px-2 py-0.5 rounded bg-blue-900/20 text-blue-400 border border-blue-900/30"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Components */}
      {meta.components && Array.isArray(meta.components) && meta.components.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Layers className="w-3 h-3" />
            Components
          </div>
          <div className="flex flex-wrap gap-2">
            {meta.components.map((comp: any, idx: number) => (
              <span 
                key={idx}
                className="text-xs px-2 py-0.5 rounded bg-purple-900/20 text-purple-400"
              >
                {comp.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fix Versions */}
      {meta.fixVersions && Array.isArray(meta.fixVersions) && meta.fixVersions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Calendar className="w-3 h-3" />
            Fix Versions
          </div>
          <div className="flex flex-wrap gap-2">
            {meta.fixVersions.map((version: any, idx: number) => (
              <span 
                key={idx}
                className="text-xs px-2 py-0.5 rounded bg-cyan-900/20 text-cyan-400"
              >
                {version.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resolution */}
      {meta.resolution && (
        <div className="flex items-center gap-2 text-sm text-gray-400 pt-3 border-t border-gray-800">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-gray-300">Resolution: {meta.resolution}</span>
        </div>
      )}

      {/* Timestamps */}
      {meta.created || meta.resolved ? (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-3 border-t border-gray-800 mt-3">
          {meta.created && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created: {new Date(meta.created).toLocaleDateString()}
            </span>
          )}
          {meta.resolved && (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Resolved: {new Date(meta.resolved).toLocaleDateString()}
            </span>
          )}
        </div>
      ) : null}
    </div>
  )
}



