import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GitPullRequest, MessageSquare, Users, Clock, Link2 } from 'lucide-react'

export function SmartPanel() {
  // Mock data - in real app, this would come from context
  const relatedItems = [
    {
      id: '1',
      type: 'jira',
      title: 'PROJ-123: Fix payment gateway timeout',
      icon: <Badge className="bg-[#0052CC]">Jira</Badge>,
      link: '#'
    },
    {
      id: '2',
      type: 'slack',
      title: 'Discussion in #backend about payment issues',
      icon: <Badge className="bg-[#4A154B]">Slack</Badge>,
      link: '#'
    },
    {
      id: '3',
      type: 'github',
      title: 'Previous PR #456 - Payment service refactor',
      icon: <Badge className="bg-[#333]">GitHub</Badge>,
      link: '#'
    }
  ]

  const people = [
    { id: '1', name: 'John Doe', role: 'Reviewing PR', avatar: 'JD', status: 'online' },
    { id: '2', name: 'Amy Chen', role: 'In Slack thread', avatar: 'AC', status: 'online' },
    { id: '3', name: 'Bob Smith', role: 'Assigned to ticket', avatar: 'BS', status: 'offline' }
  ]

  const recentActivity = [
    { id: '1', text: 'PR comment added', time: '5 minutes ago' },
    { id: '2', text: 'Jira ticket updated', time: '1 hour ago' },
    { id: '3', text: 'Slack mention', time: '3 hours ago' }
  ]

  return (
    <div className="h-full bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Context Panel</h2>
        <p className="text-sm text-muted-foreground">Related information</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Related Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Related</h3>
            </div>
            <div className="space-y-2">
              {relatedItems.map((item) => (
                <a
                  key={item.id}
                  href={item.link}
                  className="block p-3 rounded-lg bg-background hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {item.icon}
                    <p className="text-sm flex-1 line-clamp-2">{item.title}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <Separator />

          {/* People */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">People</h3>
            </div>
            <div className="space-y-2">
              {people.map((person) => (
                <div key={person.id} className="flex items-center gap-3 p-2">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium">{person.avatar}</span>
                    </div>
                    <div className={`absolute -bottom-0 -right-0 h-3 w-3 rounded-full border-2 border-card ${
                      person.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Recent Activity */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">History</h3>
            </div>
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-2">
                  <p className="text-sm text-muted-foreground">{activity.text}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button variant="outline" size="sm" className="w-full justify-start">
          <GitPullRequest className="h-4 w-4 mr-2" />
          Open PR
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <MessageSquare className="h-4 w-4 mr-2" />
          Reply in Slack
        </Button>
      </div>
    </div>
  )
}
