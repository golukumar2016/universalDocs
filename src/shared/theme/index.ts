import { colors, darkColors, midnightColors, sepiaColors, oceanColors } from './palettes';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 14 },
};

export const theme = {
  colors,
  darkColors,
  midnightColors,
  sepiaColors,
  oceanColors,
  spacing,
  typography,
};

export * from './palettes';
export * from './ThemeContext';
export default theme;
