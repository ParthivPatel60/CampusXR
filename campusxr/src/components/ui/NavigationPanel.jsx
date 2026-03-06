import React from 'react';
import GlassPanel from './GlassPanel';

export default function NavigationPanel({ onZoomIn, onZoomOut, onRefresh, setShowInfoPanel }) {
  return (
    <div className="gsap-entrance absolute left-[4vw] md:left-10 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40">
      <GlassPanel className="p-3 md:p-4 flex flex-col gap-4 md:gap-6 items-center rounded-[50px] shadow-2xl">
        <button onClick={onZoomIn} className="w-12 h-12 md:w-14 md:h-14 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <button onClick={onZoomOut} className="w-12 h-12 md:w-14 md:h-14 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
        </button>
        <button onClick={onRefresh} className="w-12 h-12 md:w-14 md:h-14 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button onClick={() => setShowInfoPanel(prev => !prev)} className="w-12 h-12 md:w-14 md:h-14 rounded-full flex justify-center items-center bg-white/5 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer outline-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </button>
      </GlassPanel>
    </div>
  );
}