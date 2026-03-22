import { useState } from 'react'
import { useStore } from '../../hooks/useStore'
import * as api from '../../api/client'

type AuthTab = 'login' | 'register'

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, loginUser, sessionId } = useStore()
  const [tab, setTab] = useState<AuthTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!showAuthModal) return null

  function reset() {
    setEmail('')
    setPassword('')
    setDisplayName('')
    setError('')
    setLoading(false)
  }

  function handleClose() {
    reset()
    setShowAuthModal(false)
  }

  function switchTab(t: AuthTab) {
    setTab(t)
    setError('')
  }

  async function handleSubmit() {
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu')
      return
    }
    setLoading(true)
    setError('')
    try {
      let data
      if (tab === 'register') {
        data = await api.register(email, password, displayName || undefined)
      } else {
        data = await api.login(email, password)
      }
      loginUser(data.user_id, data.email, data.display_name, data.token)

      try {
        await linkSession(data.token)
      } catch {
        // Non-critical
      }

      reset()
      setShowAuthModal(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  async function linkSession(token: string) {
    const res = await fetch(`/api/auth/link-session?session_id=${sessionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={handleClose}>
      <div
        className="rounded-2xl p-8 max-w-sm w-[90%] shadow-2xl animate-scale-in relative"
        style={{
          background: 'rgba(0, 34, 102, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute top-4 right-4 text-xl text-white/50 hover:text-white transition-all bg-transparent border-none cursor-pointer">
          &times;
        </button>

        <h3 className="text-xl font-bold mb-4 text-white">
          {tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </h3>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all border-none cursor-pointer
              ${tab === 'login' ? 'bg-white/15 text-white shadow-sm' : 'bg-transparent text-white/50'}`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all border-none cursor-pointer
              ${tab === 'register' ? 'bg-white/15 text-white shadow-sm' : 'bg-transparent text-white/50'}`}
          >
            Đăng ký
          </button>
        </div>

        {tab === 'register' && (
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tên hiển thị (tuỳ chọn)"
            className="w-full px-3.5 py-2.5 rounded-lg text-sm mb-2.5 outline-none text-white placeholder:text-white/40 transition-all"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-3.5 py-2.5 rounded-lg text-sm mb-2.5 outline-none text-white placeholder:text-white/40 transition-all"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-3.5 py-2.5 rounded-lg text-sm mb-2.5 outline-none text-white placeholder:text-white/40 transition-all"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
        />

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-white text-[#002266] text-sm font-semibold mt-1 hover:bg-gray-100 transition-all cursor-pointer border-none disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : tab === 'login' ? 'Đăng nhập' : 'Đăng ký'}
        </button>

        <div className="text-center mt-3">
          <span onClick={handleClose} className="text-xs text-white/40 cursor-pointer hover:text-white/70 transition-all">
            Bỏ qua
          </span>
        </div>
      </div>
    </div>
  )
}
