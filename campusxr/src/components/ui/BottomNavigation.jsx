import React, { useRef, useEffect } from 'react';
import GlassPanel from './GlassPanel';

export default function BottomNavigation({ activeRoom, rooms, handleRoomSelect, activeDept }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (activeRoom && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(`[data-room-id="${activeRoom.id}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeRoom]);

  if (!rooms || rooms.length === 0) return null;

  return (
    <div className="gsap-entrance absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-max max-w-[95vw] md:max-w-4xl pointer-events-auto">
      <GlassPanel className="p-[10px] !rounded-[24px] !border-white/10 !bg-[#1E1A35]/40 backdrop-blur-[12px] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] inline-flex flex-col items-center w-full">

        <div className="flex items-center justify-center gap-1.5 mb-2.5 w-full pointer-events-none">
          <span className="text-[#F59E0B] text-[10px] font-bold tracking-[0.2em] uppercase shrink-0">Campus</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/30 shrink-0"><path d="m9 18 6-6-6-6"/></svg>
          <span className="text-[#A5B4FC] text-[10px] font-bold tracking-[0.2em] uppercase truncate">{activeDept || 'Department'}</span>
        </div>

        <div
          ref={scrollRef}
          className="flex items-center gap-[10px] overflow-x-auto scrollbar-hide snap-x p-[2px] w-full mask-edges pointer-events-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {rooms.map((room) => {
            const isActive = activeRoom?.id === room.id;
            return (
              <button
                key={room.id}
                data-room-id={room.id}
                onClick={() => handleRoomSelect(room)}
                className={`snap-center shrink-0 group relative overflow-hidden rounded-xl transition-all duration-300 ${
                  isActive ? 'ring-2 ring-[#A5B4FC] ring-offset-2 ring-offset-[#0B091A] scale-100 opacity-100' : 'scale-95 opacity-60 hover:opacity-100 hover:scale-100'
                }`}
                style={{ width: '110px', height: '75px' }}
              >
                {room.imageURL ? (
                  <img src={room.imageURL} alt={room.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-900 to-slate-800" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                <div className="absolute bottom-1.5 left-0 right-0 px-2 text-center">
                  <span className="text-white text-[10px] font-semibold tracking-wide drop-shadow-md truncate block">
                    {room.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </GlassPanel>
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .mask-edges {
          -webkit-mask-image: linear-gradient(to right, transparent, black 1%, black 99%, transparent);
          mask-image: linear-gradient(to right, transparent, black 1%, black 99%, transparent);
        }
      `}}/>
    </div>
  );
}
