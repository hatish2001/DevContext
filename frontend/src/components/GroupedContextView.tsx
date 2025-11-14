import { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Package, 
  GitCommit, 
  GitPullRequest, 
  Github, 
  Sparkles,
  ExternalLink,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Context {
  id: string;
  source: string;
  title: string;
  content: string;
  url: string | null;
  metadata: any;
  updatedAt: Date;
  createdAt: Date;
}

interface ContextGroup {
  id: string;
  title: string;
  contexts: Context[];
  similarity?: number;
}

interface GroupedContextViewProps {
  userId: string;
}

export function GroupedContextView({ userId }: GroupedContextViewProps) {
  const [groups, setGroups] = useState<ContextGroup[]>([]);
  const [ungrouped, setUngrouped] = useState<Context[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadGroups();
  }, [userId]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/groups?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setGroups(data.groups || []);
        setUngrouped(data.ungrouped || []);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateGroups = async () => {
    setGenerating(true);
    try {
      const response = await fetch('http://localhost:3000/api/groups/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '✨ AI Grouping Complete!',
          description: `Created ${data.count} intelligent groups`,
        });
        await loadGroups();
      }
    } catch (error) {
      console.error('Failed to generate groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate groups',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const getSourceIcon = (source: string) => {
    const iconClass = 'w-4 h-4';
    switch (source) {
      case 'github_pr': 
        return <GitPullRequest className={`${iconClass} text-green-500`} />;
      case 'github_commit': 
        return <GitCommit className={`${iconClass} text-purple-500`} />;
      case 'github_issue': 
        return <Github className={`${iconClass} text-blue-500`} />;
      case 'github_review': 
        return <MessageSquare className={`${iconClass} text-yellow-500`} />;
      default: 
        return <Github className={iconClass} />;
    }
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'github_pr': 'PR',
      'github_issue': 'Issue',
      'github_commit': 'Commit',
      'github_review': 'Review'
    };
    return labels[source] || source;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Empty State */}
      {groups.length === 0 && !generating && (
        <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardContent className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Context Grouping</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Let AI analyze your commits, PRs, and issues to automatically group related work together.
              See the big picture of your development activity.
            </p>
            <Button
              onClick={generateGroups}
              disabled={generating}
              size="lg"
              className="gap-2"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Smart Groups
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Cost: ~$0.006 per 100 contexts (less than 1 cent!)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      {groups.map((group) => (
        <Card key={group.id} className="overflow-hidden border-l-4 border-l-primary/50">
          {/* Group Header */}
          <button
            onClick={() => toggleGroup(group.id)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {expandedGroups.has(group.id) ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
              <Package className="w-5 h-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold text-foreground">{group.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {group.contexts.length} items
                  </Badge>
                  {group.similarity && (
                    <span className="text-xs">
                      {Math.round(group.similarity * 100)}% similar
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(group.contexts[0].updatedAt), { addSuffix: true })}
            </div>
          </button>

          {/* Expanded Group Contents */}
          {expandedGroups.has(group.id) && (
            <div className="border-t bg-card/50">
              {group.contexts.map((context, index) => (
                <div
                  key={context.id}
                  className={`px-10 py-3 flex items-start gap-3 hover:bg-accent/30 transition-colors ${
                    index !== group.contexts.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <div className="mt-0.5">{getSourceIcon(context.source)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground line-clamp-1">
                          {context.title}
                        </div>
                        {context.content && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {context.content}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {getSourceLabel(context.source)}
                          </Badge>
                          {context.metadata?.repo && (
                            <span className="truncate">{context.metadata.repo}</span>
                          )}
                          {context.metadata?.author && (
                            <span>@{context.metadata.author}</span>
                          )}
                          <span className="ml-auto">
                            {formatDistanceToNow(new Date(context.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      {context.url && (
                        <a
                          href={context.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      {/* Ungrouped Items */}
      {ungrouped.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground text-center">
              {ungrouped.length} item{ungrouped.length !== 1 ? 's' : ''} don't fit into any group
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regenerate Button */}
      {groups.length > 0 && (
        <Button
          onClick={generateGroups}
          disabled={generating}
          variant="outline"
          className="w-full gap-2"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Regenerate Groups
            </>
          )}
        </Button>
      )}
    </div>
  );
}

