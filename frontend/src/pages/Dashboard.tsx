import { useEffect, useState, useCallback } from 'react';
import { 
  Github, 
  GitPullRequest, 
  GitCommit, 
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  List,
  Sparkles,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAutoSync } from '@/hooks/useAutoSync';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { SearchBar } from '@/components/SearchBar';
import { GroupedContextView } from '@/components/GroupedContextView';
import { EnhancedContextCard } from '@/components/EnhancedContextCard';
import { EmptyState, ContextSkeleton } from '@/components/EmptyState';
import { AISummaryWidget } from '@/components/AISummaryWidget';
import { JiraMiniCard } from '@/components/JiraMiniCard';
import { JiraDetailCard } from '@/components/JiraDetailCard';
import { ExpandableJiraCard } from '@/components/ExpandableJiraCard';
import { ExpandablePRCard } from '@/components/ExpandablePRCard';
import { ExpandableSlackCard } from '@/components/ExpandableSlackCard';
import { JiraKanbanBoard } from '@/components/JiraKanbanBoard';

interface Context {
  id: string;
  userId: string;
  source: string;
  sourceId: string;
  title: string;
  content: string;
  url: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

interface Stats {
  total: number;
  bySource: Record<string, number>;
  lastSync: string | null;
}

export function DashboardPage() {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [sourceTab, setSourceTab] = useState<'all' | 'github' | 'jira' | 'slack'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [jiraViewMode, setJiraViewMode] = useState<'list' | 'board'>('list');
  const [, setCurrentTime] = useState(new Date()); // Triggers re-renders for relative time updates
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get userId from localStorage (set during OAuth callback)
  const userId = localStorage.getItem('userId');

  // Add auto-sync
  const { syncing: autoSyncing, lastSync: autoSyncTime } = useAutoSync(userId, true);
  const [hasAutoSyncedOnMount, setHasAutoSyncedOnMount] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contextData, statsData] = await Promise.all([
        api.getContexts(userId!, { source: filter || undefined }),
        api.getStats(userId!)
      ]);
      
      setContexts(contextData.contexts);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-sync all connected integrations
  const handleAutoSyncAll = useCallback(async () => {
    if (!userId || hasAutoSyncedOnMount) return;
    
    try {
      setHasAutoSyncedOnMount(true);
      const integrations = await api.getIntegrations();
      
      // Sync GitHub if connected
      if (integrations.github) {
        try {
          await api.syncGitHub(userId);
          console.log('✅ GitHub auto-synced on login');
        } catch (e) {
          console.error('GitHub auto-sync failed:', e);
        }
      }
      
      // Sync Jira if connected
      if (integrations.jira) {
        try {
          await api.syncJira(userId);
          console.log('✅ Jira auto-synced on login');
        } catch (e) {
          console.error('Jira auto-sync failed:', e);
        }
      }
      
      // Sync Slack if connected
      if (integrations.slack) {
        try {
          await api.syncSlack(userId);
          console.log('✅ Slack auto-synced on login');
        } catch (e) {
          console.error('Slack auto-sync failed:', e);
        }
      }
      
      // Reload data after sync
      const [contextData, statsData] = await Promise.all([
        api.getContexts(userId, { source: filter || undefined }),
        api.getStats(userId)
      ]);
      setContexts(contextData.contexts);
      setStats(statsData);
    } catch (e) {
      console.error('Auto-sync error:', e);
      setHasAutoSyncedOnMount(false); // Reset to allow retry
    }
  }, [userId, hasAutoSyncedOnMount, filter]);

  // Handle OAuth callback params
  useEffect(() => {
    const jira = searchParams.get('jira');
    if (jira === 'connected') {
      toast({ title: 'Jira connected!', description: 'Your Jira integration is ready.' });
      navigate('/', { replace: true });
      // Trigger sync after connection
      if (userId) {
        handleAutoSyncAll();
      }
    } else if (jira === 'error') {
      toast({ title: 'Jira connection failed', description: 'Could not connect to Jira. Please try again.', variant: 'destructive' });
      navigate('/', { replace: true });
    }
    
    const slack = searchParams.get('slack');
    if (slack === 'connected') {
      toast({ title: 'Slack connected!', description: 'Your Slack integration is ready.' });
      navigate('/', { replace: true });
      // Trigger sync after connection
      if (userId) {
        handleAutoSyncAll();
      }
    } else if (slack === 'error') {
      toast({ title: 'Slack connection failed', description: 'Could not connect to Slack. Please try again.', variant: 'destructive' });
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate, toast, userId, handleAutoSyncAll]);

  // Auto-sync on mount if user just logged in
  useEffect(() => {
    if (userId && !hasAutoSyncedOnMount) {
      // Small delay to ensure everything is loaded
      const timer = setTimeout(() => {
        handleAutoSyncAll();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userId, hasAutoSyncedOnMount, handleAutoSyncAll]);

  // Update current time every minute to refresh relative timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, filter]);

  // Reload data after auto-sync completes
  useEffect(() => {
    if (autoSyncTime && userId) {
      loadData();
    }
  }, [autoSyncTime]);

  // Listen for sync events from command palette
  useEffect(() => {
    const handleSyncEvent = () => {
      handleSync();
    };

    window.addEventListener('sync-github', handleSyncEvent);
    return () => window.removeEventListener('sync-github', handleSyncEvent);
  }, [userId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.syncGitHub(userId!);
      toast({
        title: 'Success',
        description: `Synced ${result.stats.total} items from GitHub`
      });
      await loadData(); // Reload after sync
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync GitHub data',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  const getSourceIcon = (source: string) => {
    const iconClass = 'h-4 w-4';
    const icons: Record<string, JSX.Element> = {
      'github_pr': <GitPullRequest className={`${iconClass} text-green-500`} />,
      'github_issue': <Github className={`${iconClass} text-blue-500`} />,
      'github_commit': <GitCommit className={`${iconClass} text-purple-500`} />,
      'github_review': <MessageSquare className={`${iconClass} text-yellow-500`} />
    };
    return icons[source] || <Github className={iconClass} />;
  };

  const getStateIcon = (state: string) => {
    const iconClass = 'h-4 w-4';
    switch (state) {
      case 'open':
        return <AlertCircle className={`${iconClass} text-green-500`} />;
      case 'closed':
        return <CheckCircle className={`${iconClass} text-purple-500`} />;
      case 'merged':
        return <CheckCircle className={`${iconClass} text-blue-500`} />;
      default:
        return <AlertCircle className={`${iconClass} text-gray-500`} />;
    }
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'github_pr': 'Pull Requests',
      'github_issue': 'Issues',
      'github_commit': 'Commits',
      'github_review': 'Reviews'
    };
    return labels[source] || source;
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view your dashboard</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-4">DevContext</h2>
            
            {/* Auto-sync indicator */}
            {autoSyncing && (
              <div className="mb-2 px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 text-xs text-blue-500">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Auto-syncing...
                </div>
              </div>
            )}

            {/* Sync Button */}
            <Button
              onClick={handleSync}
              disabled={syncing || autoSyncing}
              className="w-full"
              variant="default"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync GitHub'}
            </Button>
          </div>

          {/* Stats */}
          {stats && (
            <Card>
              <CardHeader className="p-4">
                <CardDescription className="text-xs">Total Contexts</CardDescription>
                <CardTitle className="text-2xl">{stats.total}</CardTitle>
                {(autoSyncTime || stats.lastSync) && (
                  <CardDescription className="text-xs mt-2">
                    Last sync: {formatDistanceToNow(
                      autoSyncTime || new Date(stats.lastSync!), 
                      { addSuffix: true }
                    )}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          )}

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-1">
            <Button
              onClick={() => navigate('/groups')}
              variant="outline"
              className="w-full justify-start"
            >
              <Layers className="mr-2 h-4 w-4" />
              Manage Groups
            </Button>
            <Button
              onClick={() => navigate('/integrations')}
              variant="outline"
              className="w-full justify-start"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Integrations
            </Button>
          </div>

          <Separator />

          {/* AI Summary */}
          <div className="mt-4">
            <AISummaryWidget />
          </div>

          {/* Filters */}
          <nav className="space-y-1">
            <Button
              variant={!filter ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setFilter(null)}
            >
              <FileText className="mr-2 h-4 w-4" />
              All Contexts
              {stats && <Badge variant="outline" className="ml-auto">{stats.total}</Badge>}
            </Button>
            
            <Button
              variant={filter === 'github_pr' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setFilter('github_pr')}
            >
              <GitPullRequest className="mr-2 h-4 w-4 text-green-500" />
              Pull Requests
              {stats && <Badge variant="outline" className="ml-auto">{stats.bySource?.github_pr || 0}</Badge>}
            </Button>
            
            <Button
              variant={filter === 'github_issue' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setFilter('github_issue')}
            >
              <Github className="mr-2 h-4 w-4 text-blue-500" />
              Issues
              {stats && <Badge variant="outline" className="ml-auto">{stats.bySource?.github_issue || 0}</Badge>}
            </Button>
            
            <Button
              variant={filter === 'github_commit' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setFilter('github_commit')}
            >
              <GitCommit className="mr-2 h-4 w-4 text-purple-500" />
              Commits
              {stats && <Badge variant="outline" className="ml-auto">{stats.bySource?.github_commit || 0}</Badge>}
            </Button>

            <Button
              variant={filter === 'github_review' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setFilter('github_review')}
            >
              <MessageSquare className="mr-2 h-4 w-4 text-yellow-500" />
              Reviews
              {stats && <Badge variant="outline" className="ml-auto">{stats.bySource?.github_review || 0}</Badge>}
            </Button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 max-w-5xl mx-auto">
            {/* Search Bar */}
            <div className="mb-6">
              <SearchBar 
                userId={userId!} 
                onSelectResult={(result) => {
                  console.log('Selected:', result);
                }}
              />
            </div>

            {/* Header with View Toggle and Source Tabs */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Your Development Context</h1>
                <p className="text-muted-foreground">
                  {filter ? `Showing ${getSourceLabel(filter)}` : 'All your development activity'}
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-card border rounded-lg p-1">
                {sourceTab === 'jira' ? (
                  <>
                    <Button
                      onClick={() => setJiraViewMode('list')}
                      variant={jiraViewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <List className="w-4 h-4" />
                      List
                    </Button>
                    <Button
                      onClick={() => setJiraViewMode('board')}
                      variant={jiraViewMode === 'board' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Board
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setViewMode('list')}
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <List className="w-4 h-4" />
                      List
                    </Button>
                    <Button
                      onClick={() => setViewMode('grouped')}
                      variant={viewMode === 'grouped' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Groups
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Source Tabs */}
            <div className="mb-4 flex items-center gap-2 bg-card border rounded-lg p-1 w-fit">
              {(['all','github','jira','slack'] as const).map(tab => (
                <Button key={tab} size="sm" variant={sourceTab === tab ? 'secondary' : 'ghost'} onClick={() => setSourceTab(tab)} className="capitalize">
                  {tab}
                </Button>
              ))}
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <ContextSkeleton key={i} />
                ))}
              </div>
            ) : contexts.length === 0 ? (
              <EmptyState type={filter ? 'no-results' : 'no-data'} />
            ) : viewMode === 'grouped' ? (
              // AI Grouped View
              <GroupedContextView userId={userId!} />
            ) : sourceTab === 'jira' && jiraViewMode === 'board' ? (
              // Jira Kanban Board View
              <div className="h-[calc(100vh-300px)]">
                <JiraKanbanBoard
                  issues={contexts.filter(c => String(c.source).startsWith('jira')) as any}
                  userId={userId!}
                  onUpdate={loadData}
                />
              </div>
            ) : (
              // List View
              <div className="space-y-6">
                {sourceTab === 'all' ? (
                  // Group by source prefix
                  ['github', 'jira', 'slack'].map(src => {
                    const items = contexts.filter(c => String(c.source).startsWith(src))
                    if (items.length === 0) return null
                    return (
                      <div key={src}>
                        <div className="sticky top-0 z-10 bg-background/60 backdrop-blur border-b border-gray-800 py-1 mb-2">
                          <span className="text-xs uppercase tracking-wide text-gray-500">{src} • {items.length}</span>
                        </div>
                        <div className="space-y-3">
                          {items.map(context => (
                            String(context.source).startsWith('github') ? (
                              context.source === 'github_pr' ? (
                                <ExpandablePRCard 
                                  key={context.id} 
                                  context={context as any} 
                                  userId={userId!}
                                  onUpdate={loadData}
                                />
                              ) : (
                                <EnhancedContextCard key={context.id} context={context as any} />
                              )
                            ) : String(context.source).startsWith('jira') ? (
                              <ExpandableJiraCard 
                                key={context.id} 
                                context={context as any} 
                                userId={userId!}
                                onUpdate={loadData}
                              />
                            ) : String(context.source).startsWith('slack') ? (
                              <ExpandableSlackCard 
                                key={context.id} 
                                context={context as any} 
                                userId={userId!}
                                onUpdate={loadData}
                              />
                            ) : null
                          ))}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="space-y-3">
                    {contexts.filter(c => sourceTab === 'all' ? true : String(c.source).startsWith(sourceTab)).map(context => (
                      String(context.source).startsWith('github') ? (
                        context.source === 'github_pr' ? (
                          <ExpandablePRCard 
                            key={context.id} 
                            context={context as any} 
                            userId={userId!}
                            onUpdate={loadData}
                          />
                        ) : (
                          <EnhancedContextCard key={context.id} context={context as any} />
                        )
                      ) : String(context.source).startsWith('jira') ? (
                        <ExpandableJiraCard 
                          key={context.id} 
                          context={context as any} 
                          userId={userId!}
                          onUpdate={loadData}
                        />
                      ) : String(context.source).startsWith('slack') ? (
                        <ExpandableSlackCard 
                          key={context.id} 
                          context={context as any} 
                          userId={userId!}
                          onUpdate={loadData}
                        />
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
