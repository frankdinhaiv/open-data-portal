import vigenLogo from '../../assets/logos/vigen-logo.svg'
import vigenTagline from '../../assets/logos/vigen-tagline.svg'
import bottomBg from '../../assets/backgrounds/bottom-bg.svg'

/*
 * Footer — matches Figma node 2:4475 (1920×266)
 *
 * Structure:
 *   Footer (1920w, gradient-to-top from #00194A at 29.8%)
 *   ├── Content (1200w centered, py-32, flex justify-between)
 *   │   ├── Logo & copyright (w-357, flex-col justify-between self-stretch)
 *   │   └── Links (flex gap-128)
 *   ├── bottom-bg (full width, h-62)
 *   └── bg-img (gold dots, 3 groups of 10×10 squares)
 */

function ViGenLogo() {
  // Figma node 2:4445 — 141.22×70px, logo top 75% + tagline bottom 19%
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

// Gold dot — 10×10 square, rotated -90°, color #FFDE92
// Uses calc(50% ± Xpx) for responsive center-relative positioning matching Figma
function Dot({ left, top, opacity = 1 }: { left: string; top: string; opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none"
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
  return (
    <footer
      className="relative shrink-0 flex flex-col items-center overflow-hidden"
      style={{
        width: '100%',
        background: 'linear-gradient(to top, #00194A 29.808%, rgba(0, 34, 102, 0) 100%)',
        gap: '32px',
      }}
    >
      {/* Content — 1200px centered, py-32 */}
      <div
        className="flex items-start justify-between shrink-0"
        style={{ width: '1200px', padding: '32px 0' }}
      >
        {/* Left: Logo & copyright — w-357, flex-col justify-between self-stretch */}
        <div
          className="flex flex-col items-start justify-between self-stretch shrink-0"
          style={{ width: '357px' }}
        >
          <ViGenLogo />
          <p
            className="shrink-0 whitespace-nowrap"
            style={{
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: '14px',
              lineHeight: '20px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.75)',
              textAlign: 'center',
            }}
          >
            © 2025-2026 AI for Vietnam Foundation. All rights reserved.
          </p>
        </div>

        {/* Right: Links — flex gap-128 */}
        <div
          className="flex items-center shrink-0"
          style={{
            gap: '128px',
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: '14px',
            lineHeight: '20px',
            color: '#FFFFFF',
          }}
        >
          {/* TÀI LIỆU column */}
          <div className="flex flex-col items-start shrink-0" style={{ gap: '24px' }}>
            <span className="shrink-0" style={{ fontWeight: 700 }}>TÀI LIỆU</span>
            <a href="#" className="shrink-0 no-underline" style={{ fontWeight: 400, opacity: 0.75, color: '#FFFFFF' }}>Hướng dẫn</a>
            <a href="#" className="shrink-0 no-underline" style={{ fontWeight: 400, opacity: 0.75, color: '#FFFFFF' }}>Điều khoản sử dụng</a>
          </div>
          {/* VỀ CHÚNG TÔI column */}
          <div className="flex flex-col items-start shrink-0" style={{ gap: '24px' }}>
            <span className="shrink-0" style={{ fontWeight: 700 }}>VỀ CHÚNG TÔI</span>
            <a href="#" className="shrink-0 no-underline" style={{ fontWeight: 400, opacity: 0.75, color: '#FFFFFF' }}>Giới thiệu</a>
            <a href="#" className="shrink-0 no-underline" style={{ fontWeight: 400, opacity: 0.75, color: '#FFFFFF' }}>Liên hệ</a>
          </div>
        </div>
      </div>

      {/* bottom-bg — cityscape SVG, full width, h-62 */}
      <div className="relative shrink-0 w-full" style={{ height: '62px' }}>
        <img
          src={bottomBg}
          alt=""
          aria-hidden="true"
          className="absolute block w-full h-full"
          style={{ maxWidth: 'none' }}
        />
      </div>

      {/* Gold dots — 3 groups, center-relative calc(50% ± Xpx) from Figma CSS */}

      {/* Group 1 — left cluster */}
      <Dot left="calc(50% - 665px)" top="156px" />
      <Dot left="calc(50% - 653px)" top="92px"  opacity={0.5} />
      <Dot left="calc(50% - 681px)" top="77px"  opacity={0.75} />
      <Dot left="calc(50% - 591px)" top="169px" />

      {/* Group 2 — center-left cluster */}
      <Dot left="calc(50% - 359px)" top="197px" />
      <Dot left="calc(50% - 251px)" top="74px"  opacity={0.5} />
      <Dot left="calc(50% - 191px)" top="176px" />

      {/* Group 3 — right cluster */}
      <Dot left="calc(50% + 608px)" top="92px"  opacity={0.5} />
      <Dot left="calc(50% + 397px)" top="140px" />
      <Dot left="calc(50% + 480px)" top="148px" opacity={0.5} />
      <Dot left="calc(50% + 568px)" top="173px" />
      <Dot left="calc(50% + 682px)" top="35px"  opacity={0.75} />
    </footer>
  )
}
