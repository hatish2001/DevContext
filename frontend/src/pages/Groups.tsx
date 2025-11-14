import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Layers, Plus, X, MoveRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Context {
  id: string;
  title: string;
  source: string;
  sourceId: string;
  content: string;
  url: string | null;
  metadata?: {
    repo?: string;
    author?: string;
    groupId?: string;
    groupTitle?: string;
  };
}

interface Group {
  id: string;
  title: string;
  contexts: Context[];
}

interface GroupData {
  groups: Group[];
  ungrouped: Context[];
  ungroupedCount: number;
}

export function GroupsPage() {
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [movingContext, setMovingContext] = useState<string | null>(null);
  const { toast } = useToast();

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (userId) {
      loadGroups();
    }
  }, [userId]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/groups?userId=${userId}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) throw new Error('Failed to load groups');
      
      const data = await response.json();
      setGroupData(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAIGroups = async () => {
    setGenerating(true);
    try {
      const response = await fetch('http://localhost:3000/api/groups/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error('Failed to generate groups');

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: `Generated ${result.count} AI-powered groups`,
      });

      await loadGroups();
    } catch (error) {
      console.error('Failed to generate groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI groups',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to manage groups</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Layers className="w-8 h-8" />
              Context Groups
            </h1>
            <p className="text-muted-foreground mt-2">
              Organize your development contexts into meaningful groups
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={loadGroups}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              onClick={generateAIGroups}
              disabled={generating}
              className="gap-2"
            >
              <Sparkles className={`w-4 h-4 ${generating ? 'animate-pulse' : ''}`} />
              {generating ? 'Generating...' : 'Generate AI Groups'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Groups</CardDescription>
            <CardTitle className="text-3xl">
              {groupData?.groups.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Grouped Contexts</CardDescription>
            <CardTitle className="text-3xl">
              {groupData?.groups.reduce((acc, g) => acc + g.contexts.length, 0) || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ungrouped Contexts</CardDescription>
            <CardTitle className="text-3xl">
              {groupData?.ungroupedCount || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Existing Groups First */}
      {groupData && groupData.groups.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold">Your Groups</h2>
          {groupData.groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{group.title}</span>
                  <Badge variant="secondary">{group.contexts.length} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.contexts.map((context) => (
                    <div
                      key={context.id}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{context.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {context.source}
                          </Badge>
                          {context.metadata?.repo && (
                            <span>{context.metadata.repo}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              `http://localhost:3000/api/groups/${group.id}/remove-context/${context.id}`,
                              { method: 'DELETE', credentials: 'include' }
                            );
                            if (response.ok) {
                              loadGroups();
                              toast({ title: 'Success', description: 'Context removed from group' });
                            }
                          } catch (error) {
                            toast({ title: 'Error', description: 'Failed to remove context', variant: 'destructive' });
                          }
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ungrouped Contexts in Dotted Scrollable Container */}
      {groupData && groupData.ungrouped.length > 0 ? (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ungrouped Contexts ({groupData.ungroupedCount})</CardTitle>
              <Button
                onClick={async () => {
                  const selectedContexts = Array.from(
                    document.querySelectorAll('input[type="checkbox"]:checked')
                  ).map((input: any) => input.value);
                  
                  if (selectedContexts.length < 1) {
                    toast({ title: 'Info', description: 'Select at least 1 context', variant: 'default' });
                    return;
                  }
                  
                  const title = prompt('Enter group title:');
                  if (!title) return;
                  
                  try {
                    const response = await fetch('http://localhost:3000/api/groups/manual/create', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        userId,
                        title,
                        contextIds: selectedContexts,
                      }),
                    });
                    
                    if (response.ok) {
                      loadGroups();
                      toast({ title: 'Success', description: 'Group created' });
                    }
                  } catch (error) {
                    toast({ title: 'Error', description: 'Failed to create group', variant: 'destructive' });
                  }
                }}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
            <CardDescription>
              Select contexts and click "Create Group" to organize them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              {groupData.ungrouped.map((context) => (
                <div
                  key={context.id}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <input
                    type="checkbox"
                    value={context.id}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{context.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {context.source}
                      </Badge>
                      {context.metadata?.repo && (
                        <span>{context.metadata.repo}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Move to Group Button */}
                  {groupData.groups.length > 0 && (
                    <Dialog
                      open={movingContext === context.id}
                      onOpenChange={(open) => setMovingContext(open ? context.id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" title="Move to group">
                          <MoveRight className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Move to Group</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground mb-4">
                            Select a group for: <strong>{context.title}</strong>
                          </p>
                          {groupData.groups.map((group) => (
                            <Button
                              key={group.id}
                              onClick={async () => {
                                try {
                                  const response = await fetch(
                                    `http://localhost:3000/api/groups/${group.id}/add-context`,
                                    {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({ contextId: context.id }),
                                    }
                                  );
                                  
                                  if (response.ok) {
                                    setMovingContext(null);
                                    loadGroups();
                                    toast({ title: 'Success', description: `Moved to "${group.title}"` });
                                  }
                                } catch (error) {
                                  toast({ 
                                    title: 'Error', 
                                    description: 'Failed to move context', 
                                    variant: 'destructive' 
                                  });
                                }
                              }}
                              variant="outline"
                              className="w-full justify-start"
                            >
                              {group.title}
                              <Badge variant="secondary" className="ml-auto">
                                {group.contexts.length} items
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : groupData ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">All contexts are grouped! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Layers className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-6">
              Generate AI-powered groups or create manual groups to get started
            </p>
            <Button onClick={generateAIGroups} disabled={generating}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Groups
            </Button>
          </div>
        </Card>
      )}

    </div>
  );
}

