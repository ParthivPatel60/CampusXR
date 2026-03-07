/**
 * UserTourPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Main public-facing 360° virtual tour page.
 *
 * UI Design System — VisionOS-inspired, glass morphism preserved:
 *   Glass BG   : linear-gradient(247.52deg, rgba(108,99,255,0.17) … rgba(255,255,255,0) …)
 *   Shadow     : inset -2px/-2px 100px rgba(255,255,255,0.1), inset 2px/2px rgba(66,66,66,0.1)
 *   Blur       : blur(25px)   Panel-r: 39px   Pill-r: 50px
 *
 * Color palette (high-contrast on panoramic backgrounds):
 *   Primary text   : #ffffff              — nav, labels, headings
 *   Secondary text : rgba(255,255,255,0.6) — breadcrumb, placeholders
 *   Accent         : rgb(108,99,255)       — active states, indigo
 *   Success/Live   : #34d399              — live dot, nav hotspot
 *   Warning        : #fbbf24              — 3DGS experimental badge
 *
 * Typography:  Montserrat — 10/11/12/14/16/20px
 * Spacing:     8px grid
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import ViewerOverlay from '../components/layout/ViewerOverlay';
import PanoramaViewer from '../components/viewer/PanoramaViewer';
import { getDepartments, getRooms, getHotspots } from '../services/firestoreService';

gsap.registerPlugin(useGSAP);

/* ─── Glass design tokens ─────────────────────────────────────────────────── */
const G_BG = 'linear-gradient(247.52deg, rgba(108,99,255,0.17) 1.52%, rgba(255,255,255,0) 96.99%)';
const G_SHADOW = 'inset -2px -2px 100px rgba(255,255,255,0.1), inset 2px 2px 100px rgba(66,66,66,0.1)';
const G_BLUR = 'blur(25px)';

/* Pill/button variants */
const PILL_STYLE = {
  background: 'rgba(255,255,255,0.10)',
  boxShadow: G_SHADOW,
  backdropFilter: G_BLUR,
  WebkitBackdropFilter: G_BLUR,
  borderRadius: '50px',
  border: '2px solid rgba(255,255,255,0.30)',
};
const PILL_ACTIVE_STYLE = {
  ...PILL_STYLE,
  background: 'rgba(108,99,255,0.30)',
  border: '2px solid rgba(255,255,255,0.72)',
};

/* ─── Chevron icon ────────────────────────────────────────────────────────── */
const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── Close icon ──────────────────────────────────────────────────────────── */
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ─── Search icon ─────────────────────────────────────────────────────────── */
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────── */
export default function UserTourPage() {

  /* ── State ───────────────────────────────────────────────────────────────── */
  const [activeDept, setActiveDept] = useState('All Departments');
  const [activeRoom, setActiveRoom] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeDeptId, setActiveDeptId] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [splatMounted, setSplatMounted] = useState(false);
  const [activeNav, setActiveNav] = useState('ADMIN');
  const [tourOpen, setTourOpen] = useState(false);
  const [isTourPlaying, setIsTourPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [showRoomList, setShowRoomList] = useState(true);
  const [hotspots, setHotspots] = useState([]);

  /* ── Refs ────────────────────────────────────────────────────────────────── */
  const bottomNavRef = useRef(null);
  const infoPanelRef = useRef(null);
  const viewerRef = useRef(null);
  const tourIntervalRef = useRef(null);
  const splat3DRef   = useRef(null);   // 3DGS iframe overlay
  const topLeftRef   = useRef(null);   // dept filter + search panel
  const tourGuideRef = useRef(null);   // bottom-right tour guide panel

  /* ── Three.js camera handlers ────────────────────────────────────────────── */
  /* ZoomIn/ZoomOut swapped per UX feedback — + widens view, - narrows view */
  const handleZoomIn  = () => { const c = viewerRef.current?.camera; if (!c) return; c.fov = Math.min(100, c.fov + 10); c.updateProjectionMatrix(); };
  const handleZoomOut = () => { const c = viewerRef.current?.camera; if (!c) return; c.fov = Math.max(30,  c.fov - 10); c.updateProjectionMatrix(); };
  /* Reset: restores camera orientation AND field-of-view to defaults */
  const handleRefresh = () => { viewerRef.current?.reset?.(); };

  /* ── GSAP animations ─────────────────────────────────────────────────────── */
  useGSAP(() => {
    gsap.from(bottomNavRef.current, { y: 100, opacity: 0, duration: 1, ease: 'power3.out' });
  }, []);

  useGSAP(() => {
    if (showInfoPanel) gsap.to(infoPanelRef.current, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
    else gsap.to(infoPanelRef.current, { x: '110%', opacity: 0, duration: 0.40, ease: 'power3.in' });
  }, [showInfoPanel]);

  /* ── 3DGS immersive mode — GSAP: hide/show UI, fade iframe overlay ─────────── */
  useEffect(() => {
    // First activation: mount the iframe, then the effect re-fires with a valid ref
    if (is3DMode && !splatMounted) { setSplatMounted(true); return; }
    if (!splat3DRef.current) return; // nothing to animate on initial load

    const DUR = 0.28;
    if (is3DMode) {
      setShowInfoPanel(false);
      // ─ Iframe overlay — fade in after a beat ─
      gsap.set(splat3DRef.current, { pointerEvents: 'auto' });
      gsap.fromTo(splat3DRef.current, { opacity: 0 }, { opacity: 1, duration: 0.55, delay: 0.12, ease: 'power2.inOut' });
      // ─ Nav bar internals — slide up and out ─
      gsap.to('#navbar-nav-pills', { opacity: 0, y: -8,  duration: DUR, ease: 'power2.in', onComplete: () => gsap.set('#navbar-nav-pills', { pointerEvents: 'none' }) });
      gsap.to('#navbar-admin-btn', { opacity: 0, y: -8,  duration: DUR, delay: 0.05, ease: 'power2.in', onComplete: () => gsap.set('#navbar-admin-btn', { pointerEvents: 'none' }) });
      // ─ Side controls — slide left ─
      gsap.to('#side-controls-panel', { opacity: 0, x: -12, duration: DUR, ease: 'power2.in', onComplete: () => gsap.set('#side-controls-panel', { pointerEvents: 'none' }) });
      // ─ Top-left panel — slide up ─
      if (topLeftRef.current)   gsap.to(topLeftRef.current,   { opacity: 0, y: -10, duration: DUR, delay: 0.03, ease: 'power2.in', onComplete: () => gsap.set(topLeftRef.current,   { pointerEvents: 'none' }) });
      // ─ Bottom panels — slide down ─
      if (bottomNavRef.current) gsap.to(bottomNavRef.current, { opacity: 0, y:  16, duration: DUR, ease: 'power2.in', onComplete: () => gsap.set(bottomNavRef.current, { pointerEvents: 'none' }) });
      if (tourGuideRef.current) gsap.to(tourGuideRef.current, { opacity: 0, y:  16, duration: DUR, delay: 0.05, ease: 'power2.in', onComplete: () => gsap.set(tourGuideRef.current, { pointerEvents: 'none' }) });
    } else {
      const DELAY = 0.22;
      // ─ Iframe overlay — fade out ─
      gsap.to(splat3DRef.current, { opacity: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => splat3DRef.current && gsap.set(splat3DRef.current, { pointerEvents: 'none' }) });
      // ─ Restore pointer events immediately so UI is usable ─
      gsap.set(['#navbar-nav-pills', '#navbar-admin-btn', '#side-controls-panel'], { pointerEvents: 'auto' });
      if (topLeftRef.current)   gsap.set(topLeftRef.current,   { pointerEvents: 'auto' });
      if (bottomNavRef.current) gsap.set(bottomNavRef.current, { pointerEvents: 'auto' });
      if (tourGuideRef.current) gsap.set(tourGuideRef.current, { pointerEvents: 'auto' });
      // ─ UI elements — fade and slide back in ─
      gsap.to('#navbar-nav-pills',    { opacity: 1, y: 0, duration: 0.38, delay: DELAY,        ease: 'power3.out' });
      gsap.to('#navbar-admin-btn',    { opacity: 1, y: 0, duration: 0.38, delay: DELAY + 0.05, ease: 'power3.out' });
      gsap.to('#side-controls-panel', { opacity: 1, x: 0, duration: 0.38, delay: DELAY,        ease: 'power3.out' });
      if (topLeftRef.current)   gsap.to(topLeftRef.current,   { opacity: 1, y: 0, duration: 0.38, delay: DELAY + 0.03, ease: 'power3.out' });
      if (bottomNavRef.current) gsap.to(bottomNavRef.current, { opacity: 1, y: 0, duration: 0.38, delay: DELAY + 0.04, ease: 'power3.out' });
      if (tourGuideRef.current) gsap.to(tourGuideRef.current, { opacity: 1, y: 0, duration: 0.38, delay: DELAY + 0.09, ease: 'power3.out' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is3DMode, splatMounted]);

  /* ── Data loading ────────────────────────────────────────────────────────── */
  useEffect(() => {
    getDepartments().then((depts) => {
      setDepartments(depts);
      // Do not auto-select a dept — "All Departments" is the default
    });
  }, []);

  useEffect(() => {
    if (activeDeptId === null) {
      // All Departments: fetch rooms from every dept in parallel
      if (departments.length === 0) return;
      Promise.all(
        departments.map(d =>
          getRooms(d.id).then(rs => rs.map(r => ({ ...r, deptId: d.id, deptName: d.name })))
        )
      ).then(allRooms => {
        const flat = allRooms.flat();
        setRooms(flat);
        setActiveRoom(flat.length > 0 ? flat[0] : null);
      });
      return;
    }
    getRooms(activeDeptId).then((r) => {
      setRooms(r);
      setActiveRoom(r.length > 0 ? r[0] : null);
    });
  }, [activeDeptId, departments]);

  useEffect(() => {
    setIs3DMode(false);
    // In "All Departments" mode, the room carries its own deptId
    const deptId = activeDeptId ?? activeRoom?.deptId;
    if (!activeRoom?.id || !deptId) { setHotspots([]); return; }
    getHotspots(deptId, activeRoom.id).then(setHotspots);
  }, [activeRoom, activeDeptId]);

  /* ── Auto-advance tour ───────────────────────────────────────────────────── */
  useEffect(() => {
    clearInterval(tourIntervalRef.current);
    if (isTourPlaying && rooms.length > 0) {
      tourIntervalRef.current = setInterval(() => {
        setActiveRoom(prev => {
          const list = rooms;
          if (!list.length) return prev;
          const idx = list.findIndex(r => r.id === prev?.id);
          return list[(idx + 1) % list.length];
        });
      }, 7000);
    }
    return () => clearInterval(tourIntervalRef.current);
  }, [isTourPlaying, rooms]);

  /* ── Handlers ────────────────────────────────────────────────────────────── */
  const handleHotspotClick = (hs) => {
    if (hs.type === 'info') { setActiveHotspot(hs); setShowInfoPanel(true); }
    else if (hs.type === 'navigation' && hs.targetRoomId) {
      if (hs.targetDeptId && hs.targetDeptId !== activeDeptId) {
        const targetDept = departments.find(d => d.id === hs.targetDeptId);
        if (targetDept) { setActiveDept(targetDept.name); setActiveDeptId(hs.targetDeptId); }
      } else {
        const target = rooms.find(r => r.id === hs.targetRoomId);
        if (target) setActiveRoom(target);
      }
    }
  };
  const handleNavClick = (label) => { setActiveNav(label); };
  const handleAdminClick = () => { window.location.href = '/admin'; };
  const handleDeptChange = (deptName) => {
    setActiveDept(deptName);
    if (deptName === 'All Departments') {
      setActiveDeptId(null);
      return;
    }
    const dept = departments.find(d => d.name === deptName);
    if (dept) setActiveDeptId(dept.id);
  };
  const handleRoomSelect = (room) => { setActiveRoom(room); setShowRoomList(false); };

  /* ── Tour Guide handlers ─────────────────────────────────────────────────── */
  const handleTourNext = () => {
    setActiveRoom(prev => {
      if (!rooms.length) return prev;
      const idx = rooms.findIndex(r => r.id === prev?.id);
      return rooms[(idx + 1) % rooms.length];
    });
  };
  const handleTourPrev = () => {
    setActiveRoom(prev => {
      if (!rooms.length) return prev;
      const idx = rooms.findIndex(r => r.id === prev?.id);
      return rooms[(idx - 1 + rooms.length) % rooms.length];
    });
  };
  const handleTourToggleBtn = () => {
    if (!tourOpen) { setTourOpen(true); setIsTourPlaying(true); }
    else { setIsTourPlaying(p => !p); }
  };
  const handleTourStop = () => { setTourOpen(false); setIsTourPlaying(false); };

  const filteredRooms = rooms.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 font-sans">

      {/* ═══ PANORAMA BACKGROUND ══════════════════════════════════════════ */}
      <div className={[
        'absolute inset-0 transition-all duration-500 ease-in-out',
        showInfoPanel ? 'blur-sm scale-105 brightness-75' : '',
      ].join(' ')}>
        {activeRoom?.imageURL ? (
          <PanoramaViewer
            key={activeRoom.imageURL}
            imageURL={activeRoom.imageURL}
            hotspots={hotspots}
            onHotspotClick={handleHotspotClick}
            onReady={(viewer) => { viewerRef.current = viewer; }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f0f1a 100%)' }} />
        )}
      </div>

      {/* ═══ 3DGS OVERLAY — above panorama (z-15), below navbar (z-20) ═══════════ */}
      {splatMounted && (
        <div
          ref={splat3DRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 15,
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          <iframe
            id="viewer"
            src="https://superspl.at/s?id=45557979"
            width="100%"
            height="100%"
            allow="fullscreen; xr-spatial-tracking"
            style={{ position: 'absolute', inset: 0, border: 'none', background: '#0f0f1a' }}
            title="3D Gaussian Splat Viewer"
          />
        </div>
      )}

      {/* ═══ UI OVERLAY ═══════════════════════════════════════════════ */}
      <ViewerOverlay
        activeRoom={activeRoom}
        activeDept={activeDept}
        activeNav={activeNav}
        onNavClick={handleNavClick}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRefresh={handleRefresh}
        is3DMode={is3DMode}
        onToggle3D={() => setIs3DMode(v => !v)}
        show3DToggle={true}
        onAdminClick={handleAdminClick}
      />

      {/* ═══ TOP-LEFT: Dept filter + search ═══════════════════════════════ */}
      <div ref={topLeftRef} style={{
        position: 'absolute',
        top: '72px',
        left: '80px',       /* clear of SideControls (left: 20px + 44px btn + 16px gap) */
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '220px',
      }}>

        {/* Department selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          ...PILL_STYLE,
          borderRadius: '39px',
          border: '1px solid rgba(255,255,255,0.22)',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.50)', flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <select
            value={activeDept}
            onChange={(e) => handleDeptChange(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'Montserrat, sans-serif',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
            }}
          >
            <option value="All Departments" style={{ background: '#1e1b4b', color: '#fff' }}>All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name} style={{ background: '#1e1b4b', color: '#fff' }}>{d.name}</option>
            ))}
          </select>
          <span style={{ color: 'rgba(255,255,255,0.40)', flexShrink: 0 }}><ChevronDown /></span>
        </div>

        {/* Room search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: G_BLUR,
          WebkitBackdropFilter: G_BLUR,
          boxShadow: G_SHADOW,
          borderRadius: '39px',
          border: '1px solid rgba(255,255,255,0.18)',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.42)', flexShrink: 0 }}><SearchIcon /></span>
          <input
            type="text"
            placeholder="Search rooms…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 400,
              fontFamily: 'Montserrat, sans-serif',
            }}
          />
        </div>

        {/* Search results dropdown */}
        {searchQuery && filteredRooms.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '8px',
            background: 'rgba(14,10,44,0.85)',
            backdropFilter: G_BLUR,
            WebkitBackdropFilter: G_BLUR,
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.40)',
          }}>
            {filteredRooms.map(room => (
              <button
                key={room.name}
                onClick={() => { handleRoomSelect(room); setSearchQuery(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: activeRoom?.name === room.name ? 'rgba(108,99,255,0.30)' : 'transparent',
                  border: 'none',
                  color: activeRoom?.name === room.name ? '#fff' : 'rgba(255,255,255,0.72)',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'Montserrat, sans-serif',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => { if (activeRoom?.name !== room.name) e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                onMouseLeave={e => { if (activeRoom?.name !== room.name) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeRoom?.name === room.name ? '#a5b4fc' : 'rgba(255,255,255,0.30)', flexShrink: 0 }} />
                {room.name}
              </button>
            ))}
          </div>
        )}
      </div>


      {/* ═══ INFO SIDE PANEL ══════════════════════════════════════════════ */}
      <div
        ref={infoPanelRef}
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
            <CloseIcon />
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

      {/* ═══ BOTTOM NAV — breadcrumb + expandable room pills ═════════════ */}
      <div
        ref={bottomNavRef}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Room thumbnail cards — horizontal scroll */}
        {showRoomList && (
          <div
            className="pills-scroll"
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'nowrap',
              maxWidth: 'min(88vw, 820px)',
              paddingBottom: '6px',
              paddingTop: '2px',
            }}
          >
            {filteredRooms.map(room => {
              const isActive = activeRoom?.id === room.id;
              return (
                <button
                  key={`${room.deptId ?? ''}__${room.name}`}
                  onClick={() => handleRoomSelect(room)}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.34)';
                      e.currentTarget.style.boxShadow = `${G_SHADOW}, 0 6px 20px rgba(0,0,0,0.36)`;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
                      e.currentTarget.style.boxShadow = `${G_SHADOW}, 0 2px 12px rgba(0,0,0,0.25)`;
                    }
                  }}
                  style={{
                    width: '100px',
                    flexShrink: 0,
                    borderRadius: '14px',
                    background: isActive
                      ? 'linear-gradient(160deg, rgba(108,99,255,0.38) 0%, rgba(255,255,255,0.06) 100%)'
                      : 'rgba(255,255,255,0.06)',
                    backdropFilter: G_BLUR,
                    WebkitBackdropFilter: G_BLUR,
                    boxShadow: isActive
                      ? `${G_SHADOW}, 0 0 18px rgba(108,99,255,0.45), 0 4px 20px rgba(0,0,0,0.35)`
                      : `${G_SHADOW}, 0 2px 12px rgba(0,0,0,0.25)`,
                    border: isActive
                      ? '1.5px solid rgba(168,162,255,0.80)'
                      : '1px solid rgba(255,255,255,0.16)',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: 0,
                    overflow: 'hidden',
                    transition: 'all 0.18s ease',
                    transform: isActive ? 'translateY(-3px)' : 'none',
                  }}
                >
                  {/* Thumbnail image */}
                  <div style={{ width: '100%', height: '62px', overflow: 'hidden', position: 'relative' }}>
                    {room.imageURL ? (
                      <img
                        src={room.imageURL}
                        alt={room.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center 40%',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'radial-gradient(ellipse at center, rgba(108,99,255,0.30) 0%, rgba(15,10,40,0.90) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                          stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </div>
                    )}
                    {/* Bottom gradient fade */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to bottom, transparent 35%, rgba(8,6,28,0.72) 100%)',
                      pointerEvents: 'none',
                    }} />
                    {/* Active indicator dot */}
                    {isActive && (
                      <span style={{
                        position: 'absolute', top: '6px', right: '6px',
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: '#a5b4fc',
                        boxShadow: '0 0 8px rgba(168,162,255,0.95)',
                      }} />
                    )}
                  </div>

                  {/* Room name label */}
                  <div style={{
                    padding: '5px 6px 6px',
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.68)',
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: 'Montserrat, sans-serif',
                    letterSpacing: '0.01em',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'color 0.18s ease',
                  }}>
                    {room.name}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Breadcrumb bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 24px',
          background: G_BG,
          backdropFilter: G_BLUR,
          WebkitBackdropFilter: G_BLUR,
          boxShadow: `${G_SHADOW}, 0 8px 32px rgba(0,0,0,0.30)`,
          borderRadius: '39px',
          border: '1px solid rgba(255,255,255,0.20)',
          whiteSpace: 'nowrap',
        }}>
          {/* Campus */}
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 500 }}>
            Campus
          </span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', lineHeight: 1 }}>›</span>

          {/* Department — clickable */}
          <button
            onClick={() => setShowRoomList(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: showRoomList ? 'rgba(168,162,255,1)' : 'rgba(255,255,255,0.65)',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'Montserrat, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.15s ease',
              outline: 'none',
            }}
            title="Click to browse rooms"
          >
            {activeDept}
            <span style={{
              display: 'inline-flex',
              color: showRoomList ? 'rgba(168,162,255,0.9)' : 'rgba(255,255,255,0.40)',
              transform: showRoomList ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}>
              <ChevronDown />
            </span>
          </button>

          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', lineHeight: 1 }}>›</span>

          {/* Active room pill */}
          <span style={{
            padding: '4px 14px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: 'Montserrat, sans-serif',
            letterSpacing: '-0.1px',
            ...PILL_ACTIVE_STYLE,
            border: '2px solid rgba(255,255,255,0.65)',
          }}>
            {activeRoom?.name}
          </span>
        </div>
      </div>

      {/* ═══ BOTTOM-RIGHT: Merged Tour Guide Panel ══════════════════════ */}
      <div ref={tourGuideRef} style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
      }}>

        {/* ── Unified glass card ────────────────────────────────────────── */}
        <div style={{
          background: G_BG,
          backdropFilter: G_BLUR,
          WebkitBackdropFilter: G_BLUR,
          boxShadow: `${G_SHADOW}, 0 8px 32px rgba(0,0,0,0.30)`,
          borderRadius: '20px',
          border: `1px solid ${isTourPlaying && tourOpen ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.20)'}`,
          overflow: 'hidden',
          minWidth: '178px',
          transition: 'border-color 0.3s ease',
        }}>

          {/* Toggle row — always visible */}
          <button
            onClick={handleTourToggleBtn}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {/* Circular play/pause badge */}
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: isTourPlaying && tourOpen ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.10)',
              border: `1.5px solid ${isTourPlaying && tourOpen ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.28)'}`,
              color: isTourPlaying && tourOpen ? '#34d399' : 'rgba(255,255,255,0.85)',
              flexShrink: 0,
              transition: 'all 0.22s ease',
            }}>
              {isTourPlaying && tourOpen ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="6 3 20 12 6 21 6 3"/>
                </svg>
              )}
            </span>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em', flex: 1, textAlign: 'left' }}>
              Tour Guide
            </span>
            {/* Live dot when playing */}
            {isTourPlaying && tourOpen && (
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 7px #34d399', flexShrink: 0 }} />
            )}
          </button>

          {/* ── Expanded controls — visible when tourOpen ──────────────── */}
          {tourOpen && (
            <>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)', margin: '0 14px' }} />

              {/* Now Viewing */}
              <div style={{ padding: '8px 16px 10px' }}>
                <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Now Viewing
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                    {activeRoom?.name || '—'}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: '10px' }}>
                    {rooms.findIndex(r => r.id === activeRoom?.id) + 1}/{rooms.length}
                  </span>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.10)', margin: '0 14px' }} />

              {/* Control buttons row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 16px 12px' }}>

                {/* ◀ Prev */}
                <button onClick={handleTourPrev} title="Previous room"
                  style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.22)', color:'rgba(255,255,255,0.80)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', outline:'none', transition:'all 0.15s ease' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.16)';e.currentTarget.style.color='#fff';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='rgba(255,255,255,0.80)';}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="19 20 9 12 19 4 19 20"/><rect x="4" y="4" width="3" height="16" rx="1"/></svg>
                </button>

                {/* ⏸/▶ Play-Pause */}
                <button onClick={() => setIsTourPlaying(p => !p)} title={isTourPlaying ? 'Pause' : 'Resume'}
                  style={{ width:'36px', height:'36px', borderRadius:'50%', background: isTourPlaying ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.10)', border:`1.5px solid ${isTourPlaying ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.28)'}`, color: isTourPlaying ? '#34d399' : 'rgba(255,255,255,0.85)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', outline:'none', transition:'all 0.18s ease' }}>
                  {isTourPlaying ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                  )}
                </button>

                {/* ▶ Next */}
                <button onClick={handleTourNext} title="Next room"
                  style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.22)', color:'rgba(255,255,255,0.80)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', outline:'none', transition:'all 0.15s ease' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.16)';e.currentTarget.style.color='#fff';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='rgba(255,255,255,0.80)';}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 4 15 12 5 20 5 4"/><rect x="17" y="4" width="3" height="16" rx="1"/></svg>
                </button>

                {/* ⏹ Stop */}
                <button onClick={handleTourStop} title="Stop tour"
                  style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.16)', color:'rgba(255,255,255,0.50)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', outline:'none', transition:'all 0.15s ease' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.15)';e.currentTarget.style.borderColor='rgba(239,68,68,0.40)';e.currentTarget.style.color='rgb(252,165,165)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.borderColor='rgba(255,255,255,0.16)';e.currentTarget.style.color='rgba(255,255,255,0.50)';}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                </button>

              </div>
            </>
          )}
        </div>

      </div>

    </div>
  );
}
