import { createFileRoute } from '@tanstack/react-router'
import { ConflictResolver } from '@/components/ConflictResolver'
import { getMergeConflicts } from '@/utils/index'

export const Route = createFileRoute('/repo/$repoPath/conflicts')({
  component: ConflictsPage,
  loader: async ({ params }) => {
    const { repoPath } = params
    const conflicts = await getMergeConflicts(repoPath)
    return { repoPath, conflicts }
  },
})

function ConflictsPage() {
  const { repoPath, conflicts } = Route.useLoaderData()

  const handleConflictResolved = (filePath: string) => {
    // Handle conflict resolution
    console.log(`Conflict in ${filePath} resolved successfully!`)
  }

  return (
    <div className="conflicts-mode-container p-6">
      <ConflictResolver
        conflicts={conflicts}
        repoPath={repoPath}
        onConflictResolved={handleConflictResolved}
      />
    </div>
  )
}
