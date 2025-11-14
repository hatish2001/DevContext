import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SmartPanel } from './SmartPanel'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [smartPanelOpen, setSmartPanelOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Context Panel */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <Header onToggleSmartPanel={() => setSmartPanelOpen(!smartPanelOpen)} />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Main Workspace */}
          <main className="flex-1 overflow-auto bg-background">
            <div className="p-6">
              {children}
            </div>
          </main>
          
          {/* Smart Panel (Right Side) */}
          <div
            className={cn(
              "transition-all duration-300 ease-in-out",
              smartPanelOpen ? "w-80" : "w-0"
            )}
          >
            {smartPanelOpen && <SmartPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
