import { Platform } from 'react-native';
export const COLORS = {
  primary: '#2C3E50',
  action: '#3498DB',
  success: '#27AE60',
  warning: '#F1C40F',
  error: '#E74C3C',
  pending: '#F39C12',
  background: '#F8F9FA',
  card: '#FFFFFF',
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