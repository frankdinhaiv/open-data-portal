import { useEffect } from 'react'
import { useStore } from './hooks/useStore'
import { Topbar } from './components/layout/Topbar'
import { Sidebar } from './components/layout/Sidebar'
import { Footer } from './components/layout/Footer'
import { ArenaPage } from './pages/ArenaPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { AuthModal } from './components/auth/AuthModal'
import { CTAModal } from './components/arena/CTAModal'
import { fetchModels } from './api/client'
import type { Model } from './types'

import trongDong from './assets/decorative/trong-dong.svg'

const FALLBACK_MODELS: Model[] = [
  { id: 'openai/gpt-5.4', name: 'GPT-5.4', org: 'OpenAI', license: 'prop', color: '#10a37f' },
  { id: 'anthropic/claude-sonnet', name: 'Claude Sonnet', org: 'Anthropic', license: 'prop', color: '#d97706' },
  { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', org: 'Google', license: 'prop', color: '#4285f4' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', org: 'OpenAI', license: 'prop', color: '#10a37f' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', org: 'DeepSeek', license: 'open', color: '#4f8ef7' },
  { id: 'xai/grok-3-fast-latest', name: 'Grok 3 Fast', org: 'xAI', license: 'prop', color: '#1d9bf0' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', org: 'Google', license: 'prop', color: '#4285f4' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', org: 'OpenAI', license: 'prop', color: '#10a37f' },
  { id: 'xai/grok-3-mini', name: 'Grok 3 Mini', org: 'xAI', license: 'prop', color: '#1d9bf0' },
  { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B', org: 'Meta', license: 'open', color: '#0668e1' },
  { id: 'qwen/qwen-vl-plus', name: 'Qwen VL Plus', org: 'Alibaba', license: 'open', color: '#6f42c1' },
  { id: 'vinai/phobert-large', name: 'PhoBERT Large', org: 'VinAI', license: 'open', color: '#e11d48' },
]

function App() {
  const { view, sidebarCollapsed, showCTAModal, setShowCTAModal, setModels, setSelectedModelA, setSelectedModelB, setSelectedModelDirect } = useStore()

  useEffect(() => {
    fetchModels()
      .then((data) => {
        const models = Array.isArray(data) ? data : FALLBACK_MODELS
        setModels(models)
        if (models.length > 0) {
          setSelectedModelA(models[0].id)
          setSelectedModelB(models.length > 1 ? models[1].id : models[0].id)
          setSelectedModelDirect(models[0].id)
        }
      })
      .catch(() => {
        setModels(FALLBACK_MODELS)
        setSelectedModelA(FALLBACK_MODELS[0].id)
        setSelectedModelB(FALLBACK_MODELS[1].id)
        setSelectedModelDirect(FALLBACK_MODELS[0].id)
      })
  }, [setModels, setSelectedModelA, setSelectedModelB, setSelectedModelDirect])

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: '#002266' }}>
      {/* Trong Dong — page-level decorative background
          Figma: x:314 y:-118, 1126×1126
          The SVG already contains: opacity 0.25, radial gradient mask, clip-path, and vector styling
          So we just position it and let the SVG handle everything internally */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none z-0"
        style={{
          left: '314px',
          top: '-118px',
          width: '1126px',
          height: '1126px',
        }}
      >
        <img
          src={trongDong}
          alt=""
          style={{
            display: 'block',
            width: '1126px',
            height: '1126px',
          }}
        />
      </div>

      {/* Fixed topbar */}
      <Topbar />

      {/* Fixed sidebar */}
      <Sidebar />

      {/* Scrollable main content (offset for topbar + sidebar) */}
      <div className="pt-[90px] flex-1 flex flex-col relative z-10 transition-all" style={{ marginLeft: sidebarCollapsed ? '56px' : '280px' }}>
        <main className="flex-1 flex flex-col">
          {view === 'arena' ? <ArenaPage /> : <LeaderboardPage />}
        </main>

        {/* Footer — full viewport width, breaks out of sidebar margin */}
        <div style={{ marginLeft: sidebarCollapsed ? '-56px' : '-280px', position: 'relative', zIndex: 50 }}>
          <Footer />
        </div>
      </div>

      {/* CTA modal (guest battle limit) */}
      <CTAModal show={showCTAModal} onClose={() => setShowCTAModal(false)} />

      {/* Auth modal overlay */}
      <AuthModal />
    </div>
  )
}

export default App
