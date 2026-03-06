import React from 'react';
import GlassPanel from './GlassPanel';

export default function BottomNavigation({ activeRoom, rooms, handleRoomSelect, activeDept }) {
  return (
    <>
      {/* ── BOTTOM LEFT: Room Title & Hierarchy ── */}
      <div className="gsap-entrance absolute bottom-[15vh] left-1/2 -translate-x-1/2 md:bottom-10 md:left-10 md:translate-x-0 z-40">
        <GlassPanel className="px-6 py-4 md:px-8 md:py-5 !rounded-[32px] !border-white/10 !bg-[#0B091A]/70 backdrop-blur-xl flex flex-col items-center justify-center shadow-[0_16px_40px_-8px_rgba(0,0,0,0.5)] md:mb-2 whitespace-nowrap min-w-[220px] md:min-w-[280px] w-auto max-w-[90vw] overflow-hidden text-center">
          <div className="flex items-center justify-center gap-2 mb-2 w-full overflow-hidden text-ellipsis">
            <span className="text-[#F59E0B] text-[9px] md:text-[10px] font-semibold tracking-[0.2em] uppercase shrink-0 opacity-90">Campus</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/30 shrink-0"><path d="m9 18 6-6-6-6"/></svg>
            <span className="text-[#A5B4FC] text-[9px] md:text-[10px] font-semibold tracking-[0.2em] uppercase truncate opacity-90">{activeDept || 'Department'}</span>
          </div>
          <span className="text-white text-[16px] md:text-[18px] font-bold tracking-tight w-full overflow-hidden text-ellipsis text-center drop-shadow-md">
            {activeRoom?.name || 'Loading Space...'}
          </span>
        </GlassPanel>
      </div>

      {/* ── BOTTOM CENTER: Room Images ── */}
      <div className="gsap-entrance absolute bottom-5 md:bottom-10 left-1/2 -translate-x-1/2 z-40 w-[95vw] md:w-auto max-w-[100vw]">
        <GlassPanel className="flex items-center p-3 md:p-4 gap-4 md:gap-5 !rounded-[32px] shadow-2xl md:mb-2 overflow-x-auto hidden-scrollbar whitespace-nowrap">
          {rooms.map(room => (
            <button
              key={room.name}
              onClick={() => handleRoomSelect(room)}
              className={`relative overflow-hidden w-32 h-20 md:w-40 md:h-24 shrink-0 rounded-[20px] border-2 transition-all cursor-pointer p-0 outline-none ${activeRoom?.name === room.name ? 'border-white opacity-100 scale-[1.03] shadow-[0_0_20px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-[1.02]'}`}
            >
              <img 
                src={room.imageURL || 'https://via.placeholder.com/150'} 
                alt={room.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-end justify-center pb-1.5 transition-colors group-hover:bg-black/20">
                <span className="text-white text-[10px] font-bold text-center leading-tight drop-shadow-md">
                  {room.name}
                </span>
              </div>
            </button>
          ))}
        </GlassPanel>
      </div>
    </>
  );
}