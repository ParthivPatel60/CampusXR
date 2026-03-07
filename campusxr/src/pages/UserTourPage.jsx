/**
 * UserTourPage.jsx
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * The main 360Â° viewer page for public users traversing the campus map.
 * Contains the primary layout, active departments, auto-tour playback logic,
 * and the overlay controls.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

import React, { useState, useEffect, useRef } from 'react';
import NavbarGlass from '../components/ui/NavbarGlass';
import BottomNavigation from '../components/ui/BottomNavigation';
import SideControls from '../components/ui/SideControls';
import NavigationPanel from '../components/ui/NavigationPanel';
import PanoramaViewer from '../components/viewer/PanoramaViewer';
import ViewerOverlay from '../components/layout/ViewerOverlay';
import HotspotMarker from '../components/ui/HotspotMarker';
import InfoSidePanel from '../components/ui/InfoSidePanel';
import TopControls from '../components/ui/TopControls';
import LocationLabel from '../components/ui/LocationLabel';
import TourControlPanel from '../components/ui/TourControlPanel';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getTourSequence } from '../services/firestoreService';

function UserTourPage() {
    const [departments, setDepartments] = useState([]);
    const [activeDeptId, setActiveDeptId] = useState('all');
    const [rooms, setRooms] = useState([]);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [panoCache, setPanoCache] = useState({});
    
    // Core ThreeJS context loaded once the Viewer mounts
    const viewerContextRef = useRef(null);

    // UI state
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Tour mode state
    const [isTourPlaying, setIsTourPlaying] = useState(false);
    const [tourSpeed, setTourSpeed] = useState(5);
    const [tourIndex, setTourIndex] = useState(0);
    const [tourSequence, setTourSequence] = useState([]);
    const [tourRooms, setTourRooms] = useState([]);

    // We store the current room in a ref so setTimeouts inside playTour can read it without stalling.
    const currentRoomRef = useRef(null);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // 1. Fetch departments
                const deptsSnap = await getDocs(collection(db, 'departments'));
                const deptsData = deptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Add standard "All Departments" option
                deptsData.unshift({
                    id: 'all',
                    name: 'All Departments',
                    icon: 'BuildingOffice',
                    color: 'text-blue-500'
                });
                
                // Sort the rest alphabetically just to be clean
                const sortedDepts = [deptsData[0], ...deptsData.slice(1).sort((a,b) => a.name.localeCompare(b.name))];
                setDepartments(sortedDepts);

                // 2. Fetch ALL rooms from each department's subcollection
                const realDepts = deptsData.filter(d => d.id !== 'all');
                const roomsByDept = await Promise.all(
                    realDepts.map(async d => {
                        const snap = await getDocs(collection(db, 'departments', d.id, 'rooms'));
                        return snap.docs.map(doc => ({ id: doc.id, departmentId: d.id, ...doc.data() }));
                    })
                );
                const allRooms = roomsByDept.flat();
                setRooms(allRooms);
                
                // Only set active room to first if we aren't loading a tour
                if (allRooms.length > 0 && activeDeptId !== 'all') {
                    setActiveRoomId(allRooms[0].id);
                }

                // 3. Setup Tour Sequence ("All Departments" special logic)
                const savedSequence = await getTourSequence();
                if (savedSequence && savedSequence.length > 0) {
                    setTourSequence(savedSequence);
                    
                    // Rebuild the ordered room objects from the sequence items
                    const orderedRooms = savedSequence
                        .map(item => {
                            // Items from our firestoreService have { roomId, deptId, roomName, imageURL }
                            const found = allRooms.find(r => r.id === (item.roomId || item));
                            if (found) return found;
                            // Fallback: reconstruct from denormalized item
                            if (item.roomId) return { id: item.roomId, name: item.roomName, imageURL: item.imageURL, departmentId: item.deptId };
                            return null;
                        })
                        .filter(Boolean);
                    setTourRooms(orderedRooms);
                    
                    if (activeDeptId === 'all' && orderedRooms.length > 0) {
                        setActiveRoomId(orderedRooms[0].id);
                    }
                } else {
                    // Fallback to arbitrary room order if no saved sequence exists
                    setTourSequence(allRooms.map(r => r.id));
                    setTourRooms(allRooms);
                    if (activeDeptId === 'all' && allRooms.length > 0) {
                        setActiveRoomId(allRooms[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to load initial data:", err);
            }
        };
        fetchInitialData();
    }, []);

    const activeDept = departments.find(d => d.id === activeDeptId);
    
    // Dynamic filtering for bottom rail
    const filteredRooms = activeDeptId === 'all' 
        ? tourRooms // Show ordered sequence for 'All Categories'
        : rooms.filter(r => r.departmentId === activeDeptId);

    const activeRoom = activeRoomId ? rooms.find(r => r.id === activeRoomId) : null;
    useEffect(() => { currentRoomRef.current = activeRoom; }, [activeRoom]);

    // Prefetch surrounding panoramas
    useEffect(() => {
        if (!activeRoom || filteredRooms.length === 0) return;

        const idx = filteredRooms.findIndex(r => r.id === activeRoom.id);
        if (idx === -1) return;

        const toLoad = [];
        if (idx > 0) toLoad.push(filteredRooms[idx - 1]);
        if (idx < filteredRooms.length - 1) toLoad.push(filteredRooms[idx + 1]);

        toLoad.forEach(room => {
            if (room.imageURL && !panoCache[room.id]) {
                const img = new Image();
                img.src = room.imageURL;
                setPanoCache(prev => ({ ...prev, [room.id]: true }));
            }
        });
    }, [activeRoomId, filteredRooms, panoCache]);
    
    // Listen for Escape key to reset fullscreen state
    useEffect(() => {
        const onFullscreenChange = () => {
             setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // â”€â”€ Tour Playback Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        let timeoutId;
        
        const playNextRoom = () => {
            if (!isTourPlaying || tourRooms.length === 0) return;
            
            setTourIndex(prevIndex => {
                const nextIndex = (prevIndex + 1) % tourRooms.length;
                setActiveRoomId(tourRooms[nextIndex].id);
                return nextIndex;
            });
        };

        if (isTourPlaying) {
            const timeoutDuration = tourSpeed * 1000;
            timeoutId = setTimeout(playNextRoom, timeoutDuration);
        }

        return () => clearTimeout(timeoutId);
    }, [isTourPlaying, activeRoomId, tourRooms, tourSpeed]);
    
    // Force sync the tourIndex if user manually clicks a room while viewing "All Departments"
    useEffect(() => {
        if (activeDeptId === 'all' && activeRoomId) {
            const index = tourRooms.findIndex(r => r.id === activeRoomId);
            if (index !== -1 && index !== tourIndex) {
                 setTourIndex(index);
            }
        }
    }, [activeRoomId, activeDeptId, tourRooms]);

    // Handlers
    const handleDeptChange = (deptId) => {
        setActiveDeptId(deptId);
        setIsTourPlaying(false); // Stop tour if switching modes

        if (deptId === 'all') {
             // Fall back to tour sequence
             if (tourRooms.length > 0) setActiveRoomId(tourRooms[0].id);
        } else {
             const deptRooms = rooms.filter(r => r.departmentId === deptId);
             if (deptRooms.length > 0) setActiveRoomId(deptRooms[0].id);
        }
    };

    const handleRoomSelect = (roomId) => {
        setActiveRoomId(roomId);
        // Do not explicitly kill the tour unless you want explicit intervention to stop it.
    };

    const handleHotspotClick = async (clickedHs) => {
         // Pause the auto-tour if they click a hotspot
         setIsTourPlaying(false); 
         
         if (clickedHs.type === 'navigation' && clickedHs.targetRoomId) {
             setActiveRoomId(clickedHs.targetRoomId);
         } else if (clickedHs.type === 'info') {
             setIsInfoOpen(true);
         }
    };
    
    // Pauses the tour if the user starts dragging manually
    const handlePointerDown = () => {
         if (isTourPlaying) setIsTourPlaying(false);
    };

    // Auto-Tour Button Action
    const handleGuideClick = () => {
        if (!isTourPlaying) {
             // If we're not currently in "All Departments", switch contexts first to load the path 
             if (activeDeptId !== 'all') {
                  setActiveDeptId('all');
                  if (tourRooms.length > 0) setActiveRoomId(tourRooms[0].id);
             }
             setIsTourPlaying(true);
        } else {
             setIsTourPlaying(false);
        }
    };

    // â”€â”€ Navigation Extensibility Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleZoomIn = () => {
        if (!viewerContextRef.current?.camera) return;
        const cam = viewerContextRef.current.camera;
        cam.fov = Math.max(30, cam.fov - 15);
        cam.updateProjectionMatrix();
    };

    const handleZoomOut = () => {
        if (!viewerContextRef.current?.camera) return;
        const cam = viewerContextRef.current.camera;
        cam.fov = Math.min(100, cam.fov + 15);
        cam.updateProjectionMatrix();
    };
    
    const handleMoveLeft = () => {
        if (!viewerContextRef.current?.ctrl) return;
        viewerContextRef.current.ctrl.targetLon += 25;
    };
    
    const handleMoveRight = () => {
        if (!viewerContextRef.current?.ctrl) return;
        viewerContextRef.current.ctrl.targetLon -= 25;
    };

    const handleMoveUp = () => {
        if (!viewerContextRef.current?.ctrl) return;
        viewerContextRef.current.ctrl.targetLat += 25;
        viewerContextRef.current.ctrl.targetLat = Math.max(-85, Math.min(85, viewerContextRef.current.ctrl.targetLat));
    };
    
    const handleMoveDown = () => {
        if (!viewerContextRef.current?.ctrl) return;
        viewerContextRef.current.ctrl.targetLat -= 25;
        viewerContextRef.current.ctrl.targetLat = Math.max(-85, Math.min(85, viewerContextRef.current.ctrl.targetLat));
    };

    const handleRefresh = () => {
        if (!viewerContextRef.current?.camera || !viewerContextRef.current?.ctrl) return;
        
        // Reset rotation
        viewerContextRef.current.ctrl.targetLon = 0;
        viewerContextRef.current.ctrl.targetLat = 0;

        // Reset FOV
        const cam = viewerContextRef.current.camera;
        cam.fov = 75;
        cam.updateProjectionMatrix();
    };
    
    const handleFullscreenToggle = () => {
         if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch((err) => {
                   console.error(`Error attempting to enable full-screen mode: ${err.message}`);
              });
         } else {
              if (document.exitFullscreen) {
                   document.exitFullscreen();
              }
         }
    };


    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black text-white selection:bg-white/20">

            {/* Navigation Overlay Header */}
            <div className="absolute top-0 left-0 right-0 z-40 p-6 pointer-events-none layout-hardware-accel">
                <NavbarGlass 
                     departments={departments}
                     activeDeptId={activeDeptId}
                     onDeptChange={handleDeptChange}
                />
            </div>
            
            {/* Top Right Controls (Guide, Fullscreen etc) */}
            <div className="absolute top-8 right-6 z-40">
                <TopControls 
                    onGuideClick={handleGuideClick}
                    isGuideOpen={isTourPlaying || activeDeptId === 'all'}
                />
            </div>

            {/* Main Interactive Viewer Context */}
            <div className="absolute inset-0 z-0 bg-neutral-900" onPointerDown={handlePointerDown}>
                {activeRoom?.imageURL ? (
                    <PanoramaViewer 
                        key={activeRoom.id}
                        imageURL={activeRoom.imageURL}
                        hotspots={activeRoom.hotspots || []}
                        onHotspotClick={handleHotspotClick}
                        onReady={(ctx) => viewerContextRef.current = ctx}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40 font-medium">
                        Loading panorama...
                    </div>
                )}
            </div>

            {/* Viewer Scrims & Borders Overlay */}
            <ViewerOverlay 
                isNavOpen={isNavOpen} 
                isInfoOpen={isInfoOpen} 
            />

            {/* Room Location Label */}
            <LocationLabel 
                roomName={activeRoom?.name || 'Loading...'}
                deptName={activeDept?.name || ''}
            />

            {/* Speed & Autoplay Control Panel (only visible when in Tour mode) */}
            {activeDeptId === 'all' && (
                <TourControlPanel 
                    isTourPlaying={isTourPlaying}
                    tourIndex={tourIndex}
                    tourRooms={tourRooms}
                    tourSpeed={tourSpeed}
                    setTourSpeed={setTourSpeed}
                />
            )}

            {/* Left Drawer Controls */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4 pointer-events-none">
                <SideControls 
                    onInfoToggle={() => setIsInfoOpen(!isInfoOpen)}
                    onNavToggle={() => setIsNavOpen(!isNavOpen)}
                    isInfoOpen={isInfoOpen}
                    isNavOpen={isNavOpen}
                />
            </div>

            {/* Pop-out Navigation Controller (Zoom / Move / Fullscreen) */}
            <NavigationPanel 
                isOpen={isNavOpen}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onRefresh={handleRefresh}
                onMoveLeft={handleMoveLeft}
                onMoveRight={handleMoveRight}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onFullscreenToggle={handleFullscreenToggle}
                isFullscreen={isFullscreen}
            />

            {/* Right Information Frame */}
            <InfoSidePanel 
                isOpen={isInfoOpen}
                onClose={() => setIsInfoOpen(false)}
                activeRoom={activeRoom}
            />

            {/* Bottom Rooms Carousel */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-6xl px-6 z-40 pointer-events-none">
                <BottomNavigation 
                    rooms={filteredRooms}
                    activeRoomId={activeRoomId}
                    onRoomSelect={handleRoomSelect}
                />
            </div>
            
        </div>
    );
}

export default UserTourPage;
