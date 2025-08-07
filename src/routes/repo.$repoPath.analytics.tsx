import { createFileRoute } from '@tanstack/react-router'
import { RepositoryAnalyticsComponent } from '@/components/RepositoryAnalytics'
import { getRepositoryAnalytics } from '@/utils/index'

export const Route = createFileRoute('/repo/$repoPath/analytics')({
  component: AnalyticsPage,
  loader: async ({ params }) => {
    const { repoPath } = params
    const analytics = await getRepositoryAnalytics(repoPath)
    return { repoPath, analytics }
  },
})

function AnalyticsPage() {
  const { analytics } = Route.useLoaderData()

  return (
    <div className="analytics-mode-container p-6">
      {analytics ? (
        <RepositoryAnalyticsComponent analytics={analytics} />
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Loading repository analytics...
          </p>
        </div>
      )}
    </div>
  )
}
