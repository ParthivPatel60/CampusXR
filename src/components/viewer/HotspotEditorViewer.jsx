/**
 * HotspotEditorViewer.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive 360° panorama viewer used inside the admin hotspot editor.
 *
 * Features:
 *   • Three.js sphere viewer — drag to pan, scroll to zoom (same as PanoramaViewer)
 *   • Click (not drag) → raycast into sphere → emit { pitch, yaw } via onPlaceHotspot
 *   • Projects saved hotspots as coloured DOM buttons (click to delete)
 *   • Projects the pending (unsaved) selection as an amber pulsing marker
 *
 * Props:
 *   imageURL        — equirectangular panorama URL
 *   hotspots        — array of { id, type, pitch, yaw, text }
 *   pendingPos      — { pitch, yaw } | null
 *   onPlaceHotspot  — ({ pitch, yaw }) => void  — called on click
 *   onDeleteHotspot — (id) => void              — called on marker click
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GEO_R = 500;

/** Convert an intersection point on the sphere back to pitch + yaw. */
function worldToPitchYaw(v) {
  const r = v.length();
  const pitch = Math.round((90 - THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(v.y / r, -1, 1)))) * 10) / 10;
  const yaw   = Math.round(THREE.MathUtils.radToDeg(Math.atan2(v.z, v.x)) * 10) / 10;
  return { pitch, yaw };
}

/** Build a DOM button for a saved hotspot. */
function makeHotspotEl(hs, onDeleteRef) {
  const isInfo = hs.type === 'info';
  const bg     = isInfo ? '#0EA5E9' : '#10B981';
  const glow   = isInfo ? 'rgba(56,189,248,0.8)' : 'rgba(52,211,153,0.8)';

  const btn = document.createElement('button');
  btn.title = `${hs.text}\nClick to delete`;
  Object.assign(btn.style, {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    zIndex: '20',
    cursor: 'pointer',
    display: 'none',            // hidden until first projection
    background: bg,
    border: '2.5px solid rgba(255,255,255,0.9)',
    borderRadius: '50%',
    width: '30px', height: '30px',
    outline: 'none', padding: '0',
    color: '#fff',
    fontSize: '13px', fontWeight: '700', lineHeight: '1',
    boxShadow: `0 0 12px ${glow}`,
    pointerEvents: 'auto',
    transition: 'transform 0.12s',
  });
  btn.textContent = isInfo ? 'ℹ' : '›';
  btn.addEventListener('mouseenter', () => { btn.style.transform = 'translate(-50%,-50%) scale(1.25)'; });
  btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate(-50%,-50%) scale(1)'; });
  btn.addEventListener('click', (e) => { e.stopPropagation(); onDeleteRef.current?.(hs.id); });
  return btn;
}

export default function HotspotEditorViewer({
  imageURL,
  hotspots = [],
  pendingPos,
  onPlaceHotspot,
  onDeleteHotspot,
  initialView,
  onViewChange,
}) {
  const mountRef        = useRef(null);
  const overlayRef      = useRef(null);
  const pendingElRef    = useRef(null);
  const hotspotsRef     = useRef(hotspots);
  const pendingPosRef   = useRef(pendingPos);
  const onPlaceRef      = useRef(onPlaceHotspot);
  const onDeleteRef     = useRef(onDeleteHotspot);
  const onViewChangeRef = useRef(onViewChange);

  useEffect(() => { hotspotsRef.current   = hotspots; },        [hotspots]);
  useEffect(() => { pendingPosRef.current  = pendingPos; },      [pendingPos]);
  useEffect(() => { onPlaceRef.current     = onPlaceHotspot; },  [onPlaceHotspot]);
  useEffect(() => { onDeleteRef.current    = onDeleteHotspot; }, [onDeleteHotspot]);
  useEffect(() => { onViewChangeRef.current = onViewChange; },   [onViewChange]);

  // ── Rebuild hotspot marker DOM elements whenever hotspots array changes ──
  useEffect(() => {
    const container = overlayRef.current;
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    hotspots.forEach((hs) => {
      container.appendChild(makeHotspotEl(hs, onDeleteRef));
    });
  }, [hotspots]);

  // ── Show / hide pending amber marker ────────────────────────────────────
  useEffect(() => {
    const el = pendingElRef.current;
    if (el) el.style.display = pendingPos ? '' : 'none';
  }, [pendingPos]);

  // ── Three.js scene (re-mounts when imageURL changes) ────────────────────
  useEffect(() => {
    if (!imageURL) return;
    const mount = mountRef.current;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';

    // ── Scene / Camera / Sphere ───────────────────────────────────────────
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.001);

    const geometry = new THREE.SphereGeometry(GEO_R, 60, 40);
    geometry.scale(-1, 1, 1);
    const texture  = new THREE.TextureLoader().load(imageURL);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sphere   = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
    scene.add(sphere);

    // ── Drag-to-look state ────────────────────────────────────────────────
    let isDown = false, prevX = 0, prevY = 0, dragDist = 0;
    const clampPitch = (v) => Math.max(-85, Math.min(85, v));
    const clampFov = (v) => Math.max(30, Math.min(100, v));
    const initYaw = Number.isFinite(initialView?.yaw) ? initialView.yaw : 0;
    const initPitch = Number.isFinite(initialView?.pitch) ? clampPitch(initialView.pitch) : 0;
    const initFov = Number.isFinite(initialView?.fov) ? clampFov(initialView.fov) : 75;

    let lon = initYaw, lat = initPitch, targetLon = initYaw, targetLat = initPitch;
    camera.fov = initFov;
    camera.updateProjectionMatrix();

    let lastViewSig = '';
    const emitView = () => {
      const payload = {
        yaw: Math.round(lon * 10) / 10,
        pitch: Math.round(lat * 10) / 10,
        fov: Math.round(camera.fov * 10) / 10,
      };
      const sig = `${payload.yaw}|${payload.pitch}|${payload.fov}`;
      if (sig === lastViewSig) return;
      lastViewSig = sig;
      onViewChangeRef.current?.(payload);
    };

    const raycaster = new THREE.Raycaster();
    const ndc       = new THREE.Vector2();

    // ── Pointer handlers ──────────────────────────────────────────────────
    const onPointerDown = (e) => {
      isDown = true; dragDist = 0;
      prevX = e.clientX; prevY = e.clientY;
      mount.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      dragDist += Math.abs(dx) + Math.abs(dy);
      targetLon -= dx * 0.20;
      targetLat += dy * 0.20;
      targetLat = Math.max(-85, Math.min(85, targetLat));
      prevX = e.clientX; prevY = e.clientY;
    };
    const onPointerUp = (e) => {
      if (!isDown) return;
      isDown = false;

      // Treat as a click only if the pointer barely moved (< 5px travel)
      if (dragDist < 5) {
        const rect = mount.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
        ndc.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObject(sphere);
        if (hits.length > 0) {
          onPlaceRef.current?.(worldToPitchYaw(hits[0].point));
        }
      }
      emitView();
    };

    const onWheel = (e) => {
      camera.fov = Math.max(30, Math.min(100, camera.fov + e.deltaY * 0.05));
      camera.updateProjectionMatrix();
      emitView();
    };
    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };

    mount.addEventListener('pointerdown',  onPointerDown);
    mount.addEventListener('pointermove',  onPointerMove);
    mount.addEventListener('pointerup',    onPointerUp);
    mount.addEventListener('pointerleave', () => { isDown = false; });
    mount.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);

    emitView();

    // ── Animation loop ────────────────────────────────────────────────────
    const _v = new THREE.Vector3();
    let animId;

    const project = (pitch, yaw) => {
      const phi   = THREE.MathUtils.degToRad(90 - pitch);
      const theta = THREE.MathUtils.degToRad(yaw);
      _v.set(
        GEO_R * Math.sin(phi) * Math.cos(theta),
        GEO_R * Math.cos(phi),
        GEO_R * Math.sin(phi) * Math.sin(theta),
      );
      _v.project(camera);
      const cw = mount.clientWidth, ch = mount.clientHeight;
      const inFront = _v.z <= 1 && Math.abs(_v.x) <= 1.05 && Math.abs(_v.y) <= 1.05;
      return inFront
        ? { visible: true, x: (_v.x + 1) / 2 * cw, y: (1 - _v.y) / 2 * ch }
        : { visible: false };
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth camera damping
      lon += (targetLon - lon) * 0.08;
      lat += (targetLat - lat) * 0.08;
      const phi   = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      camera.lookAt(
        GEO_R * Math.sin(phi) * Math.cos(theta),
        GEO_R * Math.cos(phi),
        GEO_R * Math.sin(phi) * Math.sin(theta),
      );
      renderer.render(scene, camera);

      // Project saved hotspot markers
      const container = overlayRef.current;
      if (container) {
        const els    = container.children;
        const hsList = hotspotsRef.current;
        for (let i = 0; i < els.length && i < hsList.length; i++) {
          const { visible, x, y } = project(hsList[i].pitch ?? 0, hsList[i].yaw ?? 0);
          const el = els[i];
          if (visible) { el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.display = ''; }
          else          { el.style.display = 'none'; }
        }
      }

      // Project pending marker
      const pp  = pendingPosRef.current;
      const pel = pendingElRef.current;
      if (pel && pp) {
        const { visible, x, y } = project(pp.pitch, pp.yaw);
        if (visible) { pel.style.left = `${x}px`; pel.style.top = `${y}px`; pel.style.display = ''; }
        else          { pel.style.display = 'none'; }
      }
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener('pointerdown',  onPointerDown);
      mount.removeEventListener('pointermove',  onPointerMove);
      mount.removeEventListener('pointerup',    onPointerUp);
      mount.removeEventListener('pointerleave', () => { isDown = false; });
      mount.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [imageURL, initialView?.yaw, initialView?.pitch, initialView?.fov]);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none', cursor: 'crosshair' }}
    >
      {/* Saved hotspot markers — positioned imperatively in animate() */}
      <div
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}
      />

      {/* Pending (unsaved) marker — amber pulsing dot */}
      <div
        ref={pendingElRef}
        style={{
          position: 'absolute',
          display: 'none',
          width: '28px', height: '28px',
          borderRadius: '50%',
          background: '#f59e0b',
          border: '2.5px solid #fff',
          boxShadow: '0 0 16px rgba(245,158,11,0.85)',
          transform: 'translate(-50%, -50%)',
          zIndex: 15,
          pointerEvents: 'none',
          animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
        }}
      />
    </div>
  );
}
