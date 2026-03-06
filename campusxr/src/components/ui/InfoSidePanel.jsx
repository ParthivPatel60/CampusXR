import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import GlassPanel from './GlassPanel';

export default function InfoSidePanel({ showInfoPanel, setShowInfoPanel, activeHotspot }) {
  const infoPanelRef = useRef(null);

  useGSAP(() => {
    let mm = gsap.matchMedia();

    mm.add("(max-width: 767px)", () => {
      // Mobile - Slide up
      if (showInfoPanel) {
        gsap.to(infoPanelRef.current, {
          x: 0,
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power4.out',
          pointerEvents: 'auto'
        });
      } else {
        gsap.to(infoPanelRef.current, {
          x: 0,
          y: 60,
          opacity: 0,
          duration: 0.4,
          ease: 'power3.in',
          pointerEvents: 'none'
        });
      }
    });

    mm.add("(min-width: 768px)", () => {
      // Desktop - Slide in from right (more pronounced slide)
      if (showInfoPanel) {
        gsap.to(infoPanelRef.current, {
          x: 0,
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power4.out',
          pointerEvents: 'auto'
        });
      } else {
        gsap.to(infoPanelRef.current, {
          x: 100, // Move further right when hidden
          y: 0,
          opacity: 0,
          duration: 0.4,
          ease: 'power3.in',
          pointerEvents: 'none'
        });
      }
    });

    return () => mm.revert();
  }, [showInfoPanel]);

  const G_BG = 'linear-gradient(247.52deg, rgba(108, 99, 255, 0.17) 1.52%, rgba(255, 255, 255, 0) 96.99%)';
  const G_BLUR = 'blur(25px)';
  const G_SHADOW = 'rgba(255, 255, 255, 0.1) -2px -2px 100px inset, rgba(66, 66, 66, 0.1) 2px 2px 100px inset';

  return (
    <>
      {/* ═══ INFO SIDE PANEL ══════════════════════════════════════════════ */}
      <div
        ref={infoPanelRef}
        className="pointer-events-none"
        style={{
          position: 'absolute',
          top: '80px',
          bottom: '24px',
          right: '20px',
          width: '360px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 50,
          transform: 'translateX(110%)',
          opacity: 0,
          /* Glass (unchanged) */
          background: G_BG,
          backdropFilter: G_BLUR,
          WebkitBackdropFilter: G_BLUR,
          boxShadow: `${G_SHADOW}, 0 24px 64px rgba(0,0,0,0.40)`,
          borderRadius: '39px',
          border: '1px solid rgba(255,255,255,0.20)',
          overflow: 'hidden',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            color: 'rgba(168,162,255,1)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}>
            Point of Interest
          </span>
          <button
            onClick={() => setShowInfoPanel(false)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.10)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              color: 'rgba(255,255,255,0.65)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.20)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Image */}
        {activeHotspot?.image && (
          <img
            src={activeHotspot.image}
            alt={activeHotspot.text}
            style={{
              borderRadius: '20px',
              objectFit: 'cover',
              height: '180px',
              width: '100%',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          />
        )}

        {/* Title */}
        <h2 style={{
          margin: 0,
          color: '#ffffff',
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '-0.3px',
          fontFamily: 'Montserrat, sans-serif',
          lineHeight: 1.2,
        }}>
          {activeHotspot?.text || 'Hotspot Detail'}
        </h2>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.14)', flexShrink: 0 }} />

        {/* Description */}
        <p style={{
          margin: 0,
          color: 'rgba(255,255,255,0.68)',
          fontSize: '14px',
          fontWeight: 400,
          lineHeight: 1.65,
          overflowY: 'auto',
          flex: 1,
        }}>
          {activeHotspot?.description ||
            'Click on a coloured marker in the panorama to explore this location and see detailed information about the room, equipment, and facilities.'}
        </p>
      </div>
    </>
  );
}