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

      // Link guest votes to the new account
      try {
        await linkSession(data.token)
      } catch {
        // Non-critical — don't block login
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={handleClose}>
      <div className="bg-[var(--bg-card)] rounded-2xl p-8 max-w-sm w-[90%] shadow-2xl animate-scale-in relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-xl text-[var(--text-muted)] hover:text-[var(--text)] transition-all bg-transparent border-none cursor-pointer">
          &times;
        </button>

        <h3 className="text-xl font-bold mb-4">
          {tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </h3>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-[var(--bg-input)] rounded-lg p-0.5">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all border-none cursor-pointer
              ${tab === 'login' ? 'bg-[var(--bg-card)] text-[var(--text)] shadow-sm' : 'bg-transparent text-[var(--text-muted)]'}`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all border-none cursor-pointer
              ${tab === 'register' ? 'bg-[var(--bg-card)] text-[var(--text)] shadow-sm' : 'bg-transparent text-[var(--text-muted)]'}`}
          >
            Đăng ký
          </button>
        </div>

        {tab === 'register' && (
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tên hiển thị (tùy chọn)"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm mb-2.5 outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-light)] transition-all"
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm mb-2.5 outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-light)] transition-all"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm mb-2.5 outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-light)] transition-all"
        />

        {error && <p className="text-xs text-[var(--red)] mb-2">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold mt-1 hover:bg-[var(--accent-hover)] transition-all cursor-pointer border-none disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : tab === 'login' ? 'Đăng nhập' : 'Đăng ký'}
        </button>

        <div className="text-center mt-3">
          <span onClick={handleClose} className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--accent)] transition-all">
            Bỏ qua
          </span>
        </div>
      </div>
    </div>
  )
}
