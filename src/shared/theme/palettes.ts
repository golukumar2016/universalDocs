export interface ThemeColors {
  id: string;
  name: string;
  isDark: boolean;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  card: string;
  cardSecondary: string;
  border: string;
  borderLight: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  badgeBg: string;
  inputBackground: string;
  statusBar: 'light-content' | 'dark-content';
}

export const lightColors: ThemeColors = {
  id: 'light',
  name: 'Light Modern',
  isDark: false,
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  secondary: '#64748B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardSecondary: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#06B6D4',
  badgeBg: '#EFF6FF',
  inputBackground: '#F1F5F9',
  statusBar: 'dark-content',
};

export const darkColors: ThemeColors = {
  id: 'dark',
  name: 'Dark Slate',
  isDark: true,
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#1D4ED8',
  secondary: '#94A3B8',
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  cardSecondary: '#0F172A',
  border: '#334155',
  borderLight: '#1E293B',
  divider: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',
  error: '#F87171',
  warning: '#FBBF24',
  success: '#34D399',
  info: '#22D3EE',
  badgeBg: '#1E293B',
  inputBackground: '#0F172A',
  statusBar: 'light-content',
};

export const midnightColors: ThemeColors = {
  id: 'midnight',
  name: 'Midnight OLED',
  isDark: true,
  primary: '#38BDF8',
  primaryLight: '#7DD3FC',
  primaryDark: '#0284C7',
  secondary: '#A1A1AA',
  background: '#000000',
  surface: '#121212',
  card: '#18181B',
  cardSecondary: '#09090B',
  border: '#27272A',
  borderLight: '#18181B',
  divider: '#27272A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textInverse: '#000000',
  error: '#FB7185',
  warning: '#FBBF24',
  success: '#4ADE80',
  info: '#38BDF8',
  badgeBg: '#18181B',
  inputBackground: '#09090B',
  statusBar: 'light-content',
};

export const sepiaColors: ThemeColors = {
  id: 'sepia',
  name: 'Warm Sepia',
  isDark: false,
  primary: '#B45309',
  primaryLight: '#D97706',
  primaryDark: '#92400E',
  secondary: '#78350F',
  background: '#FBF0D9',
  surface: '#FFF8EA',
  card: '#FFFDF5',
  cardSecondary: '#F3E5C8',
  border: '#E8D7B8',
  borderLight: '#F3E5C8',
  divider: '#E8D7B8',
  textPrimary: '#451A03',
  textSecondary: '#78350F',
  textMuted: '#9A5B32',
  textInverse: '#FFF8EA',
  error: '#DC2626',
  warning: '#D97706',
  success: '#059669',
  info: '#0284C7',
  badgeBg: '#F3E5C8',
  inputBackground: '#F3E5C8',
  statusBar: 'dark-content',
};

export const oceanColors: ThemeColors = {
  id: 'ocean',
  name: 'Nordic Ocean',
  isDark: true,
  primary: '#14B8A6',
  primaryLight: '#2DD4BF',
  primaryDark: '#0D9488',
  secondary: '#94A3B8',
  background: '#0B192C',
  surface: '#1E3E62',
  card: '#1E3E62',
  cardSecondary: '#0B192C',
  border: '#2E5077',
  borderLight: '#1E3E62',
  divider: '#2E5077',
  textPrimary: '#F1F6F9',
  textSecondary: '#9BA4B5',
  textMuted: '#6B7280',
  textInverse: '#0B192C',
  error: '#F87171',
  warning: '#FBBF24',
  success: '#34D399',
  info: '#38BDF8',
  badgeBg: '#0B192C',
  inputBackground: '#0B192C',
  statusBar: 'light-content',
};

export const allThemes: Record<string, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
  midnight: midnightColors,
  sepia: sepiaColors,
  ocean: oceanColors,
};

export const colors = lightColors;
