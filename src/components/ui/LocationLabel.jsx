/**
 * LocationLabel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Bottom-left glass pill showing current room + department.
 *
 * Improvements (glass CSS unchanged):
 *   • White text on glass for max contrast over panoramas
 *   • Animated live-dot indicator (green pulse) to signal 360° is active
 *   • Tighter typography: room name 14px/600, dept 10px/500 uppercase
 *   • Consistent 8px gap inside pill
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

/* Location pin SVG */
function PinIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, marginTop: '1px' }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

/* 360 badge */
function Badge360() {
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '1px 7px',
            borderRadius: '20px',
            background: 'rgba(108,99,255,0.35)',
            border: '1px solid rgba(168,162,255,0.55)',
            color: 'rgba(200,196,255,1)',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            lineHeight: 1.6,
        }}>
            360°
        </span>
    );
}

export default function LocationLabel({ location = 'Terrace', dept = '' }) {
    const roomTextRef = useRef(null);
    const deptTextRef = useRef(null);

    const roomChars = useMemo(() => Array.from(String(location || '')), [location]);
    const deptWords = useMemo(
        () => String(dept || '').trim().split(/\s+/).filter(Boolean),
        [dept],
    );

    useGSAP(() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const roomEls = roomTextRef.current
            ? Array.from(roomTextRef.current.querySelectorAll('[data-room-char="1"]'))
            : [];
        const deptEls = deptTextRef.current
            ? Array.from(deptTextRef.current.querySelectorAll('[data-dept-word="1"]'))
            : [];

        if (!roomEls.length && !deptEls.length) return;

        gsap.killTweensOf([...roomEls, ...deptEls]);
        if (reduced) {
            gsap.set([...roomEls, ...deptEls], { clearProps: 'all', opacity: 1 });
            return;
        }

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        if (roomEls.length) {
            tl.fromTo(
                roomEls,
                { opacity: 0, y: 10, filter: 'blur(8px)' },
                {
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    duration: 0.5,
                    stagger: 0.018,
                    clearProps: 'opacity,transform,filter',
                },
                0,
            );
        }

        if (deptEls.length) {
            tl.fromTo(
                deptEls,
                { opacity: 0, y: 6, filter: 'blur(6px)' },
                {
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    duration: 0.38,
                    stagger: 0.04,
                    clearProps: 'opacity,transform,filter',
                },
                0.1,
            );
        }
    }, { dependencies: [location, dept] });

    return (
        <div
            id="location-label"
            style={{
                position: 'absolute',
                bottom: '96px',
                left: '20px',
                zIndex: 30,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                animation: 'fadeSlideUp 0.5s ease both',
            }}
            aria-label={`Current location: ${location}`}
        >
            {/* ── Main room pill ─────────────────────────────────────────────────── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '50px',
                /* glass (same template) */
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.22)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.28)',
            }}>
                {/* Live dot */}
                <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#34d399',
                    boxShadow: '0 0 8px rgba(52,211,153,0.8)',
                    flexShrink: 0,
                    animation: 'pulse 2s ease infinite',
                }} />

                <span style={{ color: 'rgba(255,255,255,0.55)' }}><PinIcon /></span>

                {/* Room name */}
                <span ref={roomTextRef} aria-hidden="true" style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    letterSpacing: '-0.2px',
                    fontFamily: 'Montserrat, sans-serif',
                    userSelect: 'none',
                    display: 'inline-flex',
                }}>
                    {roomChars.map((ch, index) => (
                        <span
                            key={`${ch}-${index}`}
                            data-room-char="1"
                            style={{ display: 'inline-block', willChange: 'transform, opacity, filter' }}
                        >
                            {ch === ' ' ? '\u00A0' : ch}
                        </span>
                    ))}
                </span>

                <Badge360 />
            </div>

            {/* ── Department sub-label ───────────────────────────────────────────── */}
            {dept && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 14px',
                    borderRadius: '50px',
                    alignSelf: 'flex-start',
                    background: 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.13)',
                }}>
                    <span style={{
                        color: 'rgba(255,255,255,0.55)',
                        fontSize: '10px',
                        fontWeight: 500,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        userSelect: 'none',
                        display: 'inline-flex',
                    }}>
                        <span ref={deptTextRef} aria-hidden="true" style={{ display: 'inline-flex' }}>
                            {deptWords.map((word, index) => (
                                <span
                                    key={`${word}-${index}`}
                                    data-dept-word="1"
                                    style={{
                                        display: 'inline-block',
                                        marginRight: index < deptWords.length - 1 ? '0.28em' : 0,
                                        willChange: 'transform, opacity, filter',
                                    }}
                                >
                                    {word}
                                </span>
                            ))}
                        </span>
                    </span>
                </div>
            )}
        </div>
    );
}
