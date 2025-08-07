import { createFileRoute, useNavigate } from '@tanstack/react-router'
import FileSelectionMode from '@/components/FileSelectionMode'
import { getRepoFiles } from '@/utils/index'

export const Route = createFileRoute('/repo/$repoPath/files')({
  component: FilesPage,
  loader: async ({ params }) => {
    const { repoPath } = params
    const files = await getRepoFiles(repoPath)
    return { repoPath, files }
  },
})

function FilesPage() {
  const { repoPath, files } = Route.useLoaderData()
  const navigate = useNavigate()

  return (
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
  )
}
