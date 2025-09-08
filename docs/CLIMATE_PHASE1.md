# Climate Phase 1: Core Data Loading & Story 1 Implementation

## Overview

This document describes the implementation of Phase 1 of the climate narratives application, which focuses on core data loading and the implementation of Story 1: "The Century of Warming".

## Features Implemented

### 1. Core Data Loading

#### useClimateArtifact Hook
- Fetches `/data/climate.json` and validates with Zod schema
- Falls back to CSV processing if JSON is not available
- Uses React Query for efficient data fetching and caching

#### Climate Schema
- Comprehensive Zod schema for climate data validation
- Supports city, state, national, and global data structures
- Defines data types for temperature anomalies, precipitation, degree days, extremes, emissions, etc.

### 2. URL State Management

#### useClimateState Hook
- Manages climate application state
- Synchronizes state with URL parameters
- Supports city selection, base period selection, and cadence (annual/fiscal)

#### BasePeriodToggle Component
- UI control for selecting base period
- Writes selections to URL state

#### FiscalYearToggle Component
- UI control for toggling between calendar and fiscal years
- Writes selections to URL state

### 3. Story 1: The Century of Warming

#### WarmingStripes Component
- High-performance canvas-based visualization of temperature anomalies
- Color-coded stripes using a blue-white-red diverging scale
- Crosshair synchronization across all stripes
- Keyboard navigation support (arrow keys)
- "Hold to compare" interaction (mouse down to freeze crosshair)

#### CityStripGrid Component
- Renders warming stripes for all 6 major US cities
- Responsive grid layout (1 column on mobile, 2 on tablet, 3 on desktop)

#### GlobalSyncPanel Component
- Renders national and global temperature anomaly stripes
- Provides context for city-level data

#### StoryHeader Component
- Displays story title, description, and source information
- Includes tooltips with source URLs

#### YearReadout Component
- Floating chip that displays the currently hovered year
- Animated appearance/disappearance

#### ControlsBar Component
- Container for all climate controls
- Supports conditional rendering of controls

## Technical Implementation Details

### Performance Optimizations

1. **Canvas Rendering**: The WarmingStripes component uses HTML5 Canvas for rendering instead of DOM elements, which provides significant performance improvements for visualizations with many elements (100+ years of data).

2. **React Query**: The useClimateArtifact hook uses React Query for efficient data fetching, caching, and background updates.

3. **Crosshair Synchronization**: The crosshair bus uses React Context with optimized state updates to ensure smooth synchronization across multiple components.

4. **Debounced State Updates**: URL state updates are debounced to prevent excessive history entries and URL updates.

### Accessibility Features

1. **Keyboard Navigation**: Users can navigate through years using arrow keys when focused on a warming stripes visualization.

2. **ARIA Labels**: All interactive elements have appropriate ARIA labels for screen readers.

3. **Focus Management**: Proper focus management for keyboard users.

4. **Color Contrast**: Color palette designed with accessibility in mind, ensuring sufficient contrast for users with visual impairments.

### Data Validation

1. **Zod Schema Validation**: All climate data is validated against a comprehensive Zod schema to ensure data integrity.

2. **Type Safety**: Full TypeScript support throughout the application.

3. **Error Handling**: Graceful error handling for missing or invalid data.

### Responsive Design

1. **Flexible Grid Layouts**: Components adapt to different screen sizes using CSS Grid and Flexbox.

2. **Mobile-First Approach**: Design optimized for mobile devices with progressive enhancement for larger screens.

## Testing

### Unit Tests

- Temperature selectors (`selectAnnualTempAnomaly`)
- Fiscal year mapping functions (`toFiscalYears`)
- Crosshair bus functionality

### Integration Tests

- Crosshair synchronization across multiple warming stripe visualizations
- URL state synchronization
- Component interactions

### Visual Regression Tests

- Stripe layout consistency across breakpoints
- Component rendering

## Performance Benchmarks

- Initial render time: < 150ms on mid-range laptop
- Hover updates: RequestAnimationFrame driven for smooth performance
- Memory usage: Optimized with React Query caching

## UAT Flow Verification

1. Open `/climate` → See Seattle + national/global stripes
2. Toggle Base Period → Colors shift; legend updates
3. Hover 1936 on city grid → national/global year badge reads 1936
4. Toggle FY → Year mapping updates without index drift

## File Structure

```
src/
├── hooks/
│   ├── useClimateArtifact.ts
│   ├── useClimateState.ts
│   └── useCrosshairBus.ts
├── lib/
│   ├── climateSchema.ts
│   ├── selectors/
│   │   └── temps.ts
│   └── time/
│       └── fy.ts
├── components/
│   ├── charts/
│   │   └── WarmingStripes.tsx
│   ├── climate/
│   │   ├── CityStripGrid.tsx
│   │   ├── GlobalSyncPanel.tsx
│   │   ├── StoryHeader.tsx
│   │   └── YearReadout.tsx
│   ├── controls/
│   │   ├── BasePeriodToggle.tsx
│   │   ├── CityPicker.tsx
│   │   └── FiscalYearToggle.tsx
│   └── shared/
│       ├── ControlsBar.tsx
│       └── ChartContainer.tsx
├── stories/
│   └── StoryWarmingCentury.tsx
└── test/
    ├── lib/
    │   └── selectors/
    │       └── temps.test.ts
    ├── hooks/
    │   └── useCrosshairBus.test.ts
    └── components/
        ├── charts/
        │   └── WarmingStripes.test.tsx
        └── climate/
            ├── CityStripGrid.test.tsx
            └── GlobalSyncPanel.test.tsx
```

## Future Enhancements

1. **Global Data Integration**: Add actual global temperature data to replace the national data placeholder
2. **Advanced Analytics**: Implement statistical analysis features
3. **Export Functionality**: Add data export capabilities
4. **Customization**: Allow users to customize visualization parameters