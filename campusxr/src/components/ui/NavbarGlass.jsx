/**
 * NavbarGlass.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top navigation bar — glassmorphism design, VisionOS-inspired refinement.
 *
 * Design tokens (do NOT change glass CSS):
 *   Glass BG   : linear-gradient(247.52deg, rgba(108,99,255,0.17) … rgba(255,255,255,0) …)
 *   Shadow     : inset -2px -2px 100px rgba(255,255,255,0.1), inset 2px 2px 100px rgba(66,66,66,0.1)
 *   Blur       : blur(25px)
 *   Panel r    : 39px   |  Pill r: 50px
 *
 * Typography (Montserrat loaded in index.css):
 *   Wordmark   — 18px / 700 weight / letter-spacing -0.5px
 *   Nav labels — 11px / 600 weight / tracking-widest / uppercase
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from 'react';

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
const GLASS_BG = 'linear-gradient(247.52deg, rgba(108,99,255,0.17) 1.52%, rgba(255,255,255,0) 96.99%)';
const GLASS_SHADOW = 'inset -2px -2px 100px rgba(255,255,255,0.1), inset 2px 2px 100px rgba(66,66,66,0.1)';
const GLASS_BLUR = 'blur(25px)';

/* Active pill: slightly brighter indigo tint to reinforce selection */
const PILL_ACTIVE_BG = 'rgba(108,99,255,0.30)';
const PILL_ACTIVE_BORDER = '2px solid rgba(255,255,255,0.80)';
const PILL_IDLE_BG = 'rgba(255,255,255,0.08)';
const PILL_IDLE_BORDER = '2px solid rgba(255,255,255,0.28)';

/* ─── SVG icon set ─────────────────────────────────────────────────────────── */
const Icons = {
  Admin: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  Info: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Share: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  Maximize: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  Minimize: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  ),
};

/* ─── NavPill ───────────────────────────────────────────────────────────────── */
function NavPill({ label, icon: Icon, active = false, onClick }) {
  const [hovered, setHovered] = useState(false);

  const isHighlit = active || hovered;

  return (
    <button
      id={`nav-pill-${label.toLowerCase()}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-pressed={active}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '50px',
        border: isHighlit ? PILL_ACTIVE_BORDER : PILL_IDLE_BORDER,
        background: isHighlit ? PILL_ACTIVE_BG : PILL_IDLE_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        boxShadow: isHighlit
          ? `${GLASS_SHADOW}, 0 0 14px rgba(108,99,255,0.35)`
          : GLASS_SHADOW,
        /* Typography */
        color: isHighlit ? '#ffffff' : 'rgba(255,255,255,0.72)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        /* Interaction */
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.18s ease',
        transform: hovered && !active ? 'translateY(-1px)' : 'none',
        outline: 'none',
      }}
    >
      {Icon && <Icon />}
      {label}
    </button>
  );
}

/* ─── Main component ────────────────────────────────────────────────────────── */
export default function NavbarGlass({ activeNav = 'ADMIN', onNavClick }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
    onNavClick?.('FULLSCREEN');
  }, [onNavClick]);

  const navItems = [
    { label: 'ADMIN', icon: Icons.Admin },
    { label: 'ABOUT', icon: Icons.Info },
    { label: 'SHARE', icon: Icons.Share },
  ];

  return (
    <div
      className="absolute top-0 left-0 right-0 z-30 pointer-events-none"
      style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
    >

      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div className="pointer-events-auto" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

        {/* Badge circle */}
        <div
          id="navbar-logo-badge"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(108,99,255,0.30)',
            border: '2px solid rgba(255,255,255,0.55)',
            backdropFilter: GLASS_BLUR,
            WebkitBackdropFilter: GLASS_BLUR,
            boxShadow: `${GLASS_SHADOW}, 0 4px 20px rgba(108,99,255,0.50)`,
          }}
        >
          {/* Mini logo mark — two overlapping circles */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="12" r="6" fill="rgba(255,255,255,0.90)" />
            <circle cx="15" cy="12" r="6" fill="rgba(108,99,255,0.75)" />
          </svg>
        </div>

        {/* Wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{
            color: '#ffffff',
            fontSize: '17px',
            fontWeight: 700,
            letterSpacing: '-0.4px',
            fontFamily: 'Montserrat, sans-serif',
          }}>
            Campus<span style={{ color: 'rgba(168,162,255,1)' }}>XR</span>
          </span>
          <span style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: '1px',
          }}>
            Virtual Tour
          </span>
        </div>
      </div>

      {/* ── Nav pills ────────────────────────────────────────────────────────── */}
      <nav
        id="navbar-nav-pills"
        className="pointer-events-auto"
        aria-label="Primary navigation"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderRadius: '39px',
          background: GLASS_BG,
          backdropFilter: GLASS_BLUR,
          WebkitBackdropFilter: GLASS_BLUR,
          boxShadow: GLASS_SHADOW,
          border: '1px solid rgba(255,255,255,0.18)',
        }}
      >
        {navItems.map(({ label, icon }) => (
          <NavPill
            key={label}
            label={label}
            icon={icon}
            active={activeNav === label}
            onClick={() => onNavClick?.(label)}
          />
        ))}

        {/* Divider */}
        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.20)', margin: '0 2px' }} />

        {/* Fullscreen */}
        <NavPill
          label={isFullscreen ? 'EXIT' : 'FULL'}
          icon={isFullscreen ? Icons.Minimize : Icons.Maximize}
          active={isFullscreen}
          onClick={handleFullscreen}
        />
      </nav>
    </div>
  );
}
