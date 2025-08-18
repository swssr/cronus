import { createFileRoute, useNavigate, ErrorComponent } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { getRepoFiles } from '@/utils/index'

// Lazy load the heavy FileSelectionMode component
const FileSelectionMode = lazy(() => import('@/components/FileSelectionMode'))

export const Route = createFileRoute('/repo/$repoPath/files')({
  component: FilesPage,
  errorComponent: FilesErrorComponent,
  loader: async ({ params }) => {
    try {
      const { repoPath } = params
      const files = await getRepoFiles(repoPath)
      return { repoPath, files }
    } catch (error) {
      throw new Error(`Failed to load repository files: ${error}`)
    }
  },
})

function FilesPage() {
  const { repoPath, files } = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h2 className="text-xl font-semibold">Loading Repository</h2>
          <p className="text-muted-foreground">Preparing your development workspace...</p>
        </div>
      </div>
    }>
      <FileSelectionMode
        availableFiles={files}
        onFileSelect={(fileName) => {
          // Navigate to file view
          navigate({ 
            to: `/repo/${encodeURIComponent(repoPath)}/file/${encodeURIComponent(fileName)}` 
          })
        }}
        onBranchSelect={(branchName) => {
          // Navigate to branch view
          console.log('Branch selected:', branchName)
        }}
        onCommitSelect={(commitHash) => {
          // Navigate to commit view
          console.log('Commit selected:', commitHash)
        }}
        onCreateVirtualBranch={(baseCommit, branchName) => {
          // Handle virtual branch creation
          console.log('Create virtual branch:', baseCommit, branchName)
        }}
        directory={repoPath}
        currentMode="file"
      />
    </Suspense>
  )
}

function FilesErrorComponent({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">📁</span>
        </div>
        <h1 className="text-2xl font-bold text-destructive">Files Loading Error</h1>
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
