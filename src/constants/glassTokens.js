export const GLASS_BG = 'linear-gradient(247.52deg, rgba(108,99,255,0.17) 1.52%, rgba(255,255,255,0) 96.99%)';
export const GLASS_SHADOW = 'inset -2px -2px 100px rgba(255,255,255,0.1), inset 2px 2px 100px rgba(66,66,66,0.1)';
export const GLASS_BLUR = 'blur(25px)';

export const PILL_ACTIVE_BG = 'rgba(108,99,255,0.30)';
export const PILL_ACTIVE_BORDER = '2px solid rgba(255,255,255,0.80)';
export const PILL_IDLE_BG = 'rgba(255,255,255,0.08)';
export const PILL_IDLE_BORDER = '2px solid rgba(255,255,255,0.28)';

export const BTN_BG = 'rgba(255,255,255,0.10)';
export const BTN_BORDER = '2px solid rgba(255,255,255,0.28)';

export const PILL_STYLE = {
  background: 'rgba(255,255,255,0.10)',
  boxShadow: GLASS_SHADOW,
  backdropFilter: GLASS_BLUR,
  WebkitBackdropFilter: GLASS_BLUR,
  borderRadius: '50px',
  border: '2px solid rgba(255,255,255,0.30)',
};

export const PILL_ACTIVE_STYLE = {
  ...PILL_STYLE,
  background: PILL_ACTIVE_BG,
  border: '2px solid rgba(255,255,255,0.72)',
};
