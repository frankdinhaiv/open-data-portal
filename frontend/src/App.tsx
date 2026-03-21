import { useEffect } from 'react'
import { useStore } from './hooks/useStore'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { ArenaPage } from './pages/ArenaPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { AuthModal } from './components/auth/AuthModal'
import { fetchModels } from './api/client'

function App() {
  const { view, models, setModels, setSelectedModelA, setSelectedModelB, setSelectedModelDirect } = useStore()

  useEffect(() => {
    fetchModels().then((data) => {
      setModels(data)
      if (data.length > 0) {
        setSelectedModelA(data[0].id)
        setSelectedModelB(data.length > 1 ? data[1].id : data[0].id)
        setSelectedModelDirect(data[0].id)
      }
    })
  }, [setModels, setSelectedModelA, setSelectedModelB, setSelectedModelDirect])

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar />
        {view === 'arena' ? <ArenaPage /> : <LeaderboardPage />}
      </div>
      <AuthModal />
    </div>
  )
}

export default App
