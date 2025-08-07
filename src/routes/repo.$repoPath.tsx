import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getDirectoryFiles } from '../utils/index'

export const Route = createFileRoute('/repo/$repoPath')({
  component: RepoLayout,
  loader: async ({ params }) => {
    const { repoPath } = params
    const files = await getDirectoryFiles(repoPath)
    return { repoPath, files }
  },
})

function RepoLayout() {
  return (
    <div className="repo-layout">
      <Outlet />
    </div>
  )
}
