import { useState } from 'react'
import { LoginPage } from '@/pages/Login'

// Simple dashboard component
function SimpleDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-3xl font-bold mb-4">DevContext Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-2">Contexts</h2>
          <p className="text-muted-foreground">Your development contexts will appear here</p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-2">Integrations</h2>
          <p className="text-muted-foreground">GitHub, Jira, Slack connections</p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-2">Activity</h2>
          <p className="text-muted-foreground">Recent activity and updates</p>
        </div>
      </div>
    </div>
  )
}

export default function SimpleApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  if (!isLoggedIn) {
    // Temporarily bypass the auth store
    const mockLogin = () => {
      setIsLoggedIn(true)
    }
    
    return (
      <div>
        <LoginPage />
        <div className="fixed bottom-4 right-4">
          <button 
            onClick={mockLogin}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
          >
            Quick Login (Dev)
          </button>
        </div>
      </div>
    )
  }

  return <SimpleDashboard />
}
