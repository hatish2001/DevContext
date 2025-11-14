import { useEffect } from 'react'
import { CheckCircle, X, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AutoSyncNotificationProps {
  show: boolean
  itemsCount: number
  source: 'GitHub' | 'Jira' | 'Slack'
  onClose: () => void
}

export function AutoSyncNotification({ show, itemsCount, source, onClose }: AutoSyncNotificationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  const sourceColors = {
    GitHub: 'from-gray-800 to-gray-900 border-gray-700',
    Jira: 'from-blue-900/30 to-blue-950/30 border-blue-800',
    Slack: 'from-purple-900/30 to-purple-950/30 border-purple-800'
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div className={`bg-gradient-to-r ${sourceColors[source]} rounded-lg border p-4 shadow-2xl min-w-[320px]`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-900/30 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium">Auto-sync completed</h4>
                  <p className="text-sm text-gray-400">Successfully synced from {source}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-2xl font-bold">{itemsCount}</span>
                <span className="text-sm text-gray-400">new items</span>
              </div>
              <div className="flex-1 bg-gray-800/50 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-green-500 to-green-400"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
