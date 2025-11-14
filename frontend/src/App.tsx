// Main App Component
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { Toaster } from '@/components/ui/toaster'
import { MainLayout } from '@/components/layout/MainLayout'
import { DashboardPage } from '@/pages/Dashboard'
import { LoginPage } from '@/pages/Login'
import { useAuthStore } from '@/stores/auth'
import { CommandPalette } from '@/components/CommandPalette'

// Type assertion workaround for React Router v6 + React 18 type issues
const RoutesFixed = Routes as any
const RouteFixed = Route as any

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  const [userId, setUserId] = useState<string | null>(null);

  // Get userId from localStorage and keep it updated
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    setUserId(storedUserId);

    // Listen for storage changes
    const handleStorageChange = () => {
      const updatedUserId = localStorage.getItem('userId');
      setUserId(updatedUserId);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSync = () => {
    // Trigger a custom event that the Dashboard can listen to
    window.dispatchEvent(new CustomEvent('sync-github'));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {/* Command Palette - Available globally */}
        <CommandPalette 
          userId={userId} 
          onSync={handleSync}
        />

        <RoutesFixed>
          <RouteFixed path="/login" element={<LoginPage />} />
          <RouteFixed path="/" element={
            <PrivateRoute>
              <MainLayout>
                <RoutesFixed>
                  <RouteFixed index element={<DashboardPage />} />
                  <RouteFixed path="contexts" element={<div>Contexts</div>} />
                  <RouteFixed path="integrations" element={<div>Integrations</div>} />
                  <RouteFixed path="settings" element={<div>Settings</div>} />
                </RoutesFixed>
              </MainLayout>
            </PrivateRoute>
          } />
        </RoutesFixed>
      </Router>
      {/* <Toaster /> */}
    </QueryClientProvider>
  )
}

export default App
