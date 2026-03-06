import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import GlassPanel from './GlassPanel';

export default function InfoSidePanel({ showInfoPanel, setShowInfoPanel, activeHotspot }) {
  const infoPanelRef = useRef(null);

  useGSAP(() => {
    let mm = gsap.matchMedia();

    mm.add("(max-width: 767px)", () => {
      // Mobile - Slide up
      if (showInfoPanel) {
        gsap.to(infoPanelRef.current, { 
          x: 0,
          y: 0,
          opacity: 1, 
          duration: 0.7, 
          ease: 'power4.out',
          pointerEvents: 'auto'
        });
      } else {
        gsap.to(infoPanelRef.current, { 
          x: 0,
          y: 60,
          opacity: 0, 
          duration: 0.4, 
          ease: 'power3.in',
          pointerEvents: 'none'
        });
      }
    });

    mm.add("(min-width: 768px)", () => {
      // Desktop - Slide in from right (more pronounced slide)
      if (showInfoPanel) {
        gsap.to(infoPanelRef.current, { 
          x: 0, 
          y: 0,
          opacity: 1, 
          duration: 0.8, 
          ease: 'power4.out',
          pointerEvents: 'auto'
        });
      } else {
        gsap.to(infoPanelRef.current, { 
          x: 100, // Move further right when hidden
          y: 0,
          opacity: 0, 
          duration: 0.4, 
          ease: 'power3.in',
          pointerEvents: 'none'
        });
      }
    });

    return () => mm.revert();
  }, [showInfoPanel]);

  return (
    <div 
      ref={infoPanelRef} 
      className="fixed bottom-[12vh] left-[5vw] md:absolute md:top-[80px] md:bottom-[24px] md:left-auto md:right-[20px] w-[90vw] md:w-[360px] max-h-[85vh] md:max-h-none opacity-0 z-50 flex flex-col pointer-events-none translate-y-[60px] md:translate-y-0 md:translate-x-[100px]"
    >
      <div 
        className="w-full h-full flex flex-col p-[24px] gap-4 border border-white/20 rounded-[39px] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.4)] pointer-events-auto"
        style={{
          background: 'linear-gradient(247.52deg, rgba(108, 99, 255, 0.17) 1.52%, rgba(255, 255, 255, 0) 96.99%)',
          backdropFilter: 'blur(25px)',
          boxShadow: 'rgba(255, 255, 255, 0.1) -2px -2px 100px inset, rgba(66, 66, 66, 0.1) 2px 2px 100px inset, rgba(0, 0, 0, 0.4) 0px 24px 64px'
        }}
      >
        <div className="flex items-center justify-between w-full shrink-0">
          <span className="text-[#a8a2ff] text-[10px] font-semibold uppercase tracking-[0.16em]">
            Point of Interest
          </span>
          <button 
            onClick={() => setShowInfoPanel(false)} 
            className="w-8 h-8 rounded-full bg-white/10 border-[1.5px] border-white/25 flex items-center justify-center text-white/65 hover:bg-white/20 hover:text-white transition-all duration-150 cursor-pointer outline-none shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        {activeHotspot?.image && (
          <img 
            src={activeHotspot.image} 
            alt={activeHotspot.text} 
            className="rounded-[20px] object-cover h-[180px] w-full border border-white/10 shadow-lg shrink-0 mt-1" 
          />
        )}

        <h2 className="text-white text-[24px] font-bold font-sans tracking-tight leading-[1.2] m-0 shrink-0 mt-1">
          {activeHotspot?.text || 'Information'}
        </h2>
        
        <div className="h-[1px] w-full bg-white/10 shrink-0 my-1" />
        
        <p className="text-white/70 text-[14px] leading-[1.65] font-normal overflow-y-auto w-full flex-1 overscroll-contain hidden-scrollbar m-0">
          {activeHotspot?.description || 'Click on a coloured marker in the panorama to explore this location and see detailed information about the room, equipment, and facilities.'}
        </p>
      </div>
    </div>
  );
}
