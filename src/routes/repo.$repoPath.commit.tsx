import { createFileRoute } from '@tanstack/react-router'
import SmartCommitAssistant from '@/components/SmartCommitAssistant'
import { getGitStatus } from '@/utils/index'
import { useEffect, useState } from 'react'
import type { GitStatus } from '@/types'

export const Route = createFileRoute('/repo/$repoPath/commit')({
  component: CommitPage,
  loader: async ({ params }) => {
    const { repoPath } = params
    const gitStatus = await getGitStatus(repoPath)
    return { repoPath, gitStatus }
  },
})

function CommitPage() {
  const { repoPath, gitStatus: initialStatus } = Route.useLoaderData()
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(initialStatus)

  const refreshStatus = async () => {
    const next = await getGitStatus(repoPath)
    setGitStatus(next)
  }

  useEffect(() => {
    setGitStatus(initialStatus)
  }, [initialStatus])

  return (
    <div className="commit-mode-container p-6">
      {gitStatus && (
        <SmartCommitAssistant
          repoPath={repoPath}
          gitStatus={gitStatus}
          onStatusUpdate={refreshStatus}
          onCommitCreated={() => {}}
        />
      )}
    </div>
  )
}
