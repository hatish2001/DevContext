import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Context {
  id: string
  source: 'github' | 'jira' | 'slack'
  sourceId: string
  title: string
  preview: string
  timestamp: string
  icon: LucideIcon
  metadata?: any
}

interface ContextCardProps {
  context: Context
  className?: string
}

export function ContextCard({ context, className }: ContextCardProps) {
  const Icon = context.icon

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'github':
        return 'bg-[#333] hover:bg-[#444]'
      case 'jira':
        return 'bg-[#0052CC] hover:bg-[#0065FF]'
      case 'slack':
        return 'bg-[#4A154B] hover:bg-[#611f69]'
      default:
        return 'bg-primary hover:bg-primary/90'
    }
  }

  return (
    <Card className={cn(
      "p-4 hover:shadow-md transition-all duration-200 cursor-pointer group",
      className
    )}>
      <div className="flex gap-4">
        {/* Source Icon */}
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
          getSourceColor(context.source)
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {context.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {context.preview}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {context.sourceId}
            </Badge>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              {context.timestamp}
            </span>
            
            {/* Metadata badges */}
            {context.metadata && (
              <div className="flex gap-2">
                {context.metadata.priority && (
                  <Badge
                    variant={context.metadata.priority === 'high' ? 'destructive' : 'outline'}
                    className="text-xs"
                  >
                    {context.metadata.priority}
                  </Badge>
                )}
                {context.metadata.status && (
                  <Badge variant="outline" className="text-xs">
                    {context.metadata.status}
                  </Badge>
                )}
                {context.metadata.replies && (
                  <Badge variant="outline" className="text-xs">
                    {context.metadata.replies} replies
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
