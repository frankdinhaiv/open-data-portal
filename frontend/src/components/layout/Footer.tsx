import vigenLogo from '../../assets/logos/vigen-logo.svg'
import vigenTagline from '../../assets/logos/vigen-tagline.svg'
import bottomBg from '../../assets/backgrounds/bottom-bg.svg'
import { useBreakpoint } from './Topbar'

function ViGenLogo() {
  return (
    <div
      className="relative overflow-hidden shrink-0"
      style={{ width: '141px', height: '70px' }}
    >
      <div className="absolute" style={{ top: 0, left: 0, right: '0.02%', bottom: '25.15%' }}>
        <img src={vigenLogo} alt="ViGen" className="absolute block w-full h-full" style={{ maxWidth: 'none' }} />
      </div>
      <div className="absolute" style={{ top: '80.64%', left: '0.26%', right: '7.2%', bottom: '0.62%' }}>
        <img src={vigenTagline} alt="" aria-hidden="true" className="absolute block w-full h-full" style={{ maxWidth: 'none' }} />
      </div>
    </div>
  )
}

function Dot({ left, top, opacity = 1 }: { left: string; top: string; opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none hidden lg:block"
      style={{
        left,
        top,
        width: '10px',
        height: '10px',
        background: '#FFDE92',
        opacity,
        transform: 'rotate(-90deg)',
      }}
    />
  )
}

export function Footer() {
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
  const isCompact = bp !== 'desktop'

  return (
    <footer
      className="relative shrink-0 flex flex-col items-center overflow-hidden"
      style={{
        width: '100%',
        background: 'linear-gradient(to top, #00194A 29.808%, rgba(0, 34, 102, 0) 100%)',
        gap: isMobile ? '16px' : '32px',
      }}
    >
      {/* Content */}
      <div
        className="flex shrink-0"
        style={{
          width: '100%',
          maxWidth: '1200px',
          padding: isMobile ? '24px 16px' : '32px 24px',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'flex-start',
          justifyContent: 'space-between',
          gap: isMobile ? '24px' : '0',
        }}
      >
        {/* Left: Logo & copyright */}
        <div
          className="flex flex-col items-start shrink-0"
          style={{
            width: isMobile ? '100%' : '357px',
            alignItems: isMobile ? 'center' : 'flex-start',
            justifyContent: 'space-between',
            alignSelf: isMobile ? 'center' : 'stretch',
            gap: isMobile ? '12px' : '0',
          }}
        >
          <ViGenLogo />
          <p
            className="shrink-0"
            style={{
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: isMobile ? '12px' : '14px',
              lineHeight: '20px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.75)',
              textAlign: isMobile ? 'center' : 'left',
              whiteSpace: isMobile ? 'normal' : 'nowrap',
            }}
          >
            © 2025-2026 AI for Vietnam Foundation. All rights reserved.
          </p>
        </div>

        {/* Right: Links */}
        <div
          className="flex shrink-0"
          style={{
            gap: isMobile ? '48px' : isCompact ? '64px' : '128px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: '14px',
            lineHeight: '20px',
            color: '#FFFFFF',
          }}
        >
          <div className="flex flex-col items-start shrink-0" style={{ gap: '24px' }}>
            <span className="shrink-0" style={{ fontWeight: 700 }}>TÀI LIỆU</span>
            <a href="#" className="shrink-0 no-underline" style={{ fontWeight: 400, opacity: 0.75, color: '#FFFFFF' }}>Hướng dẫn</a>
            <a href="#" className="shrink-0 no-underline" style={{ fontWeight: 400, opacity: 0.75, color: '#FFFFFF' }}>Điều khoản sử dụng</a>
          </div>
          <div className="flex flex-col items-start shrink-0" style={{ gap: '24px' }}>
            <span className="shrink-0" style={{ fontWeight: 700 }}>VỀ CHÚNG TÔI</span>
            <a href="#" className="shrink-0 no-underline" style={{ fontWeight: 400, opacity: 0.75, color: '#FFFFFF' }}>Giới thiệu</a>
            <a href="#" className="shrink-0 no-underline" style={{ fontWeight: 400, opacity: 0.75, color: '#FFFFFF' }}>Liên hệ</a>
          </div>
        </div>
      </div>

      {/* bottom-bg cityscape */}
      <div className="relative shrink-0 w-full" style={{ height: '62px' }}>
        <img
          src={bottomBg}
          alt=""
          aria-hidden="true"
          className="absolute block w-full h-full"
          style={{ maxWidth: 'none' }}
        />
      </div>

      {/* Gold dots — hide on small screens */}
      <Dot left="calc(50% - 665px)" top="156px" />
      <Dot left="calc(50% - 653px)" top="92px" opacity={0.5} />
      <Dot left="calc(50% - 681px)" top="77px" opacity={0.75} />
      <Dot left="calc(50% - 591px)" top="169px" />
      <Dot left="calc(50% - 359px)" top="197px" />
      <Dot left="calc(50% - 251px)" top="74px" opacity={0.5} />
      <Dot left="calc(50% - 191px)" top="176px" />
      <Dot left="calc(50% + 608px)" top="92px" opacity={0.5} />
      <Dot left="calc(50% + 397px)" top="140px" />
      <Dot left="calc(50% + 480px)" top="148px" opacity={0.5} />
      <Dot left="calc(50% + 568px)" top="173px" />
      <Dot left="calc(50% + 682px)" top="35px" opacity={0.75} />
    </footer>
  )
}
