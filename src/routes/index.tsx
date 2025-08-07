import { createFileRoute } from '@tanstack/react-router'
import { FilePicker } from '../components/FilePicker'
import RecentRepoCard from '../components/RecentReposList'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="welcome-screen">
      <FilePicker isLoading={false} />
      <RecentRepoCard />
    </div>
  )
}
