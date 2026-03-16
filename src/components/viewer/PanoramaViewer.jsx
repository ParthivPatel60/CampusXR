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

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

// ── Inline hotspot styles — mirrors HotspotMarker.jsx design tokens ──────────
const TYPE_STYLES = {
    info: { ring: '#38BDF8', dot: '#0EA5E9', glow: 'rgba(56,189,248,0.60)', icon: 'ℹ' },
    navigation: { ring: '#34D399', dot: '#10B981', glow: 'rgba(52,211,153,0.60)', icon: '›' },
};

// Street-view arrow vertical placement tuning.
// Increase ARROW_Y_OFFSET_PX or ARROW_MAX_Y_RATIO to push arrows lower.
const ARROW_MIN_Y_RATIO = 0.70;
const ARROW_MAX_Y_RATIO = 0.95;
const ARROW_Y_OFFSET_PX = 26;
const ARROW_PANEL_GAP_PX = 6;

const prefersReducedMotion = () => (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

function setHotspotVisibility(el, visible) {
    if (!el) return;
    const ring = el.__ringEl;

    if (visible) {
        if (el.dataset.inView === '1') return;
        el.dataset.inView = '1';
        el.style.display = '';

        gsap.killTweensOf(el);
        if (ring) gsap.killTweensOf(ring);

        if (prefersReducedMotion()) {
            el.style.opacity = '1';
            return;
        }

        gsap.set(el, { opacity: 0 });
        if (ring) gsap.set(ring, { scale: 0.84, transformOrigin: '50% 50%' });

        const tl = gsap.timeline();
        tl.to(el, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0);
        if (ring) {
            tl.to(ring, {
                scale: 1,
                duration: 0.26,
                ease: 'back.out(1.6)',
                clearProps: 'transform',
            }, 0);
        }
        return;
    }

    if (el.dataset.inView === '0') return;
    el.dataset.inView = '0';
    gsap.killTweensOf(el);
    if (ring) gsap.killTweensOf(ring);

    if (prefersReducedMotion()) {
        el.style.display = 'none';
        return;
    }

    gsap.to(el, {
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
        onComplete: () => {
            if (el.dataset.inView === '0') {
                el.style.display = 'none';
            }
        },
    });
}

function setArrowVisibility(el, visible) {
    if (!el) return;
    const btn = el.__btnEl;

    if (visible) {
        if (el.dataset.inView === '1') return;
        el.dataset.inView = '1';
        el.style.display = 'flex';

        if (!btn) return;
        gsap.killTweensOf(btn);

        if (prefersReducedMotion()) {
            btn.style.opacity = '1';
            return;
        }

        gsap.fromTo(
            btn,
            { scale: 0.88, opacity: 0.25 },
            { scale: 1, opacity: 1, duration: 0.24, ease: 'power2.out', overwrite: true },
        );
        return;
    }

    if (el.dataset.inView === '0') return;
    el.dataset.inView = '0';

    if (!btn) {
        el.style.display = 'none';
        return;
    }

    gsap.killTweensOf(btn);
    if (prefersReducedMotion()) {
        el.style.display = 'none';
        return;
    }

    gsap.to(btn, {
        scale: 0.92,
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
        overwrite: true,
        onComplete: () => {
            if (el.dataset.inView === '0') {
                el.style.display = 'none';
            }
        },
    });
}

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
        opacity: '0',
        pointerEvents: 'auto',
        willChange: 'opacity',
    });
    btn.dataset.inView = '0';

    // Adaptive spotlight aura (camera-heading driven in animate loop)
    const aura = document.createElement('span');
    Object.assign(aura.style, {
        position: 'absolute',
        inset: '-12px',
        borderRadius: '50%',
        background: c.glow,
        filter: 'blur(8px)',
        opacity: '0.08',
        pointerEvents: 'none',
        transform: 'scale(0.92)',
        transformOrigin: '50% 50%',
        willChange: 'transform, opacity',
    });
    btn.appendChild(aura);

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
        transition: 'transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
        transformOrigin: '50% 50%',
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
        transition: 'transform 0.18s ease',
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
        ring.style.transform = 'scale(1.26)'; // 48/38 — compositor-only, no layout reflow
        dot.style.transform = 'scale(1.29)';  // 18/14
    });
    btn.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        ring.style.background = 'rgba(255,255,255,0.08)';
        ring.style.transform = 'scale(1)';
        dot.style.transform = 'scale(1)';
    });
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClickCb(hs); });
    btn.__ringEl = ring;
    btn.__spotlightSet = {
        auraOpacity: gsap.quickSetter(aura, 'opacity'),
        auraScale: gsap.quickSetter(aura, 'scale'),
        haloOpacity: gsap.quickSetter(halo, 'opacity'),
    };

    return btn;
}

// ── Street-View-style flat floor arrow for navigation hotspots ───────────────
/**
 * Builds a flat triangular arrow that is independently projected into screen
 * space (same technique as hotspot markers) so multiple arrows spread out
 * across the viewport rather than clustering at one anchor point.
 * The arrow SVG is a wide flat chevron matching the Google Street View aesthetic.
 * The wrapper is positioned by the animate loop via `left` / `top` and
 * screen-space rotation via `transform: translate(-50%,-50%) rotate(Xdeg)`.
 */
function buildArrowEl(hs, onClickCb) {
    const ns = 'http://www.w3.org/2000/svg';

    // Outer wrapper — positioned absolutely by the animate loop
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
        position: 'absolute',
        display: 'none',           // shown by animate() once in-frame
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        // transform is set per-frame; origin is center of the element
        transform: 'translate(-50%, -50%) rotate(0deg)',
        transformOrigin: 'center center',
        zIndex: '30',
        pointerEvents: 'none',     // clicks are on the inner button
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: '0',
        transition: 'opacity 0.3s ease',
        willChange: 'transform, opacity',
    });
    wrapper.dataset.inView = '0';

    // Clickable button (covers the whole element)
    const btn = document.createElement('button');
    Object.assign(btn.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        background: 'none',
        border: 'none',
        padding: '0',
        cursor: 'pointer',
        outline: 'none',
        pointerEvents: 'auto',
        willChange: 'transform, opacity',
    });

    // ── Arrow SVG — wide flat chevron (matches screenshot proportions) ────────
    // viewBox 90×48: wide & short = flat on-floor look.
    // Shape: a flat play-button triangle pointing upward (tip at top-center).
    // visually looks like a flat floor arrow when viewed in panorama.
    const arrowD = 'M45,4 L86,44 L45,30 L4,44 Z';

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '80');
    svg.setAttribute('height', '44');
    svg.setAttribute('viewBox', '0 0 90 48');
    svg.style.display = 'block';
    svg.style.filter = 'drop-shadow(0 0 8px rgba(52,211,153,0.70))';
    svg.style.transition = 'transform 0.15s ease';

    // Glow / fill layers
    const glowPth = document.createElementNS(ns, 'path');
    glowPth.setAttribute('d', arrowD);
    glowPth.setAttribute('fill', 'rgba(52,211,153,0.35)');
    svg.appendChild(glowPth);

    const mainPth = document.createElementNS(ns, 'path');
    mainPth.setAttribute('d', arrowD);
    mainPth.setAttribute('fill', 'rgba(52,211,153,0.82)');
    mainPth.setAttribute('stroke', 'rgba(255,255,255,0.70)');
    mainPth.setAttribute('stroke-width', '2');
    mainPth.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(mainPth);

    btn.appendChild(svg);

    // ── Label pill ───────────────────────────────────────────────────────────
    const label = document.createElement('div');
    label.textContent = hs.text || 'Navigate';
    Object.assign(label.style, {
        color: '#fff',
        fontSize: '12px',
        fontWeight: '700',
        letterSpacing: '0.07em',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: 'rgba(8,8,24,0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '5px 14px',
        borderRadius: '20px',
        border: '1.5px solid rgba(52,211,153,0.75)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.55)',
        whiteSpace: 'nowrap',
        textShadow: '0 1px 4px rgba(0,0,0,0.90)',
        pointerEvents: 'none',
    });
    btn.appendChild(label);

    wrapper.appendChild(btn);
    wrapper.__btnEl = btn;

    if (!prefersReducedMotion()) {
        const seed = Math.abs(Number(hs?.yaw ?? 0)) % 360;
        const delay = (seed / 360) * 0.45;
        const driftTween = gsap.to(btn, {
            y: -2.5,
            duration: 1.9,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay,
        });
        const breatheTween = gsap.to(svg, {
            scale: 1.04,
            duration: 1.7,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: delay * 0.7,
            transformOrigin: '50% 50%',
        });
        wrapper.__driftTweens = [driftTween, breatheTween];
    }

    // Hover feedback
    btn.addEventListener('mouseenter', () => {
        mainPth.setAttribute('fill', 'rgba(255,255,255,0.92)');
        svg.style.filter = 'drop-shadow(0 0 14px rgba(52,211,153,0.95))';
        label.style.background = 'rgba(16,185,129,0.88)';
    });
    btn.addEventListener('mouseleave', () => {
        mainPth.setAttribute('fill', 'rgba(52,211,153,0.82)');
        svg.style.filter = 'drop-shadow(0 0 8px rgba(52,211,153,0.70))';
        label.style.background = 'rgba(8,8,24,0.78)';
    });
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClickCb(hs); });

    return wrapper;
}

export default function PanoramaViewer({ imageURL, hotspots = [], onHotspotClick, onReady, initialView }) {
    const mountRef = useRef(null);
    const markersContainerRef = useRef(null);
    const arrowsAnchorRef = useRef(null);
    const stateRef = useRef({});

    // Loading progress state — shown until texture decodes
    const [loadProgress, setLoadProgress] = useState(0);
    const [textureLoaded, setTextureLoaded] = useState(false);

    // Mutable refs let the animation loop always read the latest values
    // without re-initialising the entire Three.js scene.
    const hotspotsRef = useRef(hotspots);
    // Pre-filtered navigation hotspots — avoids a .filter() call inside the 60fps loop
    const navHotspotsRef = useRef(hotspots.filter(h => h.type === 'navigation'));
    const onClickRef = useRef(onHotspotClick);
    const onReadyRef = useRef(onReady);

    useEffect(() => {
        hotspotsRef.current = hotspots;
        navHotspotsRef.current = hotspots.filter(h => h.type === 'navigation');
    }, [hotspots]);
    useEffect(() => { onClickRef.current = onHotspotClick; }, [onHotspotClick]);
    useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

    // ── Rebuild marker DOM elements whenever the hotspot array changes ────────
    useEffect(() => {
        const container = markersContainerRef.current;
        if (!container) return;

        while (container.firstChild) {
            gsap.killTweensOf(container.firstChild);
            if (container.firstChild.__ringEl) gsap.killTweensOf(container.firstChild.__ringEl);
            container.removeChild(container.firstChild);
        }
        hotspots.forEach((hs) => {
            const el = buildMarkerEl(hs, (clicked) => onClickRef.current?.(clicked));
            container.appendChild(el);
        });
    }, [hotspots]);

    // ── Rebuild Street-View nav arrows whenever hotspots change ──────────────
    useEffect(() => {
        const anchor = arrowsAnchorRef.current;
        if (!anchor) return;
        while (anchor.firstChild) {
            const node = anchor.firstChild;
            if (Array.isArray(node.__driftTweens)) {
                node.__driftTweens.forEach((t) => t?.kill?.());
            }
            if (node.__btnEl) gsap.killTweensOf(node.__btnEl);
            anchor.removeChild(node);
        }
        hotspots
            .filter(h => h.type === 'navigation')
            .forEach(hs => {
                const el = buildArrowEl(hs, clicked => onClickRef.current?.(clicked));
                anchor.appendChild(el);
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
        const geometry = new THREE.SphereGeometry(500, 48, 32); // 48×32 is imperceptibly smoother vs 60×40 but ~36% fewer vertices
        geometry.scale(-1, 1, 1); // flip normals → render inside

        const manager = new THREE.LoadingManager();
        manager.onProgress = (_, loaded, total) => setLoadProgress(Math.round(loaded / total * 100));
        manager.onLoad = () => setTextureLoaded(true);
        const texture = new THREE.TextureLoader(manager).load(imageURL);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false;       // panoramic textures don't benefit from mipmaps
        texture.minFilter = THREE.LinearFilter; // saves ~33% GPU texture memory
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        // ── Drag-to-look controls ─────────────────────────────────────────────────
        const clampPitch = (v) => Math.max(-85, Math.min(85, v));
        const clampFov = (v) => Math.max(30, Math.min(100, v));
        const defaultYaw = Number.isFinite(initialView?.yaw) ? initialView.yaw : 0;
        const defaultPitch = Number.isFinite(initialView?.pitch) ? clampPitch(initialView.pitch) : 0;
        const defaultFov = Number.isFinite(initialView?.fov) ? clampFov(initialView.fov) : 75;

        let isPointerDown = false;
        let prevX = 0, prevY = 0;
        let lon = defaultYaw, lat = defaultPitch;
        let targetLon = defaultYaw, targetLat = defaultPitch;
        camera.fov = defaultFov;
        camera.updateProjectionMatrix();

        const onPointerDown = (e) => {
            isPointerDown = true;
            prevX = e.clientX ?? e.touches?.[0]?.clientX;
            prevY = e.clientY ?? e.touches?.[0]?.clientY;
        };
        const onPointerMove = (e) => {
            if (!isPointerDown) return;
            const x = e.clientX ?? e.touches?.[0]?.clientX;
            const y = e.clientY ?? e.touches?.[0]?.clientY;
            targetLon -= (x - prevX) * 0.2;
            targetLat += (y - prevY) * 0.2;
            targetLat = Math.max(-85, Math.min(85, targetLat));
            prevX = x; prevY = y;
        };
        const onPointerUp = () => { isPointerDown = false; };

        // ── Touch pinch-to-zoom ───────────────────────────────────────────────────
        let lastPinchDist = 0;
        let isPinching = false;
        const onTouchStart = (e) => {
            if (e.touches.length === 2) {
                isPinching = true;
                isPointerDown = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastPinchDist = Math.sqrt(dx * dx + dy * dy);
            } else {
                isPinching = false;
                onPointerDown(e);
            }
        };
        const onTouchMove = (e) => {
            if (e.touches.length === 2 && isPinching) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const delta = lastPinchDist - dist;
                camera.fov = Math.max(30, Math.min(100, camera.fov + delta * 0.05));
                camera.updateProjectionMatrix();
                lastPinchDist = dist;
            } else if (!isPinching) {
                onPointerMove(e);
            }
        };

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
        mount.addEventListener('touchstart', onTouchStart, { passive: true });
        mount.addEventListener('touchmove', onTouchMove, { passive: true });
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
        // GSAP utility mappers for adaptive hotspot spotlight
        const clamp01 = gsap.utils.clamp(0, 1);
        const normalizeDistance = gsap.utils.normalize(0, 1.1); // NDC distance from center
        const mapAuraOpacity = gsap.utils.mapRange(0, 1, 0.08, 0.62);
        const mapAuraScale = gsap.utils.mapRange(0, 1, 0.92, 1.24);
        const mapHaloOpacity = gsap.utils.mapRange(0, 1, 0.28, 0.82);

        // ── Animation loop ────────────────────────────────────────────────────────
        let animId;
        const animate = () => {
            animId = requestAnimationFrame(animate);

            // Smooth damping
            lon += (targetLon - lon) * 0.08;
            lat += (targetLat - lat) * 0.08;

            const phi = THREE.MathUtils.degToRad(90 - lat);
            const theta = THREE.MathUtils.degToRad(lon);

            camera.lookAt(
                500 * Math.sin(phi) * Math.cos(theta),
                500 * Math.cos(phi),
                500 * Math.sin(phi) * Math.sin(theta),
            );
            renderer.render(scene, camera);

            // ── Project hotspot world positions → screen pixels ───────────────────
            // Pitch/yaw → 3D point on the panorama sphere using the same formula
            // as the camera lookAt, so yaw=0/pitch=0 aligns with the default view.
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
                        setHotspotVisibility(el, true);

                        // Adaptive spotlight: stronger glow when hotspot is near
                        // camera heading (screen center), weaker toward edges.
                        const setters = el.__spotlightSet;
                        if (setters && !prefersReducedMotion()) {
                            const distance = Math.hypot(_projVec.x, _projVec.y);
                            const normalized = clamp01(normalizeDistance(distance));
                            const focusRaw = 1 - normalized;
                            const focus = focusRaw * focusRaw; // center-biased falloff
                            setters.auraOpacity(mapAuraOpacity(focus));
                            setters.auraScale(mapAuraScale(focus));
                            setters.haloOpacity(mapHaloOpacity(focus));
                        }
                    } else {
                        setHotspotVisibility(el, false);
                        const setters = el.__spotlightSet;
                        if (setters) {
                            setters.auraOpacity(0.08);
                            setters.auraScale(0.92);
                            setters.haloOpacity(0.28);
                        }
                    }
                }
            }

            // ── Street-View arrows: project each independently like hotspot markers ──
            const arrowAnchor = arrowsAnchorRef.current;
            if (arrowAnchor) {
                const navList = navHotspotsRef.current; // pre-filtered; no allocation per frame
                const arrowEls = arrowAnchor.children;
                const w2 = mount.clientWidth;
                const h2 = mount.clientHeight;

                for (let j = 0; j < arrowEls.length && j < navList.length; j++) {
                    const hs = navList[j];
                    const el = arrowEls[j];

                    // Project the hotspot's 3D position to screen (same as marker logic)
                    const hsPhi   = THREE.MathUtils.degToRad(90 - (hs.pitch ?? 0));
                    const hsTheta = THREE.MathUtils.degToRad(hs.yaw ?? 0);
                    _projVec.set(
                        500 * Math.sin(hsPhi) * Math.cos(hsTheta),
                        500 * Math.cos(hsPhi),
                        500 * Math.sin(hsPhi) * Math.sin(hsTheta),
                    );
                    _projVec.project(camera);

                    const inFront = _projVec.z <= 1;
                    const sx = (_projVec.x + 1) / 2 * w2;
                    const sy = (1 - _projVec.y) / 2 * h2;

                    // Show only when hotspot is in the front hemisphere
                    // but clamp the arrow to the lower third of the viewport
                    // so it always appears near floor level.
                    if (!inFront) {
                        setArrowVisibility(el, false);
                        continue;
                    }

                    // Arrow screen-X tracks the hotspot; Y is clamped near the lower area,
                    // but never allowed to overlap the bottom navigation panel.
                    const minArrowY = h2 * ARROW_MIN_Y_RATIO;
                    let maxArrowY = h2 * ARROW_MAX_Y_RATIO;
                    const bottomPanel = document.getElementById('bottom-nav-panel');
                    if (bottomPanel) {
                        const panelRect = bottomPanel.getBoundingClientRect();
                        const mountRect = mount.getBoundingClientRect();
                        const panelTopInViewer = panelRect.top - mountRect.top;
                        if (Number.isFinite(panelTopInViewer)) {
                            // Keep a small visual gap above the panel.
                            maxArrowY = Math.min(maxArrowY, panelTopInViewer - ARROW_PANEL_GAP_PX);
                        }
                    }
                    if (maxArrowY < minArrowY) maxArrowY = minArrowY;
                    const desiredY = sy + ARROW_Y_OFFSET_PX;
                    const clampedY = Math.max(minArrowY, Math.min(maxArrowY, desiredY));

                    // Screen-space rotation: arrow X is always forced to hotspot X (sx),
                    // so only the vertical delta matters for the rotation angle.
                    const dx = 0;
                    const dy = sy - clampedY;
                    // Compute angle so the arrow tip (top of SVG) points toward the hotspot
                    const screenAngle = Math.atan2(dx, -dy) * (180 / Math.PI);

                    el.style.left    = `${sx.toFixed(1)}px`;
                    el.style.top     = `${clampedY.toFixed(1)}px`;
                    setArrowVisibility(el, true);
                    el.style.transform = `translate(-50%, -50%) rotate(${screenAngle.toFixed(1)}deg)`;

                    // Fade based on how far the hotspot is from screen center
                    const normX = Math.abs(_projVec.x);
                    const normY = Math.abs(_projVec.y);
                    const edgeFactor = Math.max(normX, normY);
                    const opacity = edgeFactor > 0.92 ? 0 : edgeFactor > 0.70
                        ? 1 - ((edgeFactor - 0.70) / 0.22)
                        : 1;
                    el.style.opacity = opacity.toFixed(3);
                }
            }
        };
        animate();

        // Expose minimal API for zoom/reset/orient controls in parent
        if (onReadyRef.current) onReadyRef.current({
            camera,
            renderer,
            scene,
            reset() {
                lon = defaultYaw;
                lat = defaultPitch;
                targetLon = defaultYaw;
                targetLat = defaultPitch;
                camera.fov = defaultFov;
                camera.updateProjectionMatrix();
            },
            panBy(dLon, dLat) {
                targetLon += dLon;
                targetLat = Math.max(-85, Math.min(85, targetLat + dLat));
            },
        });

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
            mount.removeEventListener('touchstart', onTouchStart);
            mount.removeEventListener('touchmove', onTouchMove);
            mount.removeEventListener('touchend', onPointerUp);
            renderer.dispose();
            const markerContainer = markersContainerRef.current;
            if (markerContainer) {
                Array.from(markerContainer.children).forEach((node) => {
                    gsap.killTweensOf(node);
                    if (node.__ringEl) gsap.killTweensOf(node.__ringEl);
                });
            }
            const arrowContainer = arrowsAnchorRef.current;
            if (arrowContainer) {
                Array.from(arrowContainer.children).forEach((node) => {
                    if (Array.isArray(node.__driftTweens)) {
                        node.__driftTweens.forEach((t) => t?.kill?.());
                    }
                    if (node.__btnEl) gsap.killTweensOf(node.__btnEl);
                });
            }
            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
        };
    }, [imageURL, initialView?.yaw, initialView?.pitch, initialView?.fov]); // re-initialise whenever room view defaults change

    return (
        <div
            ref={mountRef}
            className="absolute inset-0 w-full h-full"
            style={{ touchAction: 'none', cursor: 'grab' }}
        >
            {/* Panorama loading progress — overlays canvas until texture decodes */}
            {imageURL && !textureLoaded && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 5,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'radial-gradient(ellipse at center, rgba(30,27,75,0.97) 0%, rgba(15,15,26,0.99) 100%)',
                    pointerEvents: 'none',
                }}>
                    <div style={{ width: '180px', height: '3px', background: 'rgba(255,255,255,0.10)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${loadProgress}%`,
                            background: 'linear-gradient(90deg, rgb(108,99,255), rgb(168,162,255))',
                            borderRadius: '9999px',
                            transition: 'width 0.25s ease',
                        }} />
                    </div>
                    <p style={{
                        color: 'rgba(255,255,255,0.45)', fontSize: '11px',
                        marginTop: '12px', fontFamily: 'Montserrat, sans-serif',
                        letterSpacing: '0.04em',
                    }}>
                        {loadProgress < 100 ? `Loading… ${loadProgress}%` : 'Preparing view…'}
                    </p>
                </div>
            )}
            {/* Hotspot markers — created imperatively, positioned by projection in animate() */}
            <div
                ref={markersContainerRef}
                style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}
            />
            {/* Street-View arrows — full-overlay container; each arrow is independently positioned */}
            <div
                ref={arrowsAnchorRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 30,
                    pointerEvents: 'none',
                    overflow: 'hidden',
                }}
            />
        </div>
    );
}
