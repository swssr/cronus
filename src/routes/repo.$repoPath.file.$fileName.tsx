import { createFileRoute } from '@tanstack/react-router'
import { EnhancedImmersiveView, CarouselView } from '@/views'
import { useState } from 'react'
import { getGitHistoryWithContent } from '@/utils/index'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createFileRoute('/repo/$repoPath/file/$fileName')({
  component: FileViewPage,
  loader: async ({ params }) => {
    const { repoPath, fileName } = params
    const fullPath = `${repoPath}/${fileName}`
    const history = await getGitHistoryWithContent(fullPath)
    return { repoPath, fileName, history }
  },
})

function FileViewPage() {
  const { repoPath, fileName, history } = Route.useLoaderData()
  const [viewMode, setViewMode] = useState<'carousel' | 'immersive'>('immersive')
  const [cardsToShow, setCardsToShow] = useState<1 | 3 | 5>(3)

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("View Error:", error, errorInfo)
      }}
    >
      {viewMode === "immersive" ? (
        <EnhancedImmersiveView
          commits={history}
          fileName={fileName}
        />
      ) : (
        <CarouselView
          commits={history}
          fileName={fileName}
          cardsToShow={cardsToShow}
        />
      )}
    </ErrorBoundary>
  )
}
