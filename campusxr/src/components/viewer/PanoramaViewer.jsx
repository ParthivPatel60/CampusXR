/**
 * PanoramaViewer.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders an equirectangular 360° panorama using Three.js.
 * Hotspot markers are rendered as DOM elements and repositioned every animation
 * frame by projecting their pitch/yaw world positions through the Three.js
 * camera — so they correctly track as the user pans.
 *
 * Props:
 *   imageURL       — path / URL to the equirectangular image
 *   hotspots       — array of Firestore hotspot docs { id, pitch, yaw, text, type, … }
 *   onHotspotClick — callback(hotspot) invoked when a marker is clicked
 *   onReady        — optional callback(viewer) called once the scene initialises
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ── Inline hotspot styles — mirrors HotspotMarker.jsx design tokens ──────────
const TYPE_STYLES = {
    info: { ring: '#38BDF8', dot: '#0EA5E9', glow: 'rgba(56,189,248,0.60)', icon: 'ℹ' },
    navigation: { ring: '#34D399', dot: '#10B981', glow: 'rgba(52,211,153,0.60)', icon: '›' },
};

/** Build a single hotspot marker DOM element matching HotspotMarker.jsx visuals. */
function buildMarkerEl(hs, onClickCb) {
    const c = TYPE_STYLES[hs.type] ?? TYPE_STYLES.navigation;
    const label = hs.text || 'Hotspot';

    const btn = document.createElement('button');
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.dataset.hsId = hs.id;
    Object.assign(btn.style, {
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        zIndex: '20',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: '0',
        outline: 'none',
        display: 'none',      // hidden until first projection places it
        pointerEvents: 'auto',
    });

    // Pulse halo
    const halo = document.createElement('span');
    Object.assign(halo.style, {
        position: 'absolute',
        inset: '-8px',
        borderRadius: '50%',
        background: c.glow,
        opacity: '0.55',
        animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        pointerEvents: 'none',
    });
    btn.appendChild(halo);

    // Outer ring
    const ring = document.createElement('span');
    Object.assign(ring.style, {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        border: `3px solid ${c.ring}`,
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxShadow: `0 0 16px ${c.glow}, 0 4px 12px rgba(0,0,0,0.30)`,
        transition: 'all 0.18s ease',
    });

    // Inner dot
    const dot = document.createElement('span');
    Object.assign(dot.style, {
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: c.dot,
        boxShadow: `0 0 10px ${c.glow}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '9px',
        fontWeight: '800',
        lineHeight: '1',
        transition: 'all 0.18s ease',
    });
    dot.textContent = c.icon;
    ring.appendChild(dot);
    btn.appendChild(ring);

    // Label tooltip
    const tooltip = document.createElement('span');
    Object.assign(tooltip.style, {
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
        fontWeight: '500',
        letterSpacing: '0.03em',
        padding: '4px 12px',
        borderRadius: '20px',
        opacity: '0',
        transition: 'opacity 0.15s ease',
        pointerEvents: 'none',
        zIndex: '10',
    });
    tooltip.textContent = label;
    btn.appendChild(tooltip);

    // Hover interactions
    btn.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
        ring.style.background = c.glow;
        ring.style.width = '48px';
        ring.style.height = '48px';
        dot.style.width = '18px';
        dot.style.height = '18px';
    });
    btn.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        ring.style.background = 'rgba(255,255,255,0.08)';
        ring.style.width = '38px';
        ring.style.height = '38px';
        dot.style.width = '14px';
        dot.style.height = '14px';
    });
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClickCb(hs); });

    return btn;
}

export default function PanoramaViewer({ imageURL, hotspots = [], onHotspotClick, onReady }) {
    const mountRef = useRef(null);
    const markersContainerRef = useRef(null);
    const stateRef = useRef({});

    // Mutable refs let the animation loop always read the latest values
    // without re-initialising the entire Three.js scene.
    const hotspotsRef = useRef(hotspots);
    const onClickRef = useRef(onHotspotClick);

    useEffect(() => { hotspotsRef.current = hotspots; }, [hotspots]);
    useEffect(() => { onClickRef.current = onHotspotClick; }, [onHotspotClick]);

    // ── Rebuild marker DOM elements whenever the hotspot array changes ────────
    useEffect(() => {
        const container = markersContainerRef.current;
        if (!container) return;

        while (container.firstChild) container.removeChild(container.firstChild);
        hotspots.forEach((hs) => {
            const el = buildMarkerEl(hs, (clicked) => onClickRef.current?.(clicked));
            container.appendChild(el);
        });
    }, [hotspots]);

    // ── Three.js scene — only re-initialises when imageURL changes ────────────
    useEffect(() => {
        if (!imageURL) return;
        const mount = mountRef.current;
        const width = mount.clientWidth;
        const height = mount.clientHeight;

        // ── Renderer ──────────────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        mount.appendChild(renderer.domElement);

        // ── Scene & Camera ────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 0, 0.001);

        // ── Sphere ────────────────────────────────────────────────────────────────
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1); // flip normals → render inside

        const texture = new THREE.TextureLoader().load(imageURL);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        // ── Control state object attached to the viewer ───────────────────────────
        const ctrl = {
            lon: 0, lat: 0,
            targetLon: 0, targetLat: 0
        };

        // ── Drag-to-look controls ─────────────────────────────────────────────────
        let isPointerDown = false;
        let prevX = 0, prevY = 0;

        const onPointerDown = (e) => {
            isPointerDown = true;
            prevX = e.clientX ?? e.touches?.[0]?.clientX;
            prevY = e.clientY ?? e.touches?.[0]?.clientY;
        };
        const onPointerMove = (e) => {
            if (!isPointerDown) return;
            const x = e.clientX ?? e.touches?.[0]?.clientX;
            const y = e.clientY ?? e.touches?.[0]?.clientY;
            ctrl.targetLon -= (x - prevX) * 0.2;
            ctrl.targetLat += (y - prevY) * 0.2;
            ctrl.targetLat = Math.max(-85, Math.min(85, ctrl.targetLat));
            prevX = x; prevY = y;
        };
        const onPointerUp = () => { isPointerDown = false; };

        // Scroll / pinch zoom
        const onWheel = (e) => {
            camera.fov = Math.max(30, Math.min(100, camera.fov + e.deltaY * 0.05));
            camera.updateProjectionMatrix();
        };

        mount.addEventListener('pointerdown', onPointerDown);
        mount.addEventListener('pointermove', onPointerMove);
        mount.addEventListener('pointerup', onPointerUp);
        mount.addEventListener('pointerleave', onPointerUp);
        mount.addEventListener('wheel', onWheel, { passive: true });
        mount.addEventListener('touchstart', onPointerDown, { passive: true });
        mount.addEventListener('touchmove', onPointerMove, { passive: true });
        mount.addEventListener('touchend', onPointerUp);

        // ── Resize handler ────────────────────────────────────────────────────────
        const onResize = () => {
            const w = mount.clientWidth;
            const h = mount.clientHeight;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', onResize);

        // Reusable vector to avoid per-frame allocations
        const _projVec = new THREE.Vector3();

        // ── Animation loop ────────────────────────────────────────────────────────
        let animId;
        const animate = () => {
            animId = requestAnimationFrame(animate);

            // Smooth damping
            ctrl.lon += (ctrl.targetLon - ctrl.lon) * 0.08;
            ctrl.lat += (ctrl.targetLat - ctrl.lat) * 0.08;

            const phi = THREE.MathUtils.degToRad(90 - ctrl.lat);
            const theta = THREE.MathUtils.degToRad(ctrl.lon);

            camera.lookAt(
                500 * Math.sin(phi) * Math.cos(theta),
                500 * Math.cos(phi),
                500 * Math.sin(phi) * Math.sin(theta),
            );
            renderer.render(scene, camera);

            // ── Project hotspot world positions → screen pixels ───────────────────
            const container = markersContainerRef.current;
            if (container) {
                const w = mount.clientWidth;
                const h = mount.clientHeight;
                const hsList = hotspotsRef.current;
                const elList = container.children;

                for (let i = 0; i < elList.length && i < hsList.length; i++) {
                    const hs = hsList[i];
                    const el = elList[i];

                    const hsPhi = THREE.MathUtils.degToRad(90 - (hs.pitch ?? 0));
                    const hsTheta = THREE.MathUtils.degToRad(hs.yaw ?? 0);

                    _projVec.set(
                        500 * Math.sin(hsPhi) * Math.cos(hsTheta),
                        500 * Math.cos(hsPhi),
                        500 * Math.sin(hsPhi) * Math.sin(hsTheta),
                    );
                    _projVec.project(camera); // → NDC space [-1, 1]

                    // z <= 1 means the point is in front of the camera (not clipped behind)
                    const visible =
                        _projVec.z <= 1 &&
                        Math.abs(_projVec.x) <= 1.1 &&
                        Math.abs(_projVec.y) <= 1.1;

                    if (visible) {
                        el.style.left = `${(_projVec.x + 1) / 2 * w}px`;
                        el.style.top  = `${(1 - _projVec.y) / 2 * h}px`;
                        el.style.display = '';
                    } else {
                        el.style.display = 'none';
                    }
                }
            }
        };
        animate();

        // Expose minimal API for zoom/reset/pan controls in parent
        if (onReady) onReady({ camera, renderer, scene, ctrl });

        // ── Cleanup ───────────────────────────────────────────────────────────────
        stateRef.current = { renderer, animId };

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', onResize);
            mount.removeEventListener('pointerdown', onPointerDown);
            mount.removeEventListener('pointermove', onPointerMove);
            mount.removeEventListener('pointerup', onPointerUp);
            mount.removeEventListener('pointerleave', onPointerUp);
            mount.removeEventListener('wheel', onWheel);
            mount.removeEventListener('touchstart', onPointerDown);
            mount.removeEventListener('touchmove', onPointerMove);
            mount.removeEventListener('touchend', onPointerUp);
            renderer.dispose();
            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
        };
    }, [imageURL]); // re-initialise whenever the panorama image changes

    return (
        <div
            ref={mountRef}
            className="absolute inset-0 w-full h-full"
            style={{ touchAction: 'none', cursor: 'grab' }}
        >
            {/* Hotspot markers — created imperatively, positioned by projection in animate() */}
            <div
                ref={markersContainerRef}
                style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}
            />
        </div>
    );
}