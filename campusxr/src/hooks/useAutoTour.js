/**
 * useAutoTour.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom hook that manages the Auto Tour: cycles through ALL rooms across ALL
 * departments in sortOrder sequence, calling onNavigate for each stop.
 *
 * Usage in UserTourPage:
 *   const { isTourRunning, startTour, stopTour } = useAutoTour({
 *     departments,                    // Array of dept objects from Firestore
 *     getRoomsForDept,                // async (deptId) => Room[]
 *     onNavigate,                     // (dept, room) => void
 *     tourDwellMs: 6000,              // ms to show each room. Default: 6000
 *   });
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Dwell = exact time for one full 360° at TOUR_SPEED (0.085 deg/frame @ 60 fps) + 1.5 s pause
// 360 ÷ (0.085 × 60) = 70.6 s → 70 588 ms + 1500 = ~72 100 ms
const FULL_ROTATION_MS = Math.round((360 / (0.085 * 60)) * 1000) + 1500;

export function useAutoTour({
    departments = [],
    getRoomsForDept,
    onNavigate,
    tourDwellMs = FULL_ROTATION_MS,
}) {
    const [isTourRunning, setIsTourRunning] = useState(false);

    const timerRef = useRef(null);
    const indexRef = useRef(0);      // position in the flat stop list
    const stopsRef = useRef([]);     // flat array: [{dept, room}]
    const runningRef = useRef(false);  // sync ref mirrors state (for closures)

    // ── Build a flat, sorted list of all rooms across all depts ──────────────
    const buildStops = useCallback(async () => {
        const stops = [];
        for (const dept of departments) {
            const rooms = await getRoomsForDept(dept.id);
            const sorted = [...rooms].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            sorted.forEach((room) => stops.push({ dept, room }));
        }
        stopsRef.current = stops;
        return stops;
    }, [departments, getRoomsForDept]);

    // ── Navigate to current stop then schedule the next ───────────────────────
    const goToStop = useCallback((stops, index) => {
        if (!runningRef.current || stops.length === 0) return;

        const stop = stops[index % stops.length];
        onNavigate(stop.dept, stop.room);

        timerRef.current = setTimeout(() => {
            if (!runningRef.current) return;
            indexRef.current = (index + 1) % stops.length;
            goToStop(stops, indexRef.current);
        }, tourDwellMs);
    }, [onNavigate, tourDwellMs]);

    // ── Public: start ─────────────────────────────────────────────────────────
    const startTour = useCallback(async () => {
        if (runningRef.current) return;
        runningRef.current = true;
        setIsTourRunning(true);
        indexRef.current = 0;

        const stops = stopsRef.current.length > 0
            ? stopsRef.current
            : await buildStops();

        if (stops.length === 0) {
            runningRef.current = false;
            setIsTourRunning(false);
            return;
        }
        goToStop(stops, 0);
    }, [buildStops, goToStop]);

    // ── Public: stop ──────────────────────────────────────────────────────────
    const stopTour = useCallback(() => {
        runningRef.current = false;
        setIsTourRunning(false);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => () => stopTour(), [stopTour]);

    // ── Pre-build stops whenever departments list changes ─────────────────────
    useEffect(() => {
        if (departments.length > 0) buildStops();
    }, [departments, buildStops]);

    return { isTourRunning, startTour, stopTour };
}
