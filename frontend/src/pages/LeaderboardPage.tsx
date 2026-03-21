import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable'
import { StatCharts } from '../components/leaderboard/StatCharts'

export function LeaderboardPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <LeaderboardTable />
        <StatCharts />
      </div>
    </div>
  )
}
