import { createFileRoute } from '@tanstack/react-router'
import SmartCommitAssistant from '@/components/SmartCommitAssistant'
import { getGitStatus } from '@/utils/index'

export const Route = createFileRoute('/repo/$repoPath/commit')({
  component: CommitPage,
  loader: async ({ params }) => {
    const { repoPath } = params
    const gitStatus = await getGitStatus(repoPath)
    return { repoPath, gitStatus }
  },
})

function CommitPage() {
  const { repoPath, gitStatus } = Route.useLoaderData()

  return (
    <div className="commit-mode-container p-6">
      {gitStatus && (
        <SmartCommitAssistant
          repoPath={repoPath}
          gitStatus={gitStatus}
          onStatusUpdate={() => {
            // Refresh git status
          }}
          onCommitCreated={(commitHash) => {
            // Handle commit created
          }}
        />
      )}
    </div>
  )
}
