import { useState } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// import { Card } from '@/components/ui/card'
import { GitBranch, Layers, MessageSquare } from 'lucide-react'

export function LoginPage() {
  // const navigate = useNavigate()
  // const login = useAuthStore((state) => state.login)
  const [isLoading, setIsLoading] = useState(false)

  const handleOAuthLogin = async (_provider: string) => {
    setIsLoading(true)
    
    // In real app, this would redirect to OAuth provider
    // For demo, simulate login
    setTimeout(() => {
      // login(
      //   { id: '1', email: 'user@example.com', name: 'Demo User' },
      //   'demo-token'
      // )
      // navigate('/')
      window.location.href = '/'
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">DevContext</h1>
          <p className="text-muted-foreground">
            Your unified developer workspace
          </p>
        </div>

        <div className="p-6 space-y-6 bg-card rounded-lg border">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-center">Welcome back</h2>
            <p className="text-sm text-muted-foreground text-center">
              Connect your accounts to get started
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleOAuthLogin('github')}
              disabled={isLoading}
            >
              <GitBranch className="h-5 w-5" />
              Continue with GitHub
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleOAuthLogin('jira')}
              disabled={isLoading}
            >
              <Layers className="h-5 w-5" />
              Continue with Jira
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleOAuthLogin('slack')}
              disabled={isLoading}
            >
              <MessageSquare className="h-5 w-5" />
              Continue with Slack
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              disabled={isLoading}
            />
            <Input
              type="password"
              placeholder="Password"
              disabled={isLoading}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              onClick={() => handleOAuthLogin('email')}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
