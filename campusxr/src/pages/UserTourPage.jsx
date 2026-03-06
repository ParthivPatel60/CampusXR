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

import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import ViewerOverlay from '@/components/layout/ViewerOverlay';
import PanoramaViewer from '@/components/viewer/PanoramaViewer';
import { getDepartments, getRooms, getHotspots } from '@/services/firestoreService';

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
  const [activeDept, setActiveDept] = useState('');
  const [activeRoom, setActiveRoom] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeDeptId, setActiveDeptId] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [activeNav, setActiveNav] = useState('ADMIN');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [showRoomList, setShowRoomList] = useState(false);
  const [hotspots, setHotspots] = useState([]);

  /* ── Refs ────────────────────────────────────────────────────────────────── */
  const bottomNavRef = useRef(null);
  const infoPanelRef = useRef(null);
  const toggleRef = useRef(null);
  const viewerRef = useRef(null);
  const pendingRoomIdRef = useRef(null); // target room when switching dept via nav hotspot

  /* ── Three.js camera handlers ────────────────────────────────────────────── */
  const handleZoomIn = () => { const c = viewerRef.current?.camera; if (!c) return; c.fov = Math.max(30, c.fov - 10); c.updateProjectionMatrix(); };
  const handleZoomOut = () => { const c = viewerRef.current?.camera; if (!c) return; c.fov = Math.min(100, c.fov + 10); c.updateProjectionMatrix(); };
  const handleRefresh = () => { const c = viewerRef.current?.camera; if (!c) return; c.fov = 75; c.updateProjectionMatrix(); };

  /* ── GSAP animations ─────────────────────────────────────────────────────── */
  useGSAP(() => {
    gsap.from(bottomNavRef.current, { y: 100, opacity: 0, duration: 1, ease: 'power3.out' });
    if (toggleRef.current) {
      gsap.fromTo(toggleRef.current,
        { boxShadow: '0 0 5px #F59E0B' },
        { boxShadow: '0 0 22px #F59E0B', repeat: -1, yoyo: true, duration: 1.5 },
      );
    }
  }, []);

  useGSAP(() => {
    if (showInfoPanel) gsap.to(infoPanelRef.current, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
    else gsap.to(infoPanelRef.current, { x: '110%', opacity: 0, duration: 0.40, ease: 'power3.in' });
  }, [showInfoPanel]);

  /* ── Data loading ────────────────────────────────────────────────────────── */
  useEffect(() => {
    getDepartments().then((depts) => {
      setDepartments(depts);
      if (depts.length > 0) {
        setActiveDept(depts[0].name);
        setActiveDeptId(depts[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!activeDeptId) return;
    getRooms(activeDeptId).then((r) => {
      setRooms(r);
      const pending = pendingRoomIdRef.current;
      pendingRoomIdRef.current = null;
      const target = pending ? r.find(room => room.id === pending) : null;
      setActiveRoom(target || (r.length > 0 ? r[0] : null));
    });
  }, [activeDeptId]);

  useEffect(() => {
    setIs3DMode(false);
    if (!activeRoom?.id || !activeDeptId) { setHotspots([]); return; }
    getHotspots(activeDeptId, activeRoom.id).then(setHotspots);
  }, [activeRoom, activeDeptId]);

  /* ── Handlers ────────────────────────────────────────────────────────────── */
  const handleHotspotClick = (hs) => {
    if (hs.type === 'info') { setActiveHotspot(hs); setShowInfoPanel(true); }
    else if (hs.type === 'navigation' && hs.targetRoomId) {
      if (hs.targetDeptId && hs.targetDeptId !== activeDeptId) {
        const targetDept = departments.find(d => d.id === hs.targetDeptId);
        if (targetDept) {
          pendingRoomIdRef.current = hs.targetRoomId;
          setActiveDept(targetDept.name);
          setActiveDeptId(hs.targetDeptId);
        }
      } else {
        const target = rooms.find(r => r.id === hs.targetRoomId);
        if (target) setActiveRoom(target);
      }
    }
  };
  const handleNavClick = (label) => { if (label === 'ADMIN') { window.location.href = '/admin'; return; } setActiveNav(label); };
  const handleDeptChange = (deptName) => {
    setActiveDept(deptName);
    const dept = departments.find(d => d.name === deptName);
    if (dept) setActiveDeptId(dept.id);
  };
  const handleRoomSelect = (room) => { setActiveRoom(room); setShowRoomList(false); };

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
        {!is3DMode && activeRoom?.imageURL && (
          <PanoramaViewer
            key={activeRoom.imageURL}
            imageURL={activeRoom.imageURL}
            hotspots={hotspots}
            onHotspotClick={handleHotspotClick}
            onReady={(viewer) => { viewerRef.current = viewer; }}
          />
        )}
        {!is3DMode && !activeRoom?.imageURL && (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f0f1a 100%)' }} />
        )}
        {is3DMode && activeRoom?.splat3DUrl && (
          <iframe
            key={activeRoom.splat3DUrl}
            src={activeRoom.splat3DUrl}
            width="100%"
            height="100%"
            allow="fullscreen; xr-spatial-tracking"
            style={{ position: 'absolute', inset: 0, border: 'none', background: '#0f0f1a' }}
            title={`3D Gaussian Splat — ${activeRoom.name}`}
          />
        )}
      </div>

      {/* ═══ UI OVERLAY ═══════════════════════════════════════════════════ */}
      <ViewerOverlay
        activeRoom={activeRoom}
        activeDept={activeDept}
        activeNav={activeNav}
        onNavClick={handleNavClick}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRefresh={handleRefresh}
      />

      {/* ═══ TOP-LEFT: Dept filter + search ═══════════════════════════════ */}
      <div style={{
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

      {/* ═══ TOP-RIGHT: 3DGS toggle + Auto Tour ══════════════════════════ */}
      <div style={{
        position: 'absolute',
        top: '72px',
        right: '20px',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
      }}>

        {/* 3DGS toggle — only when room has splat3DUrl */}
        {activeRoom?.splat3DUrl && (
          <button
            ref={toggleRef}
            onClick={() => setIs3DMode(!is3DMode)}
            title="Next-gen neural rendering demo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '39px',
              background: is3DMode ? 'rgba(245,158,11,0.22)' : G_BG,
              backdropFilter: G_BLUR,
              WebkitBackdropFilter: G_BLUR,
              boxShadow: G_SHADOW,
              border: is3DMode ? '2px solid rgba(251,191,36,0.80)' : '1px solid rgba(255,255,255,0.20)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'rgba(251,191,36,0.20)',
              border: '1.5px solid rgba(251,191,36,0.70)',
              color: '#fbbf24',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}>
              Beta
            </span>
            <span style={{ color: is3DMode ? '#fde68a' : '#fff', fontSize: '13px', fontWeight: 600 }}>
              3D Mode
            </span>
          </button>
        )}

        {/* Auto Guided Tour */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '39px',
            background: G_BG,
            backdropFilter: G_BLUR,
            WebkitBackdropFilter: G_BLUR,
            boxShadow: G_SHADOW,
            border: '1px solid rgba(255,255,255,0.20)',
            color: 'rgba(255,255,255,0.80)',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'Montserrat, sans-serif',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.20)'; e.currentTarget.style.background = G_BG; }}
        >
          {/* Play icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Auto Tour
        </button>
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
            alt={activeHotspot.label || activeHotspot.text || ''}
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
          {activeHotspot?.label || activeHotspot?.text || 'Hotspot Detail'}
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
        {/* Room pill list */}
        {showRoomList && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {filteredRooms.map(room => (
              <button
                key={room.name}
                onClick={() => handleRoomSelect(room)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '50px',
                  color: activeRoom?.name === room.name ? '#fff' : 'rgba(255,255,255,0.75)',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'Montserrat, sans-serif',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.16s ease',
                  ...(activeRoom?.name === room.name ? PILL_ACTIVE_STYLE : PILL_STYLE),
                }}
              >
                {room.name}
              </button>
            ))}
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

      {/* Admin link */}
      <a
        href="/admin"
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          color: 'rgba(255,255,255,0.28)',
          fontSize: '11px',
          fontWeight: 500,
          zIndex: 40,
          textDecoration: 'none',
          letterSpacing: '0.06em',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.60)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.28)'; }}
      >
        Admin Panel
      </a>

    </div>
  );
}
