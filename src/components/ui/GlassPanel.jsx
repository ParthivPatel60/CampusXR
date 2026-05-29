import React from 'react';

export default function GlassPanel({ children, className = '', style = {}, ...props }) {
  return (
    <div 
      className={`glass pointer-events-auto rounded-[39px] border border-white/20 ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}
