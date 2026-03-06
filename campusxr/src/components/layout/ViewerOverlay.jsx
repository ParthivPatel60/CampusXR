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
 *  onRefresh   {fn}      — reset camera to default view
 * ─────────────────────────────────────────────────────────────────────────────
 */

import NavbarGlass from '../ui/NavbarGlass';
import SideControls from '../ui/SideControls';
import LocationLabel from '../ui/LocationLabel';

/* ── Main component ───────────────────────────────────────────────────────── */
export default function ViewerOverlay({
    activeRoom = { name: 'Terrace' },
    activeDept = '',
    activeNav = 'ADMIN',
    onNavClick,
    onZoomIn,
    onZoomOut,
    onRefresh,
}) {
    return (
        /* Full-viewport overlay — pointer-events:none so panorama stays interactive.
           Individual interactive children re-enable pointer-events as needed. */
        <div className="absolute inset-0 z-20 pointer-events-none">

            {/* ── 1. Top navigation bar ── */}
            <div className="pointer-events-auto">
                <NavbarGlass
                    activeNav={activeNav}
                    onNavClick={onNavClick}
                />
            </div>

            {/* ── 2. Left side controls — zoom/refresh wired to Three.js camera ── */}
            <div className="pointer-events-auto">
                <SideControls
                    onRefresh={onRefresh}
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    onNavigate={() => { /* pan mode — Three.js mouse drag handles this natively */ }}
                />
            </div>

            {/* ── 3. Bottom-left location label ── */}
            <div className="pointer-events-none">
                <LocationLabel
                    location={activeRoom?.name || 'Terrace'}
                    dept={activeDept}
                />
            </div>

        </div>
    );
}
