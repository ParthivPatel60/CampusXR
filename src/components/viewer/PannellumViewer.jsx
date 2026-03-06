/**
 * PannellumViewer.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Pannellum-based equirectangular 360° panorama viewer used during Auto Tour.
 *
 * Features:
 *   • Dynamically loads Pannellum CSS + JS from CDN (once, cached in window)
 *   • Guided cinematic rotation → 5 waypoints × 4s each
 *   • After sweep: continuous slow auto-rotate via startAutoRotate(-2)
 *   • Destroys and re-initialises viewer when imageURL changes
 *
 * Props:
 *   imageURL       — Cloudinary secure_url string
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";

// ── CDN URLs ──────────────────────────────────────────────────────────────────
const PANNELLUM_CSS = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
const PANNELLUM_JS = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";

// ── Load Pannellum from CDN (idempotent) ──────────────────────────────────────
function loadPannellum() {
    return new Promise((resolve, reject) => {
        if (window.pannellum) { resolve(); return; }

        if (!document.getElementById("pannellum-css")) {
            const link = document.createElement("link");
            link.id = "pannellum-css";
            link.rel = "stylesheet";
            link.href = PANNELLUM_CSS;
            document.head.appendChild(link);
        }

        if (!document.getElementById("pannellum-js")) {
            const script = document.createElement("script");
            script.id = "pannellum-js";
            script.src = PANNELLUM_JS;
            script.onload = resolve;
            script.onerror = () => reject(new Error("Failed to load Pannellum"));
            document.head.appendChild(script);
        } else {
            // Script tag exists — wait for it
            const existing = document.getElementById("pannellum-js");
            existing.addEventListener("load", resolve);
            existing.addEventListener("error", reject);
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PanoramaViewer({ imageURL }) {

    const viewerRef = useRef(null);
    const viewer = useRef(null);

    useEffect(() => {
        if (!viewerRef.current || !imageURL) return;

        let cancelled = false;

        loadPannellum().then(() => {
            if (cancelled || !viewerRef.current) return;

            // Destroy previous instance
            if (viewer.current) {
                try { viewer.current.destroy(); } catch (_) { }
                viewer.current = null;
            }

            viewer.current = window.pannellum.viewer(viewerRef.current, {
                type: "equirectangular",
                panorama: imageURL,
                autoLoad: true,
                showControls: false,
                pitch: 0,
                yaw: 0,
                hfov: 100,
            });

            viewer.current.on("load", () => {
                if (!cancelled) startGuidedRotation();
            });
        }).catch((err) => {
            console.error("[PanoramaViewer] CDN load failed:", err);
        });

        return () => {
            cancelled = true;
            if (viewer.current) {
                try { viewer.current.destroy(); } catch (_) { }
                viewer.current = null;
            }
        };
    }, [imageURL]);


    const startGuidedRotation = () => {
        if (!viewer.current) return;

        let step = 0;

        const cameraPath = [
            { yaw: -120, duration: 4000 },
            { yaw: -60, duration: 4000 },
            { yaw: 0, duration: 4000 },
            { yaw: 60, duration: 4000 },
            { yaw: 120, duration: 4000 },
        ];

        const runStep = () => {
            if (!viewer.current) return;

            if (step >= cameraPath.length) {
                viewer.current.startAutoRotate(-2);
                return;
            }

            const s = cameraPath[step];

            viewer.current.lookAt(
                0,        // pitch
                s.yaw,    // yaw
                100,      // hfov
                s.duration,
            );

            step++;

            setTimeout(runStep, s.duration + 500);
        };

        runStep();
    };


    return (
        <div
            ref={viewerRef}
            style={{ width: "100%", height: "100%" }}
        />
    );
}
