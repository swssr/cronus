import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getGitGraph } from '@/utils/index'
import { GitGraphVisualization } from '@/components/GitGraphVisualization'

export const Route = createFileRoute('/repo/$repoPath/graph')({
  component: GraphPage,
  loader: async ({ params }) => {
    const { repoPath } = params
    const gitGraph = await getGitGraph(repoPath)
    return { repoPath, gitGraph }
  },
})

function GraphPage() {
  const { gitGraph } = Route.useLoaderData()
  const [selectedGraphNodes, setSelectedGraphNodes] = useState<Set<string>>(new Set())

  const handleGraphNodeClick = (node: any) => {
    console.log("Graph node clicked:", node)
  }

  const handleGraphNodeSelect = (node: any) => {
    setSelectedGraphNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(node.hash)) {
        newSet.delete(node.hash)
      } else {
        newSet.add(node.hash)
      }
      return newSet
    })
  }

  return (
    <div className="graph-mode-container p-6">
      {gitGraph ? (
        <GitGraphVisualization
          graph={gitGraph}
          onNodeClick={handleGraphNodeClick}
          onNodeSelect={handleGraphNodeSelect}
          selectedNodes={selectedGraphNodes}
        />
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Loading git graph...
          </p>
        </div>
      )}
    </div>
  )
}
