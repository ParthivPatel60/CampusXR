import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Viewers
import PanoramaViewer from '../components/viewer/PanoramaViewer';

// Components
import TopControls from '../components/ui/TopControls';
import NavigationPanel from '../components/ui/NavigationPanel';
import BottomNavigation from '../components/ui/BottomNavigation';
import InfoSidePanel from '../components/ui/InfoSidePanel';

// FireStore Integration
import { getDepartments, getRooms, getHotspots } from '../services/firestoreService';

gsap.registerPlugin(useGSAP);

export default function UserTourPage() {
  /* ── State ───────────────────────────────────────────────────────────────── */
  const [activeDept, setActiveDept] = useState('');
  const [activeRoom, setActiveRoom] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeDeptId, setActiveDeptId] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [hotspots, setHotspots] = useState([]);

  /* ── Refs ────────────────────────────────────────────────────────────────── */
  const viewerRef = useRef(null);
  const containerRef = useRef(null);

  /* ── Initial Entrance Animations ─────────────────────────────────────────── */
  useGSAP(() => {
    // Elegant, heavy staggering entrance for all UI overlay elements
    const tl = gsap.timeline();
    tl.from('.gsap-entrance', {
      y: 40,
      opacity: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'expo.out',
      delay: 0.3,
      clearProps: 'all' // prevents GSAP inline styles from interfering with CSS hover states later
    });
  }, { scope: containerRef });

  /* ── Camera handlers ─────────────────────────────────────────────────────── */
  const handleZoomIn = () => { const c = viewerRef.current?.camera; if (c) { c.fov = Math.max(30, c.fov - 10); c.updateProjectionMatrix(); } };
  const handleZoomOut = () => { const c = viewerRef.current?.camera; if (c) { c.fov = Math.min(100, c.fov + 10); c.updateProjectionMatrix(); } };
  const handleRefresh = () => { const c = viewerRef.current?.camera; if (c) { c.fov = 75; c.updateProjectionMatrix(); } };

  /* ── Data loading ────────────────────────────────────────────────────────── */
  useEffect(() => {
    getDepartments().then((depts) => {
      setDepartments(depts);
      if (depts.length > 0) { setActiveDept(depts[0].name); setActiveDeptId(depts[0].id); }
    });
  }, []);

  useEffect(() => {
    if (!activeDeptId) return;
    getRooms(activeDeptId).then((r) => { setRooms(r); setActiveRoom(r.length > 0 ? r[0] : null); });
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
        if (targetDept) { setActiveDept(targetDept.name); setActiveDeptId(hs.targetDeptId); }
      } else {
        const target = rooms.find(r => r.id === hs.targetRoomId);
        if (target) setActiveRoom(target);
      }
    }
  };

  const handleDeptChange = (deptName) => {
    setActiveDept(deptName);
    const dept = departments.find(d => d.name === deptName);
    if (dept) setActiveDeptId(dept.id);
  };
  
  const handleRoomSelect = (room) => { setActiveRoom(room); };

  const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 font-sans shadow-none">
      {/* ═══ PANORAMA BACKGROUND ══════════════════════════════════════════ */}
      <div className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${showInfoPanel ? 'blur-md scale-105 brightness-50' : ''}`}>
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
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1e1b4b_0%,_#0f0f1a_100%)]" />
        )}
        {is3DMode && activeRoom?.splat3DUrl && (
          <iframe
            key={activeRoom.splat3DUrl}
            src={activeRoom.splat3DUrl}
            className="absolute inset-0 w-full h-full border-none bg-[#0f0f1a]"
            allow="fullscreen; xr-spatial-tracking" // ensure immersive XR is supported in frame
            title={`3D Gaussian Splat — ${activeRoom.name}`}
          />
        )}
      </div>

      {/* ═══ UI OVERLAY (pointer-events-none root) ════════════════════════ */}
      <div ref={containerRef} className="pointer-events-none absolute inset-0 z-10 font-sans">
        
        <TopControls 
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredRooms={filteredRooms}
          handleRoomSelect={handleRoomSelect} activeRoom={activeRoom} activeDept={activeDept}
          departments={departments} handleDeptChange={handleDeptChange}
          is3DMode={is3DMode} setIs3DMode={setIs3DMode}
        />

        <NavigationPanel 
          onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onRefresh={handleRefresh} 
          setShowInfoPanel={setShowInfoPanel}
        />

        <BottomNavigation 
          activeRoom={activeRoom} rooms={rooms} handleRoomSelect={handleRoomSelect} activeDept={activeDept}
        />

        <InfoSidePanel 
          showInfoPanel={showInfoPanel} setShowInfoPanel={setShowInfoPanel} activeHotspot={activeHotspot} 
        />

      </div>
    </div>
  );
}