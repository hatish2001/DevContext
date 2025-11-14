import { Inbox, ArrowRight, Sparkles } from 'lucide-react'

export function EmptyState({ type }: { type: 'no-data' | 'no-results' | 'error' }) {
  if (type === 'no-data') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-gray-800/30 rounded-full mb-4">
          <Inbox className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium mb-2">No contexts yet</h3>
        <p className="text-gray-400 text-center mb-6 max-w-md">
          Start by syncing your GitHub data to see your development activity here
        </p>
        <button className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium flex items-center gap-2 transition-colors">
          Sync GitHub
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-gray-800/30 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium mb-2">No results found</h3>
        <p className="text-gray-400 text-center max-w-md">
          Try adjusting your filters or search query
        </p>
      </div>
    )
  }

  return null
}

export function ContextSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-800 rounded-lg" />
          <div className="w-20 h-4 bg-gray-800 rounded" />
        </div>
        <div className="w-4 h-4 bg-gray-800 rounded" />
      </div>
      <div className="w-3/4 h-5 bg-gray-800 rounded mb-2" />
      <div className="w-full h-4 bg-gray-800 rounded mb-3" />
      <div className="flex items-center gap-3">
        <div className="w-24 h-3 bg-gray-800 rounded" />
        <div className="w-20 h-3 bg-gray-800 rounded" />
        <div className="w-16 h-3 bg-gray-800 rounded" />
      </div>
    </div>
  )
}

