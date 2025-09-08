// src/lib/theme.ts

export const colors = {
  platform: {
    background: '#12001a',
    accent: '#a259ff',
    text: '#fff',
    contrast: '#3d235a',
    cardBackground: '#3d235a', // Matches contrast for consistency
    cyan: '#00FFFF',
    fuchsia: '#FF00FF',
  },
  // Standard semantic colors for UI elements
  semantic: {
    success: '#22c55e', // green-500
    error: '#ef4444',   // red-500
    warning: '#f59e0b', // amber-500
    info: '#3b82f6',    // blue-500
  },
  // Specific shades for political alignment buttons
  political: {
    left: '#2563eb',   // blue-600
    right: '#dc2626',  // red-600
    neutral: '#a259ff', // platform-accent
  },
};

// You can also define other design tokens here if needed, e.g.:
export const typography = {
  fontFamily: {
    sans: 'Manjari, sans-serif',
  },
  // ... other font sizes, weights
};

export const spacing = {
  // ... padding, margin scales
};

export const borderRadius = {
  // ... border radii
};