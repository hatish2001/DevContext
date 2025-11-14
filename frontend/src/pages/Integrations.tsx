import { useEffect, useState } from 'react'
import { Github, Code2, Slack, RefreshCw, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

export function IntegrationsPage() {
  const userId = localStorage.getItem('userId') || ''
  const { toast } = useToast()
  const [syncing, setSyncing] = useState<string | null>(null)
  const [status, setStatus] = useState<{ github: any; jira: any; slack: any } | null>(null)

  const loadStatus = async () => {
    try {
      const s = await api.getIntegrations()
      setStatus(s as any)
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const connectJira = () => {
    window.location.href = api.getJiraAuthUrl(userId)
  }

  const syncJira = async () => {
    setSyncing('jira')
    try {
      const res = await api.syncJira(userId)
      toast({ title: 'Jira Synced', description: `Imported ${res.issues} issues` })
      await loadStatus()
    } catch (e) {
      toast({ title: 'Jira Sync Failed', description: 'Could not sync Jira', variant: 'destructive' })
    } finally {
      setSyncing(null)
    }
  }

  const connectGithub = () => {
    window.location.href = api.getOAuthUrl('github')
  }

  const connectSlack = () => {
    window.location.href = api.getSlackAuthUrl(userId)
  }

  const syncSlack = async () => {
    setSyncing('slack')
    try {
      const res = await api.syncSlack(userId)
      toast({ title: 'Slack Synced', description: `Imported ${res.messages} messages` })
      await loadStatus()
    } catch (e) {
      toast({ title: 'Slack Sync Failed', description: 'Could not sync Slack', variant: 'destructive' })
    } finally {
      setSyncing(null)
    }
  }

  return (
    <>
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Github className="h-5 w-5" /> GitHub</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Sync commits, PRs, issues, and reviews</p>
            <div className="flex gap-2">
              {status?.github ? (
                <Button disabled variant="secondary">Connected</Button>
              ) : (
                <Button onClick={connectGithub} variant="secondary"><ExternalLink className="h-4 w-4 mr-2" />Connect</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Code2 className="h-5 w-5 text-blue-500" /> Jira</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Import tickets and link to code</p>
            <div className="flex gap-2">
              {status?.jira ? (
                <Button disabled>Connected</Button>
              ) : (
                <Button onClick={connectJira}><ExternalLink className="h-4 w-4 mr-2" />Connect</Button>
              )}
              <Button onClick={syncJira} disabled={!userId || syncing === 'jira'}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing === 'jira' ? 'animate-spin' : ''}`} />
                {syncing === 'jira' ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Slack className="h-5 w-5 text-purple-500" /> Slack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Capture PR discussions from channels</p>
            <div className="flex gap-2">
              {status?.slack ? (
                <Button disabled>Connected</Button>
              ) : (
                <Button onClick={connectSlack}><ExternalLink className="h-4 w-4 mr-2" />Connect</Button>
              )}
              <Button onClick={syncSlack} disabled={!userId || syncing === 'slack'} variant="secondary">
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing === 'slack' ? 'animate-spin' : ''}`} />
                {syncing === 'slack' ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  )
}


