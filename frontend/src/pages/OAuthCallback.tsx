import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/hooks/use-toast'

export function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const { checkAuth } = useAuthStore()
  const { toast } = useToast()

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const provider = searchParams.get('provider')
      const errorParam = searchParams.get('error')

      console.log('[OAuthCallback] Starting:', { token: !!token, provider, error: !!errorParam })

      if (errorParam) {
        setError('OAuth authentication failed. Please try again.')
        setTimeout(() => navigate('/'), 3000)
        return
      }

      if (!token || !provider) {
        setError('Invalid OAuth callback parameters')
        setTimeout(() => navigate('/'), 3000)
        return
      }

      try {
        // Set the token in the API client
        api.setToken(token)
        console.log('[OAuthCallback] Token set in API client')

        // Update auth state and persist user
        await checkAuth()
        console.log('[OAuthCallback] checkAuth completed')

        // Auto-sync GitHub and Jira on first login/connect
        const userId = localStorage.getItem('userId')
        console.log('[OAuthCallback] userId from localStorage:', userId)
        if (userId) {
          try {
            console.log('Attempting GitHub sync...')
            const gh = await api.syncGitHub(userId)
            console.log('GitHub sync result:', gh)
            if (gh?.stats?.total) {
              toast({ title: 'GitHub synced', description: `${gh.stats.total} items imported` })
            }
          } catch (e) {
            console.error('GitHub sync error:', e)
            // ignore
          }
          try {
            console.log('Attempting Jira sync...')
            const jr = await api.syncJira(userId)
            console.log('Jira sync result:', jr)
            if ((jr as any)?.issues >= 0) {
              toast({ title: 'Jira synced', description: `${(jr as any).issues} tickets imported` })
            }
          } catch (e) {
            console.error('Jira sync error:', e)
            // ignore
          }
        }

        // Redirect to dashboard
        navigate('/')
      } catch (error) {
        console.error('OAuth callback error:', error)
        setError('Failed to complete authentication')
        setTimeout(() => navigate('/'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, navigate, checkAuth, toast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {error ? (
          <div>
            <h2 className="text-xl font-semibold text-destructive mb-2">Authentication Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
          </div>
        ) : (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Completing authentication...</h2>
            <p className="text-muted-foreground">Please wait while we connect your account.</p>
          </div>
        )}
      </div>
    </div>
  )
}
