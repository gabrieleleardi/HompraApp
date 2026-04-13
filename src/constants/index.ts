// ─────────────────────────────────────────────────────────
// COSTANTI GLOBALI
// Cambia BASE_URL con l'URL del tuo server Hompra in produzione.
// In sviluppo, usa l'IP locale della tua macchina (non localhost
// perché il simulatore iOS usa un network separato).
// ─────────────────────────────────────────────────────────

// ⚠️  CONFIGURA QUI: URL del backend Hompra
export const BASE_URL = 'https://www.hompra.com';

export const COLORS = {
  primary:       '#163a5f',   // Hompra navy blue
  primaryLight:  '#1f5080',   // navy più chiaro per stati active/hover
  accent:        '#2a7fc1',   // blue accent
  background:    '#f4f7fa',
  surface:       '#ffffff',
  border:        '#d8e4ef',
  text:          '#0d2137',
  textSecondary: '#5a7a96',
  error:         '#dc2626',
  warning:       '#d97706',
  success:       '#16a34a',
  white:         '#ffffff',
};

export const FONTS = {
  regular:  'System',
  medium:   'System',
  bold:     'System',
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const RADIUS = {
  sm:  6,
  md:  12,
  lg:  16,
  xl:  24,
  full: 9999,
};
