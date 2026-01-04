import { Platform } from 'react-native';
export const COLORS = {
  primary: '#2C3E50',    // Deep Slate Blue (Trust)
  action: '#3498DB',     // Electric Blue (Buttons)
  success: '#27AE60',    // Emerald Green (Resolved)
  warning: '#F1C40F',    // Amber (In Progress)
  error: '#E74C3C',      // Rose Red (Critical)
  pending: '#F39C12',    // Orange (Pending)
  background: '#F8F9FA', // Off-white (Surface)
  card: '#FFFFFF',       // Pure White (Cards)
  text: {
    primary: '#2C3E50',
    secondary: '#7F8C8D',
    light: '#FFFFFF',
  }
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

export const STYLES = {
  // Common shadow style for cards (iOS & Android)
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      }
    }),
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.m,
  }
};