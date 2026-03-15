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

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import ViewerOverlay from '../components/layout/ViewerOverlay';
import PanoramaViewer from '../components/viewer/PanoramaViewer';
import { GLASS_BG as G_BG, GLASS_SHADOW as G_SHADOW, GLASS_BLUR as G_BLUR, PILL_STYLE, PILL_ACTIVE_STYLE } from '../constants/glassTokens';
import { getDepartments, getRooms, getHotspots } from '../services/firestoreService';
import { getCloudinaryThumb } from '../services/cloudinaryService';
import { getFirebaseStartupValidationMessage } from '../config/runtimeValidation';

gsap.registerPlugin(useGSAP);

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
const PAN_STEP = 15; // degrees: nudge step per D-pad button press

export default function UserTourPage() {
  const navigate = useNavigate();

  /* ── State ───────────────────────────────────────────────────────────────── */
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [activeDeptId, setActiveDeptId] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);

  const [activeDept, setActiveDept] = useState('All Departments');
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [splatMounted, setSplatMounted] = useState(false);
  const [activeNav, setActiveNav] = useState('ADMIN');
  const [tourOpen, setTourOpen] = useState(false);
  const [isTourPlaying, setIsTourPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptOpen, setDeptOpen] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [showRoomList, setShowRoomList] = useState(true);
  const [isBottomNavCollapsed, setIsBottomNavCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [visitHistory, setVisitHistory] = useState([]); // [current, prev, …] max 5
  const [copiedLink, setCopiedLink] = useState(false);

  /* ── Refs ────────────────────────────────────────────────────────────────── */
  const bottomNavRef = useRef(null);
  const infoPanelRef = useRef(null);
  const viewerRef = useRef(null);
  const tourIntervalRef = useRef(null);
  const splat3DRef    = useRef(null);  // 3DGS iframe overlay
  const topLeftRef    = useRef(null);  // dept filter + search panel
  const deptDropRef   = useRef(null);  // custom dept dropdown container
  const tourGuideRef  = useRef(null);  // bottom-right tour guide panel
  const panoramaBgRef  = useRef(null);  // panorama container — GSAP blur/scale target
  const roomListRef    = useRef(null);  // thumbnail tray  — GSAP slide target
  const idleTimerRef   = useRef(null);  // auto-rotate idle timer handle
  const autoRotateRef  = useRef(null);  // auto-rotate interval handle
  const urlAppliedRef  = useRef(false); // true once URL params have been consumed
  const initialDeptIdRef = useRef(new URLSearchParams(window.location.search).get('dept'));
  const initialRoomIdRef = useRef(new URLSearchParams(window.location.search).get('room'));

  /* ── Three.js camera handlers ────────────────────────────────────────────── */
  /* Zoom controls: + narrows FOV (zoom in), - widens FOV (zoom out) */
  const handleZoomIn  = () => { const c = viewerRef.current?.camera; if (!c) return; c.fov = Math.max(30,  c.fov - 10); c.updateProjectionMatrix(); };
  const handleZoomOut = () => { const c = viewerRef.current?.camera; if (!c) return; c.fov = Math.min(100, c.fov + 10); c.updateProjectionMatrix(); };
  /* Reset: restores camera orientation AND field-of-view to defaults */
  const handleRefresh   = () => { viewerRef.current?.reset?.(); };
  /* Pan: nudge the look-at direction by a fixed step */
  const handlePanUp    = () => { viewerRef.current?.panBy?.(0,  PAN_STEP); };
  const handlePanDown  = () => { viewerRef.current?.panBy?.(0, -PAN_STEP); };
  const handlePanLeft  = () => { viewerRef.current?.panBy?.(-PAN_STEP, 0); };
  const handlePanRight = () => { viewerRef.current?.panBy?.( PAN_STEP, 0); };

  /* ── Keyboard navigation — Arrow keys pan; +/- zoom; R resets view ────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if      (e.key === 'ArrowUp')               handlePanUp();
      else if (e.key === 'ArrowDown')             handlePanDown();
      else if (e.key === 'ArrowLeft')             handlePanLeft();
      else if (e.key === 'ArrowRight')            handlePanRight();
      else if (e.key === '+' || e.key === '=')    handleZoomIn();
      else if (e.key === '-')                     handleZoomOut();
      else if (e.key === 'r' || e.key === 'R')    handleRefresh();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // all handlers read viewerRef.current — always fresh via ref

  /* ── Auto-rotate when idle — starts after 5 s of no user interaction ─────── */
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearInterval(autoRotateRef.current);
    idleTimerRef.current = setTimeout(() => {
      autoRotateRef.current = setInterval(() => {
        viewerRef.current?.panBy?.(0.4, 0);
      }, 32);
    }, 5000);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    EVENTS.forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    return () => {
      clearTimeout(idleTimerRef.current);
      clearInterval(autoRotateRef.current);
      EVENTS.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [resetIdleTimer]);

  /* ── URL sync — write current dept + room into browser history ──────────── */
  useEffect(() => {
    if (!activeRoom?.id) return;
    const params = new URLSearchParams(window.location.search);
    if (activeDeptId) params.set('dept', activeDeptId);
    else params.delete('dept');
    params.set('room', activeRoom.id);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [activeRoom?.id, activeDeptId]);

  /* ── Room visit history — track last 5 unique rooms for back-navigation ──── */
  useEffect(() => {
    if (!activeRoom?.id) return;
    setVisitHistory(prev => {
      if (prev[0]?.id === activeRoom.id) return prev;
      return [activeRoom, ...prev.filter(r => r.id !== activeRoom.id)].slice(0, 5);
    });
  }, [activeRoom]);

  /* ── Close dept dropdown on outside click ──────────────────────────────── */
  useEffect(() => {
    if (!deptOpen) return;
    const handler = (e) => {
      if (deptDropRef.current && !deptDropRef.current.contains(e.target)) setDeptOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [deptOpen]);

  /* ── GSAP animations ─────────────────────────────────────────────────────── */
  /* Staggered entrance: bottom-nav slides up, top-left slides in from left,
     tour-guide slides in from right — all driven by one GSAP timeline.       */
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(bottomNavRef.current, { y: 80,  opacity: 0, duration: 0.9 })
      .from(topLeftRef.current,   { x: -24, opacity: 0, duration: 0.7 }, '-=0.55')
      .from(tourGuideRef.current, { x:  24, opacity: 0, duration: 0.7 }, '-=0.65');
  }, []);

  useGSAP(() => {
    // Kill any in-progress tween so rapid open/close doesn't stack animations
    gsap.killTweensOf(infoPanelRef.current);
    if (showInfoPanel) gsap.to(infoPanelRef.current, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
    else gsap.to(infoPanelRef.current, { x: '110%', opacity: 0, duration: 0.40, ease: 'power3.in' });
  }, [showInfoPanel]);

  /* ── GSAP: panorama background blur + scale when info panel opens ────────── */
  useGSAP(() => {
    if (!panoramaBgRef.current) return;
    gsap.killTweensOf(panoramaBgRef.current);
    if (showInfoPanel) {
      gsap.to(panoramaBgRef.current, {
        filter: 'blur(4px) brightness(0.75)', scale: 1.05,
        duration: 0.5, ease: 'power2.out',
      });
    } else {
      gsap.to(panoramaBgRef.current, {
        filter: 'blur(0px) brightness(1)', scale: 1,
        duration: 0.5, ease: 'power2.out',
      });
    }
  }, [showInfoPanel]);

  /* ── GSAP: thumbnail tray slide open / collapse ──────────────────────────── */
  useGSAP(() => {
    if (!roomListRef.current) return;
    gsap.killTweensOf(roomListRef.current);
    if (showRoomList) {
      gsap.to(roomListRef.current, { height: 'auto', opacity: 1, duration: 0.35, ease: 'power3.out' });
    } else {
      gsap.to(roomListRef.current, { height: 0, opacity: 0, duration: 0.25, ease: 'power3.in' });
    }
  }, [showRoomList]);

  /* ── 3DGS immersive mode — GSAP: hide/show UI, fade iframe overlay ─────────── */
  useEffect(() => {
    // First activation: mount the iframe, then the effect re-fires with a valid ref
    if (is3DMode && !splatMounted) { setSplatMounted(true); return; }
    if (!splat3DRef.current) return; // nothing to animate on initial load

    // Kill competing tweens on rapid toggle; respect OS reduced-motion preference
    gsap.killTweensOf([splat3DRef.current, topLeftRef.current, bottomNavRef.current, tourGuideRef.current]);
    gsap.killTweensOf(['#navbar-nav-pills', '#navbar-admin-btn', '#side-controls-panel']);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DUR = reduceMotion ? 0.01 : 0.28;
    if (is3DMode) {
      setShowInfoPanel(false);
      // ─ Iframe overlay — fade in after a beat ─
      gsap.set(splat3DRef.current, { pointerEvents: 'auto' });
      gsap.fromTo(splat3DRef.current, { opacity: 0 }, { opacity: 1, duration: 0.55, delay: 0.12, ease: 'power2.inOut' });
      // ─ Navbar: hide everything except logo + 3D toggle ─
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
  }, [is3DMode, splatMounted]);

  /* ── Data loading ────────────────────────────────────────────────────────── */
  const withTimeout = useCallback((promise, ms, message) => {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
  }, []);

  const loadCampusData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const startupValidationMessage = getFirebaseStartupValidationMessage();
    if (startupValidationMessage) {
      setLoadError(startupValidationMessage);
      setIsLoading(false);
      return;
    }

    try {
      const depts = await withTimeout(
        getDepartments(),
        12000,
        'Campus data request timed out.'
      );
      setDepartments(depts);
      // Apply URL dept param on first load
      if (initialDeptIdRef.current) {
        const dept = depts.find(d => d.id === initialDeptIdRef.current);
        if (dept) { setActiveDept(dept.name); setActiveDeptId(initialDeptIdRef.current); }
      }
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('timed out') || message.includes('blocked')) {
        setLoadError('Campus data request timed out. Check ad/tracker blockers, firewall, and Firebase config, then try again.');
      } else {
        setLoadError('Could not connect to campus data. Please check your connection and Firebase configuration.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [withTimeout]);

  useEffect(() => { loadCampusData(); }, [loadCampusData]);

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
        if (!urlAppliedRef.current && initialRoomIdRef.current) {
          const target = flat.find(r => r.id === initialRoomIdRef.current);
          if (target) { setActiveRoom(target); urlAppliedRef.current = true; return; }
        }
        setActiveRoom(flat.length > 0 ? flat[0] : null);
      });
      return;
    }
    getRooms(activeDeptId).then((r) => {
      setRooms(r);
      if (!urlAppliedRef.current && initialRoomIdRef.current) {
        const target = r.find(rm => rm.id === initialRoomIdRef.current);
        if (target) { setActiveRoom(target); urlAppliedRef.current = true; return; }
      }
      setActiveRoom(r.length > 0 ? r[0] : null);
    });
  }, [activeDeptId, departments]);

  useEffect(() => {
    let cancelled = false;
    const deptId = activeDeptId ?? activeRoom?.deptId;
    if (!activeRoom?.id || !deptId) {
      Promise.resolve().then(() => {
        if (!cancelled) setHotspots([]);
      });
      return () => { cancelled = true; };
    }
    getHotspots(deptId, activeRoom.id).then((data) => {
      if (!cancelled) setHotspots(data);
    });
    return () => { cancelled = true; };
  }, [activeDeptId, activeRoom]);

  /* ── Reset 3D mode on room / dept change ─────────────────────────────────── */
  useEffect(() => {
    setIs3DMode(false);
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
  const handleAdminClick = useCallback(() => { navigate('/admin'); }, [navigate]);
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

  const filteredRooms = useMemo(
    () => rooms.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [rooms, searchQuery],
  );

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 font-sans">

      {/* ═══ PANORAMA BACKGROUND ══════════════════════════════════════════ */}
      {/* panoramaBgRef: GSAP drives blur/scale instead of Tailwind transition-all */}
      <div ref={panoramaBgRef} className="absolute inset-0">
        {activeRoom?.imageURL ? (
          <PanoramaViewer
            key={activeRoom.id || activeRoom.imageURL}
            imageURL={activeRoom.imageURL}
            initialView={activeRoom.defaultView}
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
            willChange: 'opacity',
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
        onPanUp={handlePanUp}
        onPanDown={handlePanDown}
        onPanLeft={handlePanLeft}
        onPanRight={handlePanRight}
        is3DMode={is3DMode}
        onToggle3D={() => setIs3DMode(v => !v)}
        show3DToggle={true}
        onAdminClick={handleAdminClick}
      />

      {/* ═══ TOP-LEFT: Dept filter + search ═══════════════════════════════ */}
      <div ref={topLeftRef} style={{
        position: 'absolute',
        top: '98px',
        left: '20px',       /* aligned with SideControls left edge */
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: 'min(220px, calc(100vw - 80px))', // responsive: leaves room for side controls
        willChange: 'transform, opacity',
      }}>

        {/* Department selector — custom dropdown */}
        <div ref={deptDropRef} style={{ position: 'relative' }}>
          {/* Pill trigger */}
          <div
            onClick={() => setDeptOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              ...PILL_STYLE,
              borderRadius: '39px',
              border: deptOpen ? '1px solid rgba(255,255,255,0.50)' : '1px solid rgba(255,255,255,0.22)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.50)', flexShrink: 0, lineHeight: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span style={{ flex: 1, color: '#fff', fontSize: '13px', fontWeight: 500, fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeDept}
            </span>
            <span style={{
              color: 'rgba(255,255,255,0.55)',
              flexShrink: 0,
              lineHeight: 0,
              transform: deptOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}><ChevronDown /></span>
          </div>

          {/* Options panel */}
          {deptOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: 'rgba(14,10,44,0.92)',
              backdropFilter: G_BLUR,
              WebkitBackdropFilter: G_BLUR,
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              zIndex: 50,
              overflow: 'hidden',
              maxHeight: '240px',
              overflowY: 'auto',
            }}>
              {['All Departments', ...departments.map(d => d.name)].map(name => (
                <div
                  key={name}
                  onClick={() => { handleDeptChange(name); setDeptOpen(false); }}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontFamily: 'Montserrat, sans-serif',
                    color: activeDept === name ? '#fff' : 'rgba(255,255,255,0.70)',
                    background: activeDept === name ? 'rgba(108,99,255,0.35)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (activeDept !== name) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { if (activeDept !== name) e.currentTarget.style.background = 'transparent'; }}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
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
          width: 'min(360px, calc(100vw - 40px))', // responsive: full-width on small screens
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 50,
          transform: 'translateX(110%)',
          opacity: 0,
          willChange: 'transform, opacity', // hint browser to composite this layer
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
              transition: 'background 0.15s ease, color 0.15s ease',
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

      {/* ═══ BOTTOM NAV — unified glass card: thumbnails + breadcrumb ══ */}
      <div
        ref={bottomNavRef}
        id="bottom-nav-panel"
        style={{
          position: 'absolute',
          bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', // safe area for iPhone home bar
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          willChange: 'transform, opacity',
        }}
      >
        {isBottomNavCollapsed ? (
          <button
            onClick={() => setIsBottomNavCollapsed(false)}
            title="Expand bottom panel"
            style={{
              background: G_BG,
              backdropFilter: G_BLUR,
              WebkitBackdropFilter: G_BLUR,
              boxShadow: `${G_SHADOW}, 0 8px 28px rgba(0,0,0,0.28)`,
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.20)',
              color: 'rgba(255,255,255,0.86)',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'Montserrat, sans-serif',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)', lineHeight: 0 }}>
              <ChevronDown />
            </span>
            Rooms
          </button>
        ) : (
        <div style={{
          position: 'relative',
          background: G_BG,
          backdropFilter: G_BLUR,
          WebkitBackdropFilter: G_BLUR,
          boxShadow: `${G_SHADOW}, 0 8px 32px rgba(0,0,0,0.30)`,
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.18)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}>
        <button
          onClick={() => setIsBottomNavCollapsed(true)}
          title="Collapse bottom panel"
          style={{
            position: 'absolute',
            top: '8px',
            right: '10px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.22)',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            outline: 'none',
            zIndex: 2,
          }}
        >
          <span style={{ display: 'inline-flex', lineHeight: 0 }}>
            <ChevronDown />
          </span>
        </button>
        {/* Room thumbnail cards — GSAP-animated slide wrapper */}
        <div ref={roomListRef} style={{ overflow: 'hidden' }}>
          <div
            className="pills-scroll"
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'nowrap',
              width: '100%',
              padding: '8px 8px 6px',
              overflowX: 'auto',
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
                    width: '76px',
                    flexShrink: 0,
                    borderRadius: '10px',
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
                    transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                    transform: isActive ? 'translateY(-3px)' : 'none',
                  }}
                >
                  {/* Thumbnail image */}
                  <div style={{ width: '100%', height: '44px', overflow: 'hidden', position: 'relative' }}>
                    {room.imageURL ? (
                      <img
                        src={getCloudinaryThumb(room.imageURL)}
                        alt={room.name}
                        width={76}
                        height={44}
                        loading="lazy"
                        decoding="async"
                        onLoad={e => gsap.to(e.currentTarget, { opacity: 1, duration: 0.3, ease: 'power2.out' })}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center 40%',
                          display: 'block',
                          opacity: 0, // GSAP fades in on load — progressive reveal
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
                    padding: '3px 5px 4px',
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.68)',
                    fontSize: '9px',
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
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)', margin: '0 8px' }} />
        </div>

        {/* Breadcrumb bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 18px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}>
          {/* ← Back to previous room */}
          {visitHistory.length > 1 && (
            <button
              onClick={() => setActiveRoom(visitHistory[1])}
              title={`Back to ${visitHistory[1].name}`}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.20)',
                borderRadius: '20px',
                color: 'rgba(255,255,255,0.60)',
                fontSize: '10px',
                fontWeight: 600,
                fontFamily: 'Montserrat, sans-serif',
                padding: '2px 9px',
                cursor: 'pointer',
                outline: 'none',
                maxWidth: '82px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0,
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.60)'; }}
            >
              ← {visitHistory[1].name}
            </button>
          )}
          {visitHistory.length > 1 && (
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '12px', flexShrink: 0 }}>|</span>
          )}

          {/* Campus */}
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 500, flexShrink: 0 }}>
            Campus
          </span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', lineHeight: 1, flexShrink: 0 }}>›</span>

          {/* Department — clickable */}
          <button
            onClick={() => setShowRoomList(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: showRoomList ? 'rgba(168,162,255,1)' : 'rgba(255,255,255,0.65)',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'Montserrat, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.15s ease',
              outline: 'none',
              flexShrink: 0,
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

          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', lineHeight: 1, flexShrink: 0 }}>›</span>

          {/* Active room pill */}
          <span style={{
            padding: '3px 11px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'Montserrat, sans-serif',
            letterSpacing: '-0.1px',
            ...PILL_ACTIVE_STYLE,
            border: '2px solid rgba(255,255,255,0.65)',
            flexShrink: 0,
          }}>
            {activeRoom?.name}
          </span>

          {/* Share / copy-link button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href).then(() => {
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              });
            }}
            title="Copy link to this room"
            style={{
              marginLeft: '2px',
              flexShrink: 0,
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: copiedLink ? 'rgba(52,211,153,0.20)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${copiedLink ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.20)'}`,
              color: copiedLink ? '#34d399' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {copiedLink ? '✓' : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            )}
          </button>
        </div>
        </div>
        )}
      </div>

      {/* ═══ BOTTOM-RIGHT: Merged Tour Guide Panel ══════════════════════ */}
      <div ref={tourGuideRef} style={{
        position: 'absolute',
        bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', // safe area for iPhone home bar
        right: '20px',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        willChange: 'transform, opacity',
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
              transition: 'background 0.22s ease, border-color 0.22s ease, color 0.22s ease',
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
            {/* Live dot when playing — pulses via CSS `pulse` keyframe */}
            {isTourPlaying && tourOpen && (
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 7px #34d399', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
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
                  style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.22)', color:'rgba(255,255,255,0.80)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', outline:'none', transition:'background 0.15s ease, color 0.15s ease' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.16)';e.currentTarget.style.color='#fff';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='rgba(255,255,255,0.80)';}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="19 20 9 12 19 4 19 20"/><rect x="4" y="4" width="3" height="16" rx="1"/></svg>
                </button>

                {/* ⏸/▶ Play-Pause */}
                <button onClick={() => setIsTourPlaying(p => !p)} title={isTourPlaying ? 'Pause' : 'Resume'}
                  style={{ width:'36px', height:'36px', borderRadius:'50%', background: isTourPlaying ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.10)', border:`1.5px solid ${isTourPlaying ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.28)'}`, color: isTourPlaying ? '#34d399' : 'rgba(255,255,255,0.85)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', outline:'none', transition:'background 0.18s ease, border-color 0.18s ease, color 0.18s ease' }}>
                  {isTourPlaying ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                  )}
                </button>

                {/* ▶ Next */}
                <button onClick={handleTourNext} title="Next room"
                  style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.22)', color:'rgba(255,255,255,0.80)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', outline:'none', transition:'background 0.15s ease, color 0.15s ease' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.16)';e.currentTarget.style.color='#fff';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='rgba(255,255,255,0.80)';}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 4 15 12 5 20 5 4"/><rect x="17" y="4" width="3" height="16" rx="1"/></svg>
                </button>

                {/* ⏹ Stop */}
                <button onClick={handleTourStop} title="Stop tour"
                  style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.16)', color:'rgba(255,255,255,0.50)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', outline:'none', transition:'background 0.15s ease, border-color 0.15s ease, color 0.15s ease' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.15)';e.currentTarget.style.borderColor='rgba(239,68,68,0.40)';e.currentTarget.style.color='rgb(252,165,165)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.borderColor='rgba(255,255,255,0.16)';e.currentTarget.style.color='rgba(255,255,255,0.50)';}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                </button>

              </div>
            </>
          )}
        </div>

      </div>

      {/* ─── Loading / Error overlay — fades out once campus data resolves ────────── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 200,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f0f1a 100%)',
        opacity: (isLoading || loadError) ? 1 : 0,
        pointerEvents: (isLoading || loadError) ? 'auto' : 'none',
        transition: 'opacity 0.4s ease',
      }}>
        {loadError ? (
          <div style={{ textAlign: 'center', padding: '32px', maxWidth: '340px' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>⚡</div>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 8px', fontFamily: 'Montserrat, sans-serif' }}>
              Connection Error
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 24px', fontFamily: 'Montserrat, sans-serif' }}>
              {loadError}
            </p>
            <button
              onClick={() => loadCampusData()}
              style={{
                padding: '10px 28px',
                background: 'rgba(108,99,255,0.25)',
                border: '1.5px solid rgba(108,99,255,0.60)',
                borderRadius: '50px', color: '#fff',
                fontSize: '13px', fontWeight: 600,
                fontFamily: 'Montserrat, sans-serif',
                cursor: 'pointer', outline: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.45)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(108,99,255,0.25)'}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '3px solid rgba(108,99,255,0.25)',
              borderTopColor: 'rgb(108,99,255)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{
              color: 'rgba(255,255,255,0.45)', fontSize: '12px',
              fontFamily: 'Montserrat, sans-serif',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>Loading campus…</p>
          </div>
        )}
      </div>

    </div>
  );
}
