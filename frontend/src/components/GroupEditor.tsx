import { useState } from 'react';
import { Plus, X, MoveRight, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';

interface Context {
  id: string;
  title: string;
  source: string;
  metadata?: {
    repo?: string;
    author?: string;
  };
}

interface Group {
  id: string;
  title: string;
  contexts: Context[];
}

interface GroupEditorProps {
  groups: Group[];
  ungroupedContexts: Context[];
  onUpdate: () => void;
}

export function GroupEditor({ groups, ungroupedContexts, onUpdate }: GroupEditorProps) {
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [movingContext, setMovingContext] = useState<string | null>(null);

  const createManualGroup = async () => {
    if (selectedContexts.length < 1 || !newGroupTitle.trim()) {
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('http://localhost:3000/api/groups/manual/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          title: newGroupTitle,
          contextIds: selectedContexts,
        }),
      });

      if (!response.ok) throw new Error('Failed to create group');

      setSelectedContexts([]);
      setNewGroupTitle('');
      setIsCreatingGroup(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group');
    }
  };

  const addToGroup = async (contextId: string, groupId: string) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/groups/${groupId}/add-context`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ contextId }),
        }
      );

      if (!response.ok) throw new Error('Failed to add context');

      setMovingContext(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to add context:', error);
      alert('Failed to add context to group');
    }
  };

  const removeFromGroup = async (contextId: string, groupId: string) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/groups/${groupId}/remove-context/${contextId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to remove context');

      onUpdate();
    } catch (error) {
      console.error('Failed to remove context:', error);
      alert('Failed to remove context from group');
    }
  };

  const toggleSelection = (contextId: string) => {
    setSelectedContexts((prev) =>
      prev.includes(contextId)
        ? prev.filter((id) => id !== contextId)
        : [...prev, contextId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Ungrouped Contexts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ungrouped Contexts ({ungroupedContexts.length})</CardTitle>
            <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
              <DialogTrigger asChild>
                <Button
                  disabled={selectedContexts.length < 1}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group ({selectedContexts.length})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Manual Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Group Title</label>
                    <Input
                      value={newGroupTitle}
                      onChange={(e) => setNewGroupTitle(e.target.value)}
                      placeholder="Enter group title..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedContexts.length} context(s) selected
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={createManualGroup}
                      disabled={!newGroupTitle.trim() || selectedContexts.length < 1}
                      className="flex-1"
                    >
                      Create Group
                    </Button>
                    <Button
                      onClick={() => {
                        setIsCreatingGroup(false);
                        setNewGroupTitle('');
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ungroupedContexts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No ungrouped contexts
              </p>
            ) : (
              ungroupedContexts.map((context) => (
                <div
                  key={context.id}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedContexts.includes(context.id)}
                    onChange={() => toggleSelection(context.id)}
                    className="w-4 h-4"
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
                  {groups.length > 0 && (
                    <Dialog
                      open={movingContext === context.id}
                      onOpenChange={(open) =>
                        setMovingContext(open ? context.id : null)
                      }
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoveRight className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Move to Group</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          {groups.map((group) => (
                            <Button
                              key={group.id}
                              onClick={() => addToGroup(context.id, group.id)}
                              variant="outline"
                              className="w-full justify-start"
                            >
                              {group.title}
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Groups */}
      {groups.map((group) => (
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
                    onClick={() => removeFromGroup(context.id, group.id)}
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
  );
}





