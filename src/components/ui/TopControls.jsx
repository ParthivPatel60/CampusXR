import React, { useState, useCallback, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import GlassPanel from './GlassPanel';
import fullLogo from '../../assets/fulllogo.png';

export default function TopControls({ 
  searchQuery, setSearchQuery, filteredRooms, handleRoomSelect, activeRoom,
  activeDept, departments = [], handleDeptChange, 
  is3DMode, setIs3DMode,
  onGuideClick, isGuideOpen,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleRef = useRef(null);

  useGSAP(() => {
    if (toggleRef.current) {
      gsap.to(toggleRef.current, {
        scale: 1.05,
        boxShadow: '0 0 25px rgba(245,158,11,0.6)',
        borderColor: 'rgba(251,191,36,0.9)',
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  }, []);

  return (
    <>
      {/* ── TOP LEFT ── */}
      <div className="absolute top-[2vh] left-[4vw] md:top-10 md:left-10 flex flex-col gap-3 md:gap-4 items-start z-40 w-[85vw] max-w-[250px]">
        {/* Logo */}
        <div className="gsap-entrance pointer-events-auto w-full">
          <GlassPanel className="px-4 py-2 md:px-6 rounded-[28px] md:rounded-[36px] shadow-xl flex items-center justify-center w-full bg-white/20 backdrop-blur-md">
            <img src={fullLogo} alt="SCET Logo" className="h-[60px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
          </GlassPanel>
        </div>

        {/* Search & Dept Filter Container */}
        <div className="flex flex-col gap-3 w-full gsap-entrance">
          <GlassPanel className="flex items-center gap-3 px-4 h-[30px] rounded-[32px] md:rounded-[40px] w-full transition-all focus-within:bg-white/10 focus-within:border-white/40 shadow-xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50 shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              placeholder="Live Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-[14px] md:text-[16px] font-medium w-full placeholder-white/50 font-sans h-full"
            />
          </GlassPanel>

          <GlassPanel className="relative flex items-center justify-center px-4 h-[30px] rounded-[32px] md:rounded-[40px] gap-2 hover:bg-white/10 transition-colors w-full shadow-xl">
            <span className="text-white text-[14px] md:text-[16px] font-medium font-sans truncate">{activeDept}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60 shrink-0 pointer-events-none">
              <path d="m6 9 6 6 6-6"/>
            </svg>
            <select
              value={activeDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {departments.map(d => (
                <option key={d.id} value={d.name} className="bg-gray-900 text-white truncate">{d.name}</option>
              ))}
            </select>
          </GlassPanel>
        </div>

        {/* Live Search Results Dropdown */}
        {searchQuery && filteredRooms.length > 0 && (
          <div className="gsap-entrance pointer-events-auto w-full">
            <GlassPanel className="flex flex-col gap-1 p-4 rounded-[28px] md:rounded-[36px] !bg-[#0E0A2C]/90 shadow-[0_16px_48px_rgba(0,0,0,0.50)] border-white/20 max-h-[40vh] overflow-y-auto hidden-scrollbar w-full">
              {filteredRooms.map(room => (
                <button
                  key={room.name}
                  onClick={() => { handleRoomSelect(room); setSearchQuery(''); }}
                  className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[14px] font-medium transition-colors ${activeRoom?.name === room.name ? 'bg-[rgba(108,99,255,0.30)] text-white' : 'text-white/70 hover:bg-white/10'} text-left cursor-pointer border-none outline-none`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${activeRoom?.name === room.name ? 'bg-[#a5b4fc]' : 'bg-white/30'} shrink-0`} />
                  {room.name}
                </button>
              ))}
            </GlassPanel>
          </div>
        )}
      </div>

      {/* ── TOP RIGHT ── */}
      <div className="absolute top-[2vh] right-[4vw] md:top-10 md:right-10 flex flex-col gap-4 md:gap-6 items-end z-40">
        <div className="flex flex-col md:flex-row items-end md:items-center gap-3 md:gap-4 gsap-entrance mr-2 md:mt-2 scale-90 md:scale-100 origin-top-right">
          <GlassPanel className="flex items-center justify-center px-5 h-[30px] rounded-[50px] shadow-xl">
            <button onClick={handleFullscreen} className="hidden md:block text-[14px] md:text-[15px] font-semibold text-white/80 hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none">Fullscreen</button>
          </GlassPanel>
          <GlassPanel className="flex items-center justify-center px-5 h-[30px] rounded-[50px] shadow-xl">
            <button onClick={onGuideClick} className={`text-[14px] md:text-[15px] font-semibold transition-colors cursor-pointer bg-transparent border-none outline-none ${isGuideOpen ? 'text-[#A5B4FC]' : 'text-white/80 hover:text-white'}`}>Guide</button>
          </GlassPanel>
          <GlassPanel className="flex items-center justify-center px-5 h-[30px] rounded-[50px] shadow-xl">
            <button onClick={() => window.location.href = '/admin'} className="text-[14px] md:text-[15px] font-semibold text-white/80 hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none">Admin</button>
          </GlassPanel>
        </div>

        <div className="gsap-entrance pointer-events-auto mr-2 scale-90 md:scale-100 origin-top-right">
          <button
            ref={toggleRef}
            onClick={() => setIs3DMode(!is3DMode)}
            title="Next-gen neural rendering demo"
            className={`cursor-pointer flex items-center justify-center gap-1.5 md:gap-2 px-3 h-[30px] min-w-[75px] w-fit rounded-[50px] transition-colors glass shadow-xl ${is3DMode ? 'border-2 border-[#F59E0B] bg-[#F59E0B]/20' : 'border border-white/20'}`}
          >
            <span className="text-[#F59E0B] border border-[#F59E0B] bg-[#F59E0B]/20 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.1em] uppercase shadow-[0_0_12px_rgba(245,158,11,0.5)]">Beta</span>
            <span className={`text-[12px] md:text-[13px] font-bold tracking-wide whitespace-nowrap ${is3DMode ? 'text-[#fde68a]' : 'text-white'}`}>3D Mode</span>
          </button>
        </div>
      </div>
    </>
  );
}
