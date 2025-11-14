import { GitCommit, Link2, Folder, Hash, User, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface EnhancedContextCardProps {
  context: {
    id: string
    source: string
    title: string
    content?: string
    url?: string | null
    metadata: any
    createdAt: Date | string
  }
  relatedCount?: number
}

export function EnhancedContextCard({ context, relatedCount }: EnhancedContextCardProps) {
  const enhanceTitle = (title: string, metadata: any) => {
    if (title === 'update' || title === 'Commit: update') {
      if (metadata?.branch && metadata.branch !== 'main') return `Update on ${metadata.branch}`
      if (metadata?.filesChanged) return `Updated ${metadata.filesChanged} file${metadata.filesChanged > 1 ? 's' : ''}`
      return 'Code update'
    }
    return title.replace(/^Commit:\s*/, '')
  }

  const additions = Number(context.metadata?.additions || 0)
  const deletions = Number(context.metadata?.deletions || 0)

  return (
    <div className="group relative bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-lg border border-gray-800 hover:border-purple-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-purple-900/20">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-purple-700 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-900/30 rounded-lg">
              <GitCommit className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Commit</span>
              {context.metadata?.sha && (
                <span className="text-xs text-purple-400 font-mono">{String(context.metadata.sha).substring(0, 7)}</span>
              )}
            </div>
          </div>
          {context.url && (
            <a href={context.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-800 rounded-lg">
              <Link2 className="w-4 h-4 text-gray-400" />
            </a>
          )}
        </div>

        <h3 className="font-medium text-gray-100 mb-2 group-hover:text-white transition-colors">
          {enhanceTitle(context.title, context.metadata)}
        </h3>

        {context.content && context.content !== context.title && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">{context.content}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {context.metadata?.repo && (
              <span className="flex items-center gap-1">
                <Folder className="w-3 h-3" />
                {String(context.metadata.repo).split('/').pop()}
              </span>
            )}
            {context.metadata?.branch && (
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {context.metadata.branch}
              </span>
            )}
            {context.metadata?.author && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {context.metadata.author}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {additions > 0 && (
              <span className="text-green-400 text-xs flex items-center gap-1"><span className="text-lg">+</span>{additions}</span>
            )}
            {deletions > 0 && (
              <span className="text-red-400 text-xs flex items-center gap-1"><span className="text-lg">-</span>{deletions}</span>
            )}
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(context.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {relatedCount && relatedCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-800/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Part of a larger feature</span>
              <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded-full">+{relatedCount} related</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



