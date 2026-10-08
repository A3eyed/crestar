// @ts-nocheck
// Theme configuration for light and dark modes
import useStore from './store';

export const lightTheme = {
  background: '#FFFFFF',
  cardBackground: '#F5F5F5',
  cardBackgroundAlt: '#EEEEEE',
  text: '#000000',
  textSecondary: '#000000',
  textTertiary: '#000000',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  primary: '#000000',
  accent: '#000000',
  // Text/icon color for use ON TOP of accent-colored backgrounds
  accentText: '#FFFFFF',
  success: '#D4AF37',
  warning: '#F59E0B',
  error: '#EF4444',
  featured: '#FFB800',
  info: '#D4AF37',
  icon: '#000000',
  iconSecondary: '#000000',
  inputBackground: 'rgba(0, 0, 0, 0.05)',
  inputBorder: 'rgba(0, 0, 0, 0.12)',
  inputPlaceholder: '#9CA3AF',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  tabBarActive: '#000000',
  tabBarInactive: '#9CA3AF',
  glass: {
    background: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(0, 0, 0, 0.1)',
    tint: 'light',
  },
  statusBar: 'dark',
  onlineDotBorder: '#FFFFFF',
  drawerBackground: '#FFFFFF',
  overlayBackground: 'rgba(0, 0, 0, 0.4)',
  modalBackground: 'rgba(0, 0, 0, 0.5)',
};

export const darkTheme = {
  background: '#000000',
  cardBackground: 'rgba(255, 255, 255, 0.05)',
  cardBackgroundAlt: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#FFFFFF',
  textTertiary: '#FFFFFF',
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  primary: '#FFFFFF',
  accent: '#FFFFFF',
  // Text/icon color for use ON TOP of accent-colored backgrounds
  // (accent is WHITE in dark mode — white text on it would be invisible)
  accentText: '#000000',
  success: '#D4AF37',
  warning: '#F59E0B',
  error: '#EF4444',
  featured: '#FFB800',
  info: '#D4AF37',
  icon: '#FFFFFF',
  iconSecondary: '#FFFFFF',
  inputBackground: 'rgba(255, 255, 255, 0.1)',
  inputBorder: 'rgba(255, 255, 255, 0.15)',
  inputPlaceholder: 'rgba(255, 255, 255, 0.4)',
  tabBarBackground: 'transparent',
  tabBarBorder: 'rgba(255, 255, 255, 0.1)',
  tabBarActive: '#FFFFFF',
  tabBarInactive: 'rgba(255, 255, 255, 0.5)',
  glass: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.15)',
    tint: 'dark',
  },
  statusBar: 'light',
  onlineDotBorder: '#000000',
  drawerBackground: '#000000',
  overlayBackground: 'rgba(0, 0, 0, 0.6)',
  modalBackground: 'rgba(0, 0, 0, 0.9)',
};

export const getTheme = (mode) => {
  return mode === 'light' ? lightTheme : darkTheme;
};

// Custom hook for easy theme access in any component
export const useTheme = () => {
  const theme = useStore((state) => state.theme);
  return getTheme(theme);
};

export default useTheme;
