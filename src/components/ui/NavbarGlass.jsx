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

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import logoSrc from '../../assets/logo.png';
import { GLASS_SHADOW, GLASS_BLUR, PILL_ACTIVE_BG, PILL_ACTIVE_BORDER, PILL_IDLE_BG, PILL_IDLE_BORDER } from '../../constants/glassTokens';

function runGlassShimmer(shimmerEl, { peak = 0.28, duration = 1.08 } = {}) {
  if (!shimmerEl) return;
  gsap.killTweensOf(shimmerEl);
  gsap.set(shimmerEl, { xPercent: -165, opacity: 0 });
  gsap.timeline({ defaults: { overwrite: true } })
    .to(shimmerEl, { opacity: peak, duration: 0.14, ease: 'power1.out' })
    .to(shimmerEl, { xPercent: 190, duration, ease: 'power2.inOut' }, 0)
    .to(shimmerEl, { opacity: 0, duration: 0.22, ease: 'power1.in' }, '>-0.18');
}

function MagneticWrap({ children, strength = 8, rotate = 1.2 }) {
  const wrapRef = useRef(null);
  const magRef = useRef({ xTo: null, yTo: null, rTo: null });
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotionRef.current || !wrapRef.current) return;

    const el = wrapRef.current;
    magRef.current.xTo = gsap.quickTo(el, 'x', { duration: 0.24, ease: 'power3.out' });
    magRef.current.yTo = gsap.quickTo(el, 'y', { duration: 0.24, ease: 'power3.out' });
    magRef.current.rTo = gsap.quickTo(el, 'rotation', { duration: 0.3, ease: 'power3.out' });

    return () => {
      gsap.set(el, { clearProps: 'transform' });
    };
  }, []);

  const handlePointerMove = (e) => {
    if (reducedMotionRef.current || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const cx = gsap.utils.clamp(-1, 1, nx);
    const cy = gsap.utils.clamp(-1, 1, ny);
    magRef.current.xTo?.(cx * strength);
    magRef.current.yTo?.(cy * strength);
    magRef.current.rTo?.(cx * rotate);
  };

  const handlePointerLeave = () => {
    if (reducedMotionRef.current) return;
    magRef.current.xTo?.(0);
    magRef.current.yTo?.(0);
    magRef.current.rTo?.(0);
  };

  return (
    <div
      ref={wrapRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ display: 'inline-flex', willChange: 'transform' }}
    >
      {children}
    </div>
  );
}

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
  Lock: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Cube: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
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
        transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
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
export default function NavbarGlass({
  is3DMode = false,
  onToggle3D,
  show3DToggle = false,
  onAdminClick,
}) {
  const toggleBtnRef = useRef(null);
  const cubeIconRef = useRef(null);
  const betaBadgeRef = useRef(null);
  const pulseTlRef = useRef(null);
  const mountedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const idleSweepIndexRef = useRef(0);
  const logoShimmerRef = useRef(null);
  const toggleShimmerRef = useRef(null);
  const adminShimmerRef = useRef(null);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (reducedMotionRef.current) return;
    const sweepTargets = [logoShimmerRef, toggleShimmerRef, adminShimmerRef];
    const runIdleSweep = () => {
      const idx = idleSweepIndexRef.current % sweepTargets.length;
      idleSweepIndexRef.current += 1;
      runGlassShimmer(sweepTargets[idx]?.current, { peak: 0.2, duration: 1.26 });
    };

    const firstSweepTimer = window.setTimeout(runIdleSweep, 1200);
    const idleTimer = window.setInterval(runIdleSweep, 12000);
    return () => {
      window.clearTimeout(firstSweepTimer);
      window.clearInterval(idleTimer);
    };
  }, [show3DToggle]);

  useEffect(() => {
    if (!show3DToggle || !toggleBtnRef.current) return;

    if (reducedMotionRef.current) return;

    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    pulseTlRef.current?.kill();

    const glow = is3DMode
      ? `0 0 26px rgba(251,191,36,0.62)`
      : `0 0 20px rgba(108,99,255,0.45)`;

    const tl = gsap.timeline();
    tl.fromTo(
      toggleBtnRef.current,
      { scale: 1 },
      {
        scale: 1.06,
        boxShadow: `${GLASS_SHADOW}, ${glow}`,
        duration: 0.15,
        ease: 'power2.out',
      },
    )
      .to(toggleBtnRef.current, {
        scale: 1,
        duration: 0.22,
        ease: 'power2.inOut',
        clearProps: 'transform,boxShadow',
      })
      .fromTo(
        cubeIconRef.current,
        { scale: 1, rotate: 0 },
        {
          scale: 1.22,
          rotate: is3DMode ? 16 : -16,
          duration: 0.14,
          ease: 'power1.inOut',
          yoyo: true,
          repeat: 1,
          clearProps: 'transform',
        },
        0,
      )
      .fromTo(
        betaBadgeRef.current,
        { scale: 1 },
        {
          scale: 1.12,
          duration: 0.12,
          ease: 'power1.out',
          yoyo: true,
          repeat: 1,
          clearProps: 'transform',
        },
        0.03,
      );

    pulseTlRef.current = tl;
    runGlassShimmer(toggleShimmerRef.current, {
      peak: is3DMode ? 0.34 : 0.24,
      duration: is3DMode ? 0.95 : 1.08,
    });
  }, [is3DMode, show3DToggle]);

  return (
    <div
      className="absolute top-0 left-0 right-0 z-30 pointer-events-none"
      style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
    >

      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div
        id="navbar-logo-badge"
        className="pointer-events-auto"
        style={{
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
          display: 'flex',
          alignItems: 'center',
          padding: '8px 10px',
          borderRadius: '18px',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.26) 0%, rgba(210,224,244,0.18) 100%)',
          backdropFilter: 'blur(18px) saturate(130%)',
          WebkitBackdropFilter: 'blur(18px) saturate(130%)',
          border: '1px solid rgba(255,255,255,0.42)',
          boxShadow: '0 10px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.34), 0 0 0 1px rgba(15,23,42,0.18)',
        }}
      >
        <span
          ref={logoShimmerRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-30%',
            bottom: '-30%',
            left: '-45%',
            width: '46%',
            background: 'linear-gradient(110deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.36) 50%, rgba(255,255,255,0) 100%)',
            mixBlendMode: 'screen',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
        <img
          src={logoSrc}
          alt="CampusXR"
          draggable={false}
          style={{
            height: '54px',
            width: 'auto',
            objectFit: 'contain',
            userSelect: 'none',
            filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.40))',
            position: 'relative',
            zIndex: 1,
          }}
        />
      </div>

      {/* ── Center spacer (nav pills removed) ─────────────────────────────── */}
      <div id="navbar-nav-pills" />

      {/* ── Right side — Admin Login + 3DGS toggle ─────────────────────────── */}
      <div
        className="pointer-events-auto"
        style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        {/* 3D Mode toggle — only shown when the active room has a splat3DUrl */}
        {show3DToggle && (
          <MagneticWrap strength={8} rotate={1.2}>
            <button
              ref={toggleBtnRef}
              id="navbar-3d-toggle"
              onClick={onToggle3D}
              onMouseEnter={() => {
                if (reducedMotionRef.current) return;
                runGlassShimmer(toggleShimmerRef.current, { peak: 0.26, duration: 1.04 });
              }}
              title="Next-gen neural rendering demo (Beta)"
              style={{
                position: 'relative',
                overflow: 'hidden',
                isolation: 'isolate',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 16px',
                borderRadius: '50px',
                background: is3DMode ? 'rgba(245,158,11,0.22)' : PILL_IDLE_BG,
                backdropFilter: GLASS_BLUR,
                WebkitBackdropFilter: GLASS_BLUR,
                boxShadow: is3DMode
                  ? `${GLASS_SHADOW}, 0 0 16px rgba(251,191,36,0.30)`
                  : GLASS_SHADOW,
                border: is3DMode ? '2px solid rgba(251,191,36,0.80)' : PILL_IDLE_BORDER,
                color: is3DMode ? '#fde68a' : 'rgba(255,255,255,0.72)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
              }}
            >
              <span
                ref={toggleShimmerRef}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '-45%',
                  bottom: '-45%',
                  left: '-42%',
                  width: '40%',
                  background: 'linear-gradient(112deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.34) 50%, rgba(255,255,255,0) 100%)',
                  mixBlendMode: 'screen',
                  opacity: 0,
                  pointerEvents: 'none',
                }}
              />
              <span style={{ position: 'relative', zIndex: 1, color: is3DMode ? '#fbbf24' : 'inherit', display: 'flex' }}>
                <span ref={cubeIconRef} style={{ display: 'flex', transformOrigin: '50% 50%' }}>
                  <Icons.Cube />
                </span>
              </span>
              <span style={{ position: 'relative', zIndex: 1 }}>3D Mode</span>
              <span ref={betaBadgeRef} style={{
                position: 'relative',
                zIndex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                padding: '1px 6px',
                borderRadius: '20px',
                background: 'rgba(251,191,36,0.18)',
                border: '1.5px solid rgba(251,191,36,0.65)',
                color: '#fbbf24',
                fontSize: '8px',
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}>
                Beta
              </span>
            </button>
          </MagneticWrap>
        )}

        {/* Admin Login */}
        <MagneticWrap strength={8} rotate={1.2}>
          <button
            id="navbar-admin-btn"
            onClick={onAdminClick}
            title="Admin login"
            style={{
              position: 'relative',
              overflow: 'hidden',
              isolation: 'isolate',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              borderRadius: '50px',
              background: PILL_IDLE_BG,
              backdropFilter: GLASS_BLUR,
              WebkitBackdropFilter: GLASS_BLUR,
              boxShadow: GLASS_SHADOW,
              border: PILL_IDLE_BORDER,
              color: 'rgba(255,255,255,0.72)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={e => {
              if (!reducedMotionRef.current) {
                runGlassShimmer(adminShimmerRef.current, { peak: 0.24, duration: 1.04 });
              }
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = PILL_ACTIVE_BG;
              e.currentTarget.style.border = PILL_ACTIVE_BORDER;
              e.currentTarget.style.boxShadow = `${GLASS_SHADOW}, 0 0 14px rgba(108,99,255,0.35)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.72)';
              e.currentTarget.style.background = PILL_IDLE_BG;
              e.currentTarget.style.border = PILL_IDLE_BORDER;
              e.currentTarget.style.boxShadow = GLASS_SHADOW;
            }}
          >
            <span
              ref={adminShimmerRef}
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '-45%',
                bottom: '-45%',
                left: '-42%',
                width: '40%',
                background: 'linear-gradient(112deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.34) 50%, rgba(255,255,255,0) 100%)',
                mixBlendMode: 'screen',
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex' }}>
              <Icons.Lock />
            </span>
            <span style={{ position: 'relative', zIndex: 1 }}>Admin</span>
          </button>
        </MagneticWrap>
      </div>
    </div>
  );
}
