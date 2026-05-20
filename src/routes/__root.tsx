import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from '../contexts/ThemeContext'
import { HelpProvider } from '../contexts/HelpContext'
import { Suspense, lazy } from 'react'
import '../App.css'

// Lazy load heavy components for better initial performance
const AppHeader = lazy(() => import('../components/AppHeader'))
const HelpOverlay = lazy(() => import('../components/HelpOverlay'))
const Toaster = lazy(() => import('../components/ui/sonner').then(m => ({ default: m.Toaster })))

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider>
      <HelpProvider>
        <div className="app-container">
          <Suspense fallback={
            <div className="h-16 bg-background border-b flex items-center px-6">
              <div className="w-32 h-8 bg-muted animate-pulse rounded"></div>
            </div>
          }>
            <AppHeader />
          </Suspense>
          
          <Outlet />
          
          <Suspense fallback={null}>
            <HelpOverlay />
          </Suspense>
          
          <Suspense fallback={null}>
            <Toaster position="bottom-center" duration={8000} />
          </Suspense>
        </div>
      </HelpProvider>
    </ThemeProvider>
  )
}
