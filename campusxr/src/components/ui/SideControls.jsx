/**
 * SideControls.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Left-side floating vertical control panel — VisionOS-inspired refinement.
 *
 * Glass CSS is UNCHANGED:
 *   Panel  : background linear-gradient indigo, blur(25px), boxShadow inset, 39px radius
 *   Buttons: rgba(255,255,255,0.10) bg, 2px rgba(255,255,255,0.30) border, 50px radius
 *
 * Improvements:
 *   • 44px touch-target buttons (accessibility minimum)
 *   • Coloured glow on hover per action type
 *   • Active press scale(0.92) feedback
 *   • Tooltip labels on hover (no DOM tooltip library needed)
 *   • Refined icon stroke weight (2px → 1.75px for cleaner look)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';

/* ─── Glass tokens (UNCHANGED) ────────────────────────────────────────────── */
const PANEL_BG = 'linear-gradient(247.52deg, rgba(108,99,255,0.17) 1.52%, rgba(255,255,255,0) 96.99%)';
const PANEL_SHADOW = 'inset -2px -2px 100px rgba(255,255,255,0.1), inset 2px 2px 100px rgba(66,66,66,0.1)';
const BLUR = 'blur(25px)';
const BTN_BG = 'rgba(255,255,255,0.10)';
const BTN_BORDER = '2px solid rgba(255,255,255,0.30)';

/* ─── SVG Icons ────────────────────────────────────────────────────────────── */
const Icons = {
    Refresh: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
    ),
    ZoomIn: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
    ),
    ZoomOut: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
    ),
    Move: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
    ),
};

/* ─── Single control button ─────────────────────────────────────────────────── */
function CtrlBtn({ icon: Icon, label, onClick, glowColor = 'rgba(200,200,255,0.55)' }) {
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    return (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <button
                id={`side-ctrl-${label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => { setHovered(false); setPressed(false); }}
                onMouseDown={() => setPressed(true)}
                onMouseUp={() => setPressed(false)}
                title={label}
                aria-label={label}
                style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50px',
                    border: hovered
                        ? `2px solid rgba(255,255,255,0.70)`
                        : BTN_BORDER,
                    background: hovered ? 'rgba(255,255,255,0.16)' : BTN_BG,
                    backdropFilter: BLUR,
                    WebkitBackdropFilter: BLUR,
                    boxShadow: hovered
                        ? `${PANEL_SHADOW}, 0 0 20px ${glowColor}`
                        : PANEL_SHADOW,
                    /* Icon color */
                    color: hovered ? '#ffffff' : 'rgba(255,255,255,0.78)',
                    /* Feedback */
                    transform: pressed ? 'scale(0.92)' : hovered ? 'scale(1.06)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none',
                }}
            >
                <Icon />
            </button>

            {/* Floating tooltip */}
            {hovered && (
                <span style={{
                    position: 'absolute',
                    left: 'calc(100% + 10px)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.72)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.15)',
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

/* ─── Divider line ─────────────────────────────────────────────────────────── */
function Divider() {
    return (
        <div style={{
            width: '24px',
            height: '1px',
            background: 'rgba(255,255,255,0.18)',
            margin: '2px auto',
        }} />
    );
}

/* ─── Main component ────────────────────────────────────────────────────────── */
export default function SideControls({ onRefresh, onZoomIn, onZoomOut, onNavigate }) {
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
                padding: '12px 10px',
                /* Glass panel (UNCHANGED template) */
                background: PANEL_BG,
                backdropFilter: BLUR,
                WebkitBackdropFilter: BLUR,
                boxShadow: PANEL_SHADOW,
                borderRadius: '39px',
                border: '1px solid rgba(255,255,255,0.18)',
            }}
        >
            <CtrlBtn icon={Icons.Refresh} label="Refresh Scene" onClick={onRefresh} glowColor="rgba(168,162,255,0.6)" />
            <Divider />
            <CtrlBtn icon={Icons.ZoomIn} label="Zoom In" onClick={onZoomIn} glowColor="rgba(52,211,153,0.6)" />
            <CtrlBtn icon={Icons.ZoomOut} label="Zoom Out" onClick={onZoomOut} glowColor="rgba(96,165,250,0.6)" />
            <Divider />
            <CtrlBtn icon={Icons.Move} label="Navigate / Pan" onClick={onNavigate} glowColor="rgba(251,191,36,0.6)" />
        </div>
    );
}
