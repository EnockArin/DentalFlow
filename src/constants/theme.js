// Design System & Theme Constants
export const colors = {
  // Primary Colors
  primary: '#2E86AB',
  primaryLight: '#A4CDF0',
  primaryDark: '#1B4D7C',
  
  // Secondary Colors  
  secondary: '#F24236',
  secondaryLight: '#FF6B5B',
  secondaryDark: '#C73E39',
  
  // Accent Colors
  accent: '#F6AE2D',
  accentLight: '#FFD662',
  accentDark: '#E09900',
  
  // Status Colors
  success: '#2ECC71',
  successLight: '#58D68D',
  successDark: '#239B56',
  
  warning: '#F39C12',
  warningLight: '#F8C471',
  warningDark: '#B7950B',
  
  danger: '#E74C3C',
  dangerLight: '#EC7063',
  dangerDark: '#C0392B',
  
  // Neutral Colors
  white: '#FFFFFF',
  lightGray: '#F8F9FA',
  gray: '#6C757D',
  darkGray: '#495057',
  black: '#212529',
  
  // Background Colors
  background: '#F8F9FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  // Text Colors
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  textLight: '#ADB5BD',
  textOnPrimary: '#FFFFFF',
  
  // Border Colors
  border: '#DEE2E6',
  borderLight: '#E9ECEF',
  borderDark: '#ADB5BD',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};

export const typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const shadows = {
  small: {
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  medium: {
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  
  large: {
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Component-specific styles
export const components = {
  button: {
    height: 48,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
  },
  
  input: {
    height: 56,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.medium,
  },
  
  fab: {
    size: 56,
    borderRadius: 28,
    ...shadows.large,
  },
};

// Status-based color mappings
export const statusColors = {
  critical: colors.danger,
  urgent: colors.warning,
  low: colors.primary,
  normal: colors.success,
  
  // Stock levels
  outOfStock: colors.danger,
  lowStock: colors.warning,
  inStock: colors.success,
  
  // Priorities
  high: colors.danger,
  medium: colors.warning,
  low: colors.gray,
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  animations,
  components,
  statusColors,
};