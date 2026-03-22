import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable'
import { StatCharts } from '../components/leaderboard/StatCharts'

export function LeaderboardPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px' }}>
        <LeaderboardTable />
        <StatCharts />
      </div>
    </div>
  )
}
