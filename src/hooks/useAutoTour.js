/**
 * useAutoTour.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Auto Virtual Tour Engine hook.
 *
 * Responsibilities:
 *   • Fetch rooms for a dept via getRoomsSorted (orderBy sortOrder)
 *   • Cycle through rooms automatically every TOUR_INTERVAL ms
 *   • Preload the next room's image before transitioning
 *   • Stop at the last room (no infinite loop)
 *   • Expose start / stop / progress to the consuming component
 *
 * Usage:
 *   const { rooms, activeRoom, activeIndex, isRunning, progress, start, stop } = useAutoTour();
 *
 * Call start(deptId) to begin the tour.
 * Call stop() to end the tour at any time.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { getRoomsSorted, getAllRoomsSorted } from '../services/firestoreService';

const TOUR_INTERVAL = 25_000; // 25 seconds per room

export default function useAutoTour() {
    const [rooms, setRooms] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const intervalRef = useRef(null);
    const roomsRef = useRef([]);       // always-current copy for use inside setInterval closure
    const indexRef = useRef(0);

    // Keep refs in sync
    useEffect(() => { roomsRef.current = rooms; }, [rooms]);
    useEffect(() => { indexRef.current = activeIndex; }, [activeIndex]);

    // ── Preload a panorama image ────────────────────────────────────────────────
    const preloadImage = useCallback((url) => {
        if (!url) return;
        const img = new Image();
        img.src = url;
    }, []);

    // ── Clear the interval safely ───────────────────────────────────────────────
    const clearTourInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // ── Stop tour ───────────────────────────────────────────────────────────────
    const stop = useCallback(() => {
        clearTourInterval();
        setIsRunning(false);
    }, [clearTourInterval]);

    // ── Start tour for a given department ──────────────────────────────────────
    const start = useCallback(async (deptId) => {
        if (!deptId) return;

        clearTourInterval();
        setIsLoading(true);

        try {
            const fetchedRooms = await getRoomsSorted(deptId);
            if (!fetchedRooms || fetchedRooms.length === 0) {
                setIsLoading(false);
                return;
            }

            setRooms(fetchedRooms);
            setActiveIndex(0);
            setIsRunning(true);
            setIsLoading(false);

            // Preload room[1] immediately
            if (fetchedRooms[1]?.imageURL) preloadImage(fetchedRooms[1].imageURL);

            // Start the tour interval
            intervalRef.current = setInterval(() => {
                setActiveIndex((prev) => {
                    const next = prev + 1;
                    const allRooms = roomsRef.current;

                    // Stop at the last room
                    if (next >= allRooms.length) {
                        clearTourInterval();
                        setIsRunning(false);
                        return prev; // stay on last room
                    }

                    // Preload the room after next
                    if (allRooms[next + 1]?.imageURL) {
                        preloadImage(allRooms[next + 1].imageURL);
                    }

                    return next;
                });
            }, TOUR_INTERVAL);

        } catch (err) {
            console.error('[useAutoTour] Failed to fetch rooms:', err);
            setIsLoading(false);
        }
    }, [clearTourInterval, preloadImage]);

    // ── Start campus-wide tour (all departments × all rooms) ───────────────────
    const startCampus = useCallback(async () => {
        clearTourInterval();
        setIsLoading(true);

        try {
            const fetchedRooms = await getAllRoomsSorted();
            if (!fetchedRooms || fetchedRooms.length === 0) {
                setIsLoading(false);
                return;
            }

            setRooms(fetchedRooms);
            setActiveIndex(0);
            setIsRunning(true);
            setIsLoading(false);

            // Preload room[1] immediately
            if (fetchedRooms[1]?.imageURL) preloadImage(fetchedRooms[1].imageURL);

            intervalRef.current = setInterval(() => {
                setActiveIndex((prev) => {
                    const next = prev + 1;
                    const allRooms = roomsRef.current;

                    if (next >= allRooms.length) {
                        clearTourInterval();
                        setIsRunning(false);
                        return prev;
                    }

                    if (allRooms[next + 1]?.imageURL) {
                        preloadImage(allRooms[next + 1].imageURL);
                    }

                    return next;
                });
            }, TOUR_INTERVAL);

        } catch (err) {
            console.error('[useAutoTour] Campus fetch failed:', err);
            setIsLoading(false);
        }
    }, [clearTourInterval, preloadImage]);

    // ── Cleanup on unmount ──────────────────────────────────────────────────────
    useEffect(() => {
        return () => clearTourInterval();
    }, [clearTourInterval]);

    // ── Derived values ──────────────────────────────────────────────────────────
    const activeRoom = rooms[activeIndex] ?? null;
    const progress = rooms.length > 1 ? activeIndex / (rooms.length - 1) : 0;

    return {
        rooms,
        activeRoom,
        activeIndex,
        isRunning,
        isLoading,
        progress,         // 0 → 1, for the progress bar
        start,
        startCampus,
        stop,
    };
}
