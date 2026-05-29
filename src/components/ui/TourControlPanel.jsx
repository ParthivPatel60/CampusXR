import React, { useState } from 'react';

export default function TourControlPanel({
  isTourPlaying,
  tourIndex,
  tourRooms,
  tourSpeed,
  setTourSpeed,
}) {
  const [expanded, setExpanded] = useState(false);
  const total = tourRooms.length;
  const progress = total > 0 ? ((tourIndex + 1) / total) * 100 : 0;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - progress / 100);

  const glassBg = 'rgba(11, 9, 26, 0.72)';
  const glassBlur = 'blur(20px)';

  return (
    <div
      className="absolute bottom-6 right-6 z-50 pointer-events-auto flex flex-col items-end"
      style={{ gap: '8px' }}
    >
      {/* Speed popout */}
      {expanded && (
        <div style={{
          background: glassBg,
          backdropFilter: glassBlur,
          WebkitBackdropFilter: glassBlur,
          border: '1.5px solid rgba(255,255,255,0.12)',
          borderRadius: '14px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Speed
          </span>
          <input
            type="range"
            min="1"
            max="15"
            step="1"
            value={tourSpeed}
            onChange={e => setTourSpeed(Number(e.target.value))}
            style={{ width: '110px', accentColor: '#A5B4FC', cursor: 'pointer', height: '3px' }}
          />
          <span style={{ color: 'rgba(165,180,252,0.9)', fontSize: '11px', fontWeight: 700, minWidth: '22px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {tourSpeed}s
          </span>
        </div>
      )}

      {/* Circular speed / progress button */}
      <button
        onClick={() => setExpanded(v => !v)}
        title={expanded ? 'Close speed control' : 'Adjust speed'}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: glassBg,
          backdropFilter: glassBlur,
          WebkitBackdropFilter: glassBlur,
          border: '1.5px solid rgba(255,255,255,0.12)',
          boxShadow: isTourPlaying
            ? '0 0 16px rgba(165,180,252,0.30), 0 6px 20px rgba(0,0,0,0.55)'
            : '0 6px 20px rgba(0,0,0,0.55)',
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: 0,
          transition: 'box-shadow 0.4s ease',
        }}
      >
        {/* Progress ring */}
        <svg
          width="52"
          height="52"
          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', pointerEvents: 'none' }}
        >
          <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
          <circle
            cx="26"
            cy="26"
            r={r}
            fill="none"
            stroke={isTourPlaying ? '#A5B4FC' : 'rgba(165,180,252,0.28)'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
          />
        </svg>

        {/* Speed label */}
        <span style={{
          color: isTourPlaying ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.42)',
          fontSize: '11px',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          position: 'relative',
          zIndex: 1,
          lineHeight: 1,
          transition: 'color 0.3s ease',
        }}>
          {tourSpeed}s
        </span>

        {/* Playing pulse dot */}
        {isTourPlaying && (
          <span style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#A5B4FC',
            zIndex: 2,
            animation: 'tcp-pulse 1.5s ease-in-out infinite',
          }} />
        )}
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tcp-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.75); }
        }
      `}} />
    </div>
  );
}