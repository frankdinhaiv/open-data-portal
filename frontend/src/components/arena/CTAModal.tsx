import { useStore } from '../../hooks/useStore'

import trongDongCta from '../../assets/decorative/trong-dong-cta.svg'
import vigenStar from '../../assets/logos/vigen-star.svg'

import ctaModel1 from '../../assets/models/cta-model-1.png'
import ctaModel2 from '../../assets/models/cta-model-2.png'
import ctaModel3 from '../../assets/models/cta-model-3.png'
import ctaModel4 from '../../assets/models/cta-model-4.png'
import ctaModel5 from '../../assets/models/cta-model-5.png'
import ctaModel6 from '../../assets/models/cta-model-6.png'
import ctaModel7 from '../../assets/models/cta-model-7.png'

/* Floating model icon positions from Figma (relative to 568x240 image area) */
const floatingModels: Array<{
  src: string
  size: number    // px (24 or 32)
  left: number    // px from image left
  top: number     // px from image top
}> = [
  { src: ctaModel6, size: 32, left: 22,  top: 48  },   // bottom-left (image 83)
  { src: ctaModel1, size: 32, left: 77,  top: 172 },   // mid-left (image 79)
  { src: ctaModel5, size: 24, left: 180, top: 24  },   // top-center-left (image 78)
  { src: ctaModel2, size: 24, left: 217, top: 200 },   // bottom-center-left (image 80)
  { src: ctaModel7, size: 32, left: 397, top: 16  },   // top-center-right (image 77 / GPT)
  { src: ctaModel3, size: 24, left: 401, top: 184 },   // bottom-center-right (image 81)
  { src: ctaModel4, size: 32, left: 520, top: 88  },   // mid-right (image 84)
]

interface Props {
  show: boolean
  onClose?: () => void
}

export function CTAModal({ show, onClose }: Props) {
  const { setShowAuthModal } = useStore()

  if (!show) return null

  function handleRegister() {
    onClose?.()
    setShowAuthModal(true)
  }

  function handleLogin() {
    onClose?.()
    setShowAuthModal(true)
  }

  function handleGoHome() {
    onClose?.()
    // Navigate to home / refresh
    window.location.href = '/'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        background: 'rgba(0,0,0,0.35)',
      }}
      onClick={onClose}
    >
      <div
        className="w-[600px] max-w-[95vw] rounded-xl overflow-hidden animate-scale-in"
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with title */}
        <div className="pt-6 pb-4 px-4">
          <h2
            className="text-center text-white w-full"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '30px',
              fontWeight: 500,
              lineHeight: '38px',
            }}
          >
            Đừng để cuộc đối đầu dừng lại ở đây!
          </h2>
        </div>

        {/* Image area with floating model logos */}
        <div
          className="flex flex-col"
          style={{ padding: '16px', gap: '16px' }}
        >
          <div
            className="relative w-full overflow-hidden flex items-center justify-center"
            style={{ height: '240px' }}
          >
            {/* Trong Dong background pattern */}
            <img
              src={trongDongCta}
              alt=""
              className="absolute pointer-events-none"
              style={{
                width: '568px',
                height: '568px',
                top: '-164px',
                left: '0',
              }}
            />

            {/* ViGen star center logo */}
            <img
              src={vigenStar}
              alt="ViGen"
              className="relative z-10"
              style={{ width: '70px', height: '67.5px' }}
            />

            {/* Floating model avatars */}
            {floatingModels.map((m, i) => (
              <div
                key={i}
                className="absolute z-10 bg-white flex items-center justify-center"
                style={{
                  width: `${m.size}px`,
                  height: `${m.size}px`,
                  left: `${m.left}px`,
                  top: `${m.top}px`,
                  borderRadius: m.size === 32 ? '16px' : '12px',
                  padding: m.size === 32 ? '4px' : '3px',
                }}
              >
                <img
                  src={m.src}
                  alt=""
                  className="object-contain"
                  style={{
                    width: m.size === 32 ? '24px' : '18px',
                    height: m.size === 32 ? '24px' : '18px',
                  }}
                />
              </div>
            ))}

            {/* Glow effects behind some model icons */}
            {floatingModels.map((m, i) => (
              <div
                key={`glow-${i}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: `${m.size}px`,
                  height: `${m.size}px`,
                  left: `${m.left + (m.size === 32 ? -3 : -1)}px`,
                  top: `${m.top + m.size + 2}px`,
                  background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)',
                  filter: 'blur(4px)',
                }}
              />
            ))}
          </div>

          {/* Supporting text (gap handled by parent flex gap-[16px]) */}
          <div
            style={{
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: '16px',
              lineHeight: '24px',
              color: '#FFFFFF',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              Bạn đã hoàn thành 3 lượt trải nghiệm miễn phí. Đăng ký ngay để tiếp tục khám phá sức mạnh của các model AI hàng đầu và lưu lại lịch sử đối đầu.
            </p>
            <p>
              Bạn đã có tài khoản?{' '}
              <button
                onClick={handleLogin}
                style={{
                  fontFamily: "'Be Vietnam Pro', sans-serif",
                  fontSize: '16px',
                  lineHeight: '24px',
                  fontWeight: 400,
                  color: '#FFFFFF',
                  textDecoration: 'underline',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Đăng nhập
              </button>
            </p>
          </div>
        </div>

        {/* Footer with buttons */}
        <div
          className="flex flex-col gap-3 p-6"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <button
            onClick={handleRegister}
            className="w-full h-10 rounded-lg text-sm font-semibold text-white border-none cursor-pointer transition-all hover:brightness-110"
            style={{
              background: '#155EEF',
              boxShadow: '0px 1px 2px rgba(16,24,40,0.05)',
            }}
          >
            Đăng ký ngay
          </button>
          <button
            onClick={handleGoHome}
            className="w-full h-10 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all hover:bg-white/15"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0px 1px 2px rgba(16,24,40,0.05)',
            }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  )
}
