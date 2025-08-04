// Centralized theme configuration
export const theme = {
  colors: {
    // Light theme
    light: {
      background: '#eff1f5',
      foreground: '#4c4f69',
      card: '#ffffff',
      cardForeground: '#4c4f69',
      popover: '#ccd0da',
      popoverForeground: '#4c4f69',
      primary: '#00d173',
      primaryForeground: '#ffffff',
      secondary: '#ccd0da',
      secondaryForeground: '#4c4f69',
      muted: '#dce0e8',
      mutedForeground: '#6c6f85',
      accent: '#00d173',
      accentForeground: '#ffffff',
      destructive: '#d20f39',
      destructiveForeground: '#ffffff',
      border: '#bcc0cc',
      input: '#ffffff',
      ring: '#8839ef',
      chart1: '#8839ef',
      chart2: '#04a5e5',
      chart3: '#40a02b',
      chart4: '#fe640b',
      chart5: '#dc8a78',
      sidebar: '#e6e9ef',
      sidebarForeground: '#4c4f69',
      sidebarPrimary: '#8839ef',
      sidebarPrimaryForeground: '#ffffff',
      sidebarAccent: '#04a5e5',
      sidebarAccentForeground: '#ffffff',
      sidebarBorder: '#bcc0cc',
      sidebarRing: '#8839ef',
    },
    // Dark theme
    dark: {
      background: '#050505',
      foreground: '#cdd6f4',
      card: '#1e1e2e',
      cardForeground: '#cdd6f4',
      popover: '#45475a',
      popoverForeground: '#cdd6f4',
      primary: '#3affa7',
      primaryForeground: '#050505',
      secondary: '#313244',
      secondaryForeground: '#cdd6f4',
      muted: '#292c3c',
      mutedForeground: '#a6adc8',
      accent: '#3affa7',
      accentForeground: '#050505',
      destructive: '#f38ba8',
      destructiveForeground: '#1e1e2e',
      border: '#313244',
      input: '#050505',
      ring: '#cba6f7',
      chart1: '#cba6f7',
      chart2: '#89dceb',
      chart3: '#a6e3a1',
      chart4: '#fab387',
      chart5: '#f5e0dc',
      sidebar: '#11111b',
      sidebarForeground: '#cdd6f4',
      sidebarPrimary: '#cba6f7',
      sidebarPrimaryForeground: '#1e1e2e',
      sidebarAccent: '#89dceb',
      sidebarAccentForeground: '#1e1e2e',
      sidebarBorder: '#45475a',
      sidebarRing: '#cba6f7',
    }
  },
  fonts: {
    sans: 'Montserrat, sans-serif',
    serif: 'Georgia, serif',
    mono: 'Fira Code, monospace',
  },
  spacing: {
    default: 4, // 0.25rem * 16 = 4px
  },
  borderRadius: {
    sm: 3.2, // calc(0.35rem - 4px) * 16
    md: 3.6, // calc(0.35rem - 2px) * 16  
    lg: 5.6, // 0.35rem * 16
    xl: 9.6, // calc(0.35rem + 4px) * 16
  },
  shadows: {
    '2xs': {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 1,
    },
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 5,
    },
    '2xl': {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 6,
      elevation: 6,
    },
  }
} as const;

// Helper to get current theme colors
export const getCurrentTheme = (isDark = false) => {
  return isDark ? theme.colors.dark : theme.colors.light;
};

// Type for theme colors
export type ThemeColors = typeof theme.colors.light;