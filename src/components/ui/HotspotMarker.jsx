/**
 * HotspotMarker.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Clickable panorama hotspot — VisionOS-inspired refinement.
 *
 * Design improvements (glass template unchanged):
 *   • Outer ring: thicker 3px coloured stroke for visibility on bright sky
 *   • Inner dot: full-fill with soft inner glow
 *   • Pulse halo: type-coloured animated ring (not generic white)
 *   • Hover: scale(1.35) + intensified glow shadow
 *   • Label tooltip: dark glass pill, 11px/500, appears 0.15s after hover
 *   • Type indicator icon (ℹ or ➜) inside the dot for instant recognition
 *
 * Color system:
 *   Info       : ring #38BDF8 (sky blue), dot #0EA5E9, glow sky/50
 *   Navigation : ring #34D399 (emerald),  dot #10B981, glow emerald/50
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useState } from 'react';

const TYPE = {
    info: {
        ring: '#38BDF8',
        dot: '#0EA5E9',
        glow: 'rgba(56,189,248,0.60)',
        glowHov: 'rgba(56,189,248,0.85)',
        icon: 'ℹ',
    },
    navigation: {
        ring: '#34D399',
        dot: '#10B981',
        glow: 'rgba(52,211,153,0.60)',
        glowHov: 'rgba(52,211,153,0.85)',
        icon: '›',
    },
};

export default function HotspotMarker({
    topPct = 50,
    leftPct = 50,
    label = 'Hotspot',
    type = 'navigation',
    onClick,
}) {
    const [hovered, setHovered] = useState(false);
    const c = TYPE[type] ?? TYPE.navigation;

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={label}
            aria-label={label}
            style={{
                position: 'absolute',
                top: `${topPct}%`,
                left: `${leftPct}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                outline: 'none',
            }}
        >
            {/* ── Outer pulsing halo ── */}
            <span style={{
                position: 'absolute',
                inset: '-8px',
                borderRadius: '50%',
                background: c.glow,
                opacity: hovered ? 0 : 0.55,
                animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
                pointerEvents: 'none',
            }} />

            {/* ── Outer ring ── */}
            <span style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: hovered ? '48px' : '38px',
                height: hovered ? '48px' : '38px',
                borderRadius: '50%',
                border: `3px solid ${c.ring}`,
                background: hovered ? `${c.glow}` : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                boxShadow: hovered
                    ? `0 0 0 6px ${c.glow.replace('0.60', '0.20')}, 0 0 28px ${c.glowHov}, 0 4px 16px rgba(0,0,0,0.40)`
                    : `0 0 16px ${c.glow}, 0 4px 12px rgba(0,0,0,0.30)`,
                transition: 'all 0.18s ease',
            }}>
                {/* ── Inner dot ── */}
                <span style={{
                    width: hovered ? '18px' : '14px',
                    height: hovered ? '18px' : '14px',
                    borderRadius: '50%',
                    background: c.dot,
                    boxShadow: `0 0 10px ${c.glow}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.18s ease',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 800,
                    lineHeight: 1,
                }}>
                    {c.icon}
                </span>
            </span>

            {/* ── Label tooltip ── */}
            <span style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: 'calc(100% + 10px)',
                whiteSpace: 'nowrap',
                background: 'rgba(0,0,0,0.70)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `1px solid ${c.ring}44`,
                color: '#fff',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.03em',
                padding: '4px 12px',
                borderRadius: '20px',
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.15s ease',
                pointerEvents: 'none',
                zIndex: 10,
            }}>
                {label}
            </span>
        </button>
    );
}
