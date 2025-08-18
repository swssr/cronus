import { createFileRoute, Outlet, ErrorComponent } from '@tanstack/react-router'
import { getDirectoryFiles } from '../utils/index'

export const Route = createFileRoute('/repo/$repoPath')({
  component: RepoLayout,
  errorComponent: RepoErrorComponent,
  loader: async ({ params }) => {
    try {
      const { repoPath } = params
      const files = await getDirectoryFiles(repoPath)
      return { repoPath, files }
    } catch (error) {
      throw new Error(`Failed to load repository: ${error}`)
    }
  },
})

function RepoLayout() {
  return (
    <div className="repo-layout">
      <Outlet />
    </div>
  )
}

function RepoErrorComponent({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-destructive">Repository Error</h1>
        <p className="text-muted-foreground">{error.message}</p>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}
