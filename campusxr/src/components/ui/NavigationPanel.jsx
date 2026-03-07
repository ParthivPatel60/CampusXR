import React from 'react';
import GlassPanel from './GlassPanel';

export default function NavigationPanel({
  onZoomIn, onZoomOut, onRefresh,
  onMoveLeft, onMoveRight, onMoveUp, onMoveDown,
  onFullscreenToggle,
}) {
  return (
    <div className="gsap-entrance absolute left-[4vw] md:left-10 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40">
      <GlassPanel className="p-3 md:p-4 flex flex-col gap-3 md:gap-4 items-center rounded-[50px] shadow-2xl">
        
        {/* Navigation / Move Controls Cross */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1 place-items-center mb-1">
          <div /> {/* Top Left */}
          <button onClick={onMoveUp} title="Tilt Up" className="w-8 h-8 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
          <div /> {/* Top Right */}

          <button onClick={onMoveLeft} title="Pan Left" className="w-8 h-8 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button onClick={onRefresh} title="Reset View" className="w-8 h-8 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button onClick={onMoveRight} title="Pan Right" className="w-8 h-8 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>

          <div /> {/* Bottom Left */}
          <button onClick={onMoveDown} title="Tilt Down" className="w-8 h-8 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div /> {/* Bottom Right */}
        </div>

        <div className="w-full h-px bg-white/10 my-1" />

        {/* Zoom Controls */}
        <button onClick={onZoomIn} title="Zoom In" className="w-10 h-10 md:w-12 md:h-12 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <button onClick={onZoomOut} title="Zoom Out" className="w-10 h-10 md:w-12 md:h-12 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
        </button>

        <div className="w-full h-px bg-white/10 my-1" />

        {/* Fullscreen Toggle */}
        <button onClick={onFullscreenToggle} title="Toggle Fullscreen" className="w-10 h-10 md:w-12 md:h-12 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
          </svg>
        </button>
      </GlassPanel>
    </div>
  );
}