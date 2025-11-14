export function ContextSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-muted rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="flex gap-4 mt-3">
              <div className="h-3 bg-muted rounded w-20"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
              <div className="h-3 bg-muted rounded w-28"></div>
            </div>
          </div>
          <div className="w-5 h-5 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function ContextListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <ContextSkeleton key={i} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse bg-card rounded-lg p-6 border border-border">
      <div className="space-y-4">
        <div className="h-6 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
        <div className="flex gap-2 mt-4">
          <div className="h-8 bg-muted rounded w-20"></div>
          <div className="h-8 bg-muted rounded w-24"></div>
        </div>
      </div>
    </div>
  );
}





