/**
 * ViewerOverlay.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Composing wrapper that layers all UI elements above the 360° panorama viewer.
 * Pure pass-through — no owned state.
 *
 * Slot layout:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  [NavbarGlass]           —  absolute, top-0, full-width      │
 *  │  [SideControls]          —  absolute, left-5, center-Y      │
 *  │  [LocationLabel]         —  absolute, bottom-24, left-5     │
 *  └─────────────────────────────────────────────────────────────┘
 *
 * Hotspot markers are rendered and positioned by PanoramaViewer (pitch/yaw
 * projected through the Three.js camera each animation frame).
 *
 * Props:
 *  activeRoom  {object}  — { name }
 *  activeDept  {string}  — department name
 *  activeNav   {string}  — which top nav pill is highlighted
 *  onNavClick  {fn}      — called with nav label
 *  onZoomIn    {fn}      — zoom in (Three.js camera FOV ↓)
 *  onZoomOut   {fn}      — zoom out (Three.js camera FOV ↑)
 *  onRefresh   {fn}      — reset camera to default view *  is3DMode    {bool}    — whether 3DGS mode is active
 *  onToggle3D  {fn}      — toggle 3DGS mode
 *  show3DToggle {bool}   — whether to show the 3D mode button
 *  onAdminClick {fn}     — navigate to admin login * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import NavbarGlass from '../ui/NavbarGlass';
import SideControls from '../ui/SideControls';

gsap.registerPlugin(useGSAP);

/* ── Main component ───────────────────────────────────────────────────────── */
export default function ViewerOverlay({
    activeNav = '',
    onNavClick,
    onZoomIn,
    onZoomOut,
    onRefresh,
    onPanUp,
    onPanDown,
    onPanLeft,
    onPanRight,
    is3DMode = false,
    onToggle3D,
    show3DToggle = false,
    onAdminClick,
}) {
    const overlayRef = useRef(null);

    useGSAP(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const navbar = overlayRef.current?.querySelector('[data-anim="overlay-navbar"]');
        const controls = overlayRef.current?.querySelector('[data-anim="overlay-controls"]');
        if (!navbar || !controls) return;

        if (prefersReducedMotion) {
                        gsap.set([navbar, controls], { opacity: 1, clearProps: 'all' });
            return;
        }

                gsap.set([navbar, controls], { opacity: 0, filter: 'blur(6px)' });

                const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
                tl.to(navbar, { opacity: 1, filter: 'blur(0px)', duration: 0.4, clearProps: 'opacity,filter' })
                    .to(controls, { opacity: 1, filter: 'blur(0px)', duration: 0.38, clearProps: 'opacity,filter' }, '-=0.2');
    }, { scope: overlayRef });

    return (
        /* Full-viewport overlay — pointer-events:none so panorama stays interactive.
           Individual interactive children re-enable pointer-events as needed. */
        <div ref={overlayRef} className="absolute inset-0 z-20 pointer-events-none">

            {/* ── 1. Top navigation bar ── */}
            <div className="pointer-events-auto" data-anim="overlay-navbar">
                <NavbarGlass
                    activeNav={activeNav}
                    onNavClick={onNavClick}
                    is3DMode={is3DMode}
                    onToggle3D={onToggle3D}
                    show3DToggle={show3DToggle}
                    onAdminClick={onAdminClick}
                />
            </div>

            {/* ── 2. Left side controls — zoom/refresh wired to Three.js camera ── */}
            <div className="pointer-events-auto" data-anim="overlay-controls">
                <SideControls
                    onRefresh={onRefresh}
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    onPanUp={onPanUp}
                    onPanDown={onPanDown}
                    onPanLeft={onPanLeft}
                    onPanRight={onPanRight}
                />
            </div>

        </div>
    );
}
