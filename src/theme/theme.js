import { Platform } from 'react-native';

export const colors = {
  background: '#000000',
  panel: '#050b18',
  panelTransparent: 'rgba(0,0,0,0.75)',
  cyan: '#4de8ff',
  success: '#7dff9b',
  danger: '#ff5c7a',
  mutedText: '#a9b8d0',
  // blue System look
  blue: '#2f7bff',
  blueLight: '#7db4ff',
  blueDeep: '#07163a',
  panelBlue: 'rgba(3,9,22,0.92)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fonts = {
  heading: Platform.select({ ios: 'Courier', android: 'monospace' }),
  body: Platform.select({ ios: 'Courier', android: 'monospace' }),
  display: Platform.select({ ios: 'Georgia', android: 'serif' }),
};

// Box glow
export const glow = (color = colors.cyan) => ({
  shadowColor: color,
  shadowOpacity: 0.8,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 0 },
  elevation: 6,
});

// Glowing text
export const textGlow = (color = colors.blue) => ({
  textShadowColor: color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 14,
});