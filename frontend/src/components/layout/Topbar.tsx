import { useState, useEffect } from 'react'
import { useStore } from '../../hooks/useStore'

import vigenLogo from '../../assets/logos/vigen-logo.svg'
import vigenTagline from '../../assets/logos/vigen-tagline.svg'

const NAV_ITEMS = [
  { id: 'leaderboard', label: 'Bảng xếp hạng' },
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'arena', label: 'Arena' },
  { id: 'community', label: 'Cộng đồng' },
] as const

export function Topbar() {
  const { view, setView, setShowAuthModal } = useStore()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        height: '90px',
        background: scrolled ? 'rgba(0, 34, 102, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}
    >
      {/* Content container — 1200px centered, vertically centered */}
      <div
        className="relative mx-auto h-full flex items-center justify-between"
        style={{ maxWidth: '1200px', padding: '0 24px' }}
      >
        {/* Left: ViGen Logo (70px tall = logo + tagline as one unit) */}
        <div
          className="relative shrink-0 cursor-pointer overflow-hidden"
          style={{ width: '141px', height: '70px' }}
          onClick={() => setView('arena')}
        >
          {/* Logo SVG — top 75% of the container */}
          <img
            src={vigenLogo}
            alt="ViGen"
            className="absolute top-0 left-0"
            style={{ width: '100%', height: '75%', objectFit: 'contain', objectPosition: 'left' }}
          />
          {/* Tagline SVG — bottom portion */}
          <img
            src={vigenTagline}
            alt=""
            aria-hidden="true"
            className="absolute bottom-[1px] left-[0.4%]"
            style={{ width: '86%', height: '19%', objectFit: 'contain', objectPosition: 'left', opacity: 0.75 }}
          />
        </div>

        {/* Center: Nav bar — absolutely centered */}
        <nav
          className="absolute flex items-center justify-center"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            gap: '24px',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = (item.id === 'arena' && view === 'arena') ||
                            (item.id === 'leaderboard' && view === 'leaderboard')
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'arena') setView('arena')
                  if (item.id === 'leaderboard') setView('leaderboard')
                }}
                className="relative bg-transparent border-none cursor-pointer transition-all flex items-center"
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: '16px',
                  lineHeight: '24px',
                  fontWeight: 400,
                  color: '#FFFFFF',
                  padding: '10px 2px',
                  gap: '4px',
                  isolation: 'isolate',
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                {isActive && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      height: '10px',
                      left: '0.5px',
                      right: '-0.5px',
                      top: '12px',
                      background: 'linear-gradient(270deg, #3F86F9 0%, #3FD0F9 25%, #BAFAFF 50%, #3FD0F9 74.52%, #3F86F9 100%)',
                      filter: 'blur(4px)',
                      transform: 'matrix(1, 0, 0, -1, 0, 0)',
                      zIndex: 0,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* Right: Auth buttons — Figma: 265×40 container, gap 16px, justify-end */}
        <div className="flex items-center justify-end shrink-0" style={{ width: '265px', height: '40px', gap: '16px' }}>
          <button
            onClick={() => setShowAuthModal(true)}
            className="cursor-pointer hover:bg-white/10 transition-all"
            style={{
              boxSizing: 'border-box',
              height: '40px',
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: '16px',
              lineHeight: '24px',
              fontWeight: 600,
              color: '#FFFFFF',
              background: 'transparent',
              border: '1px solid #FFFFFF',
              borderRadius: '55px',
              padding: '8px 24px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => setShowAuthModal(true)}
            className="cursor-pointer hover:opacity-90 transition-all"
            style={{
              height: '40px',
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: '16px',
              lineHeight: '24px',
              fontWeight: 600,
              color: '#000000',
              background: '#FFFFFF',
              border: 'none',
              borderRadius: '55px',
              padding: '8px 24px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            Đăng ký
          </button>
        </div>
      </div>
    </header>
  )
}
