import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'

// Lazy load heavy components for better initial performance
const FilePicker = lazy(() => import('../components/FilePicker').then(m => ({ default: m.FilePicker })))
const RecentRepoCard = lazy(() => import('../components/RecentReposList'))

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="welcome-screen">
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <FilePicker isLoading={false} />
      </Suspense>
      
      <Suspense fallback={
        <div className="p-4">
          <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
        </div>
      }>
        <RecentRepoCard />
      </Suspense>
    </div>
  )
}
