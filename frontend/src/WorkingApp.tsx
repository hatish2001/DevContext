import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { WorkingLoginPage } from '@/pages/WorkingLogin'
import { OAuthCallback } from '@/pages/OAuthCallback'
import { DashboardPage } from '@/pages/Dashboard'
import { GroupsPage } from '@/pages/Groups'
import { IntegrationsPage } from '@/pages/Integrations'
import { useAuthStore } from '@/stores/auth'
import { Toaster } from '@/components/ui/toaster'
import { Header } from '@/components/layout/Header'

// Type assertions for React Router v6 + React 18 compatibility
const RoutesFixed = Routes as any
const RouteFixed = Route as any

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function WorkingApp() {
  return (
    <Router>
      <RoutesFixed>
        <RouteFixed path="/login" element={<WorkingLoginPage />} />
        <RouteFixed path="/auth/callback" element={<OAuthCallback />} />
        <RouteFixed
          path="/"
          element={
            <ProtectedRoute>
              <div className="flex flex-col h-screen">
                <Header />
                <div className="flex-1 overflow-auto">
                  <DashboardPage />
                </div>
              </div>
            </ProtectedRoute>
          }
        />
        <RouteFixed
          path="/groups"
          element={
            <ProtectedRoute>
              <div className="flex flex-col h-screen">
                <Header />
                <div className="flex-1 overflow-auto">
                  <GroupsPage />
                </div>
              </div>
            </ProtectedRoute>
          }
        />
        <RouteFixed
          path="/integrations"
          element={
            <ProtectedRoute>
              <div className="flex flex-col h-screen">
                <Header />
                <div className="flex-1 overflow-auto">
                  <IntegrationsPage />
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </RoutesFixed>
      <Toaster />
    </Router>
  )
}
