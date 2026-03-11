/**
 * SideControls.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Left-side floating vertical control panel — VisionOS-inspired glass.
 *
 * Layout (top→bottom):
 *   ┌──────────────└  D-pad: 3×3 cross grid
 *   │  ↑  │         (up / left / reset-dot / right / down)
 *   │← ● →│
 *   │  ↓  │
 *   └──────────────┘
 *   ―――  divider
 *   [+]  zoom in
 *   [−]  zoom out
 *   ―――  divider
 *   [⛶]  fullscreen toggle
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { GLASS_BG as PANEL_BG, GLASS_SHADOW as PANEL_SHADOW, GLASS_BLUR as BLUR, BTN_BG, BTN_BORDER } from '../../constants/glassTokens';

/* ─── Tiny SVG icons ─────────────────────────────────────────────────────── */
const IC = {
    Up: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
        </svg>
    ),
    Down: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
    Left: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    Right: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    ),
    Dot: () => (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="6" />
        </svg>
    ),
    Plus: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    Minus: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    Fullscreen: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
    ),
    ExitFullscreen: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="10" y1="14" x2="3" y2="21" />
            <line x1="21" y1="3" x2="14" y2="10" />
        </svg>
    ),
};

/* ─── Generic glass button ───────────────────────────────────────────────── */
function GBtn({ icon: Icon, label, onClick, size = 40, glow = 'rgba(200,200,255,0.5)',
                tooltipSide = 'right' }) {
    const [hov, setHov] = useState(false);
    const [prs, setPrs] = useState(false);
    return (
        <div style={{ position: 'relative', display: 'flex',
                      justifyContent: 'center', alignItems: 'center' }}>
            <button
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => { setHov(false); setPrs(false); }}
                onMouseDown={() => setPrs(true)}
                onMouseUp={() => setPrs(false)}
                onClick={onClick}
                title={label}
                aria-label={label}
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    border: hov ? '2px solid rgba(255,255,255,0.68)' : BTN_BORDER,
                    background: hov ? 'rgba(255,255,255,0.16)' : BTN_BG,
                    backdropFilter: BLUR,
                    WebkitBackdropFilter: BLUR,
                    boxShadow: hov ? `${PANEL_SHADOW}, 0 0 18px ${glow}` : PANEL_SHADOW,
                    color: hov ? '#fff' : 'rgba(255,255,255,0.75)',
                    transform: prs ? 'scale(0.88)' : hov ? 'scale(1.08)' : 'scale(1)',
                    transition: 'background 0.14s ease, border-color 0.14s ease, color 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none',
                    flexShrink: 0,
                }}
            >
                <Icon />
            </button>
            {hov && (
                <span style={{
                    position: 'absolute',
                    ...(tooltipSide === 'right'
                        ? { left: 'calc(100% + 10px)' }
                        : { right: 'calc(100% + 10px)' }),
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 100,
                }}>
                    {label}
                </span>
            )}
        </div>
    );
}

/* ─── Divider ─────────────────────────────────────────────────────────────── */
function Divider() {
    return (
        <div style={{
            width: '28px', height: '1px',
            background: 'rgba(255,255,255,0.16)',
            margin: '1px auto',
            flexShrink: 0,
        }} />
    );
}

/* ─── Main component ───────────────────────────────────────────────────────────── */
export default function SideControls({
    onPanUp, onPanDown, onPanLeft, onPanRight, onRefresh, onZoomIn, onZoomOut, onFullscreen,
}) {
    const [isFS, setIsFS] = useState(false);

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
            setIsFS(true);
        } else {
            document.exitFullscreen?.();
            setIsFS(false);
        }
        onFullscreen?.();
    };

    // D-pad button size
    const D = 36;

    return (
        <div
            id="side-controls-panel"
            style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 30,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'center',
                padding: '14px 10px',
                background: PANEL_BG,
                backdropFilter: BLUR,
                WebkitBackdropFilter: BLUR,
                boxShadow: PANEL_SHADOW,
                borderRadius: '39px',
                border: '1px solid rgba(255,255,255,0.18)',
            }}
        >
            {/* ─────────── D-pad ─────────── */}
            {/* Up */}
            <GBtn icon={IC.Up}    label="Look Up"    onClick={onPanUp}    size={D}
                  glow="rgba(168,162,255,0.55)" />
            {/* Left / Reset-dot / Right */}
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <GBtn icon={IC.Left}  label="Look Left"  onClick={onPanLeft}  size={D}
                      glow="rgba(168,162,255,0.55)" />
                <GBtn icon={IC.Dot}   label="Reset View"  onClick={onRefresh}  size={D}
                      glow="rgba(168,162,255,0.55)" />
                <GBtn icon={IC.Right} label="Look Right" onClick={onPanRight} size={D}
                      glow="rgba(168,162,255,0.55)" />
            </div>
            {/* Down */}
            <GBtn icon={IC.Down}  label="Look Down"   onClick={onPanDown}  size={D}
                  glow="rgba(168,162,255,0.55)" />

            <Divider />

            {/* ────────── Zoom ────────── */}
            <GBtn icon={IC.Plus}  label="Zoom In"   onClick={onZoomIn}  size={40}
                  glow="rgba(52,211,153,0.55)" />
            <GBtn icon={IC.Minus} label="Zoom Out"  onClick={onZoomOut} size={40}
                  glow="rgba(96,165,250,0.55)" />

            <Divider />

            {/* ─────── Fullscreen ─────── */}
            <GBtn
                icon={isFS ? IC.ExitFullscreen : IC.Fullscreen}
                label={isFS ? 'Exit Fullscreen' : 'Fullscreen'}
                onClick={handleFullscreen}
                size={40}
                glow="rgba(251,191,36,0.55)"
            />
        </div>
    );
}
