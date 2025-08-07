import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from '../contexts/ThemeContext'
import AppHeader from '../components/AppHeader'
import HelpOverlay from '../components/HelpOverlay'
import { Toaster } from '../components/ui/sonner'
import { useState } from 'react'
import '../App.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <ThemeProvider>
      <div className="app-container">
        <AppHeader onHelpClick={() => setShowHelp(true)} />
        <Outlet />
        <HelpOverlay isOpen={showHelp} onClose={() => setShowHelp(false)} />
        <Toaster position="bottom-center" duration={8000} />
      </div>
    </ThemeProvider>
  )
}
