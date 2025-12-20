/**
 * Cyberpunk Theme for Chongqing Guide
 */

import { Platform } from 'react-native';

const tintColorLight = '#39FF14'; // Neon Green
const tintColorDark = '#39FF14'; // Neon Green

export const Colors = {
  light: {
    text: '#ECEDEE', // Force dark mode look
    background: '#050505',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#FF5722', // Neon Orange for active tab
  },
  dark: {
    text: '#ECEDEE',
    background: '#050505',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#555555',
    tabIconSelected: '#FF5722', // Neon Orange for active tab
  },
  cyberpunk: {
    neonGreen: '#39FF14',
    neonOrange: '#FF5722',
    neonBlue: '#00F0FF',
    darkBg: '#050505',
    cardBg: '#121212',
    text: '#FFFFFF',
    textDim: '#888888',
    border: '#333333',
  }
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
});