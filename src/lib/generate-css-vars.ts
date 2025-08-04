// Generate CSS variables from theme
import { theme } from './theme';

export function generateCSSVariables() {
  const lightVars = Object.entries(theme.colors.light)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `  --${cssVar}: ${value};`;
    })
    .join('\n');

  const darkVars = Object.entries(theme.colors.dark)
    .map(([key, value]) => {
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `  --${cssVar}: ${value};`;
    })
    .join('\n');

  const fontVars = Object.entries(theme.fonts)
    .map(([key, value]) => `  --font-${key}: ${value};`)
    .join('\n');

  return {
    lightVars,
    darkVars,
    fontVars,
    otherVars: `  --radius: ${theme.borderRadius.lg / 16}rem;
  --spacing: ${theme.spacing.default / 16}rem;`
  };
}

// For development: log the generated CSS
if (process.env.NODE_ENV === 'development') {
  console.log('Generated CSS Variables:', generateCSSVariables());
}