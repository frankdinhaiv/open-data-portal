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

function useBreakpoint() {
  const [bp, setBp] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  useEffect(() => {
    function update() {
      const w = window.innerWidth
      setBp(w >= 1024 ? 'desktop' : w >= 768 ? 'tablet' : 'mobile')
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return bp
}

export { useBreakpoint }

export function Topbar() {
  const { view, setView, setShowAuthModal, mobileMenuOpen, setMobileMenuOpen, setSidebarDrawerOpen } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const bp = useBreakpoint()

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on breakpoint change to desktop
  useEffect(() => {
    if (bp === 'desktop') setMobileMenuOpen(false)
  }, [bp, setMobileMenuOpen])

  function handleNav(id: string) {
    if (id === 'arena') setView('arena')
    if (id === 'leaderboard') setView('leaderboard')
    setMobileMenuOpen(false)
  }

  function handleHamburger() {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false)
    } else {
      setSidebarDrawerOpen(false)
      setMobileMenuOpen(true)
    }
  }

  const isCompact = bp !== 'desktop'

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          height: isCompact ? '64px' : '90px',
          background: scrolled || mobileMenuOpen ? 'rgba(0, 34, 102, 0.95)' : 'transparent',
          backdropFilter: scrolled || mobileMenuOpen ? 'blur(12px)' : 'none',
        }}
      >
        <div
          className="relative mx-auto h-full flex items-center justify-between"
          style={{ maxWidth: '1200px', padding: isCompact ? '0 16px' : '0 24px' }}
        >
          {/* Left: Hamburger (tablet/mobile) + Logo */}
          <div className="flex items-center" style={{ gap: '12px' }}>
            {isCompact && (
              <button
                onClick={handleHamburger}
                className="flex items-center justify-center cursor-pointer bg-transparent border-none"
                style={{ width: '40px', height: '40px', padding: '8px' }}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
            )}

            <div
              className="relative shrink-0 cursor-pointer overflow-hidden"
              style={{ width: isCompact ? '100px' : '141px', height: isCompact ? '50px' : '70px' }}
              onClick={() => { setView('arena'); setMobileMenuOpen(false) }}
            >
              <img
                src={vigenLogo}
                alt="ViGen"
                className="absolute top-0 left-0"
                style={{ width: '100%', height: '75%', objectFit: 'contain', objectPosition: 'left' }}
              />
              {!isCompact && (
                <img
                  src={vigenTagline}
                  alt=""
                  aria-hidden="true"
                  className="absolute bottom-[1px] left-[0.4%]"
                  style={{ width: '86%', height: '19%', objectFit: 'contain', objectPosition: 'left', opacity: 0.75 }}
                />
              )}
            </div>
          </div>

          {/* Center: Nav bar — desktop only */}
          {bp === 'desktop' && (
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
                    onClick={() => handleNav(item.id)}
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
          )}

          {/* Right: Auth buttons — adapt for compact */}
          <div className="flex items-center justify-end shrink-0" style={{ gap: isCompact ? '8px' : '16px' }}>
            {bp === 'desktop' ? (
              <>
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
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="cursor-pointer hover:opacity-90 transition-all"
                style={{
                  height: '36px',
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontWeight: 600,
                  color: '#000000',
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: '55px',
                  padding: '8px 16px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile/tablet dropdown menu */}
      {isCompact && mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)', top: bp === 'mobile' ? '64px' : '64px' }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            className="fixed left-0 right-0 z-45 animate-slide-up"
            style={{
              top: '64px',
              background: 'rgba(0, 34, 102, 0.98)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              padding: '8px 16px 16px',
              zIndex: 45,
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = (item.id === 'arena' && view === 'arena') ||
                              (item.id === 'leaderboard' && view === 'leaderboard')
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className="flex items-center w-full bg-transparent border-none cursor-pointer transition-all"
                  style={{
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    fontSize: '16px',
                    lineHeight: '24px',
                    fontWeight: isActive ? 600 : 400,
                    color: '#FFFFFF',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </>
      )}
    </>
  )
}
