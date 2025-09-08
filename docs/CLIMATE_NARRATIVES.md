# Climate Narratives Documentation

## Overview

The climate narratives application provides interactive visualizations and stories about climate change impacts in the United States. The application is organized into three main pages, each focusing on different aspects of climate change.

## Narrative Structure

### 1. Warming & Water (`/climate`)

This page focuses on temperature changes and water-related climate impacts.

**Stories:**
1. **The Century of Warming** - Visualizes temperature anomalies over the past century using warming stripes
2. **Rain Isn't the Same** - Compares precipitation patterns with disaster declarations
3. **The Century Pivot** - Shows the shift in climate patterns before and after 1971

### 2. Heat, Energy & Health (`/climate/compare`)

This page explores the relationships between rising temperatures, energy consumption, and health impacts.

**Stories:**
1. **Heat Rising, Energy Shifting** - Analyzes heating/cooling degree days alongside CO₂ emissions
2. **Hot Nights, Harder Days** - Examines the correlation between warm nights and wildfire activity
3. **Emissions in Context** - Places national CO₂ emissions in the context of global temperature anomalies

### 3. Risk & Cost (`/climate/risk`)

This page quantifies climate risks and their economic impacts.

**Stories:**
1. **City vs. City: Diverging Futures** - Compares climate trends across major US cities
2. **The Cost of a Changing Climate** - Analyzes FEMA disaster costs alongside emissions data

## Technical Architecture

### Data Flow

1. **Data Sources**: Climate data is stored in CSV files in the `public/climate` directory
2. **Processing**: The `useClimateArtifact` hook processes CSV data into a structured artifact
3. **Selectors**: Pure functions in the `lib/selectors` directory extract specific data series
4. **Visualization**: Chart components render the data using the Nivo charting library

### Key Components

- **Story Components**: Each narrative is implemented as a React component in `src/components/stories/`
- **Chart Components**: Reusable visualization components in `src/components/charts/`
- **Data Hooks**: Custom hooks for data fetching and state management in `src/hooks/`
- **Selectors**: Pure functions for data transformation in `src/lib/selectors/`

### State Management

The application uses a combination of:
- **URL State**: Controls are synchronized with URL parameters using `useUrlState`
- **Context State**: Global state is managed using React Context in `src/contexts/`
- **Local State**: Component-specific state is managed with React's useState/useReducer

## Development

### Running the Application

```bash
cd next-frontend
npm run dev
```

### Processing Climate Data

To process the CSV data into a consolidated JSON artifact:

```bash
cd next-frontend
npm run process-climate
```

### Adding New Stories

1. Create a new story component in `src/components/stories/`
2. Add the story to the appropriate page configuration in `src/lib/climate/stories.config.ts`
3. Implement any required selectors in `src/lib/selectors/`
4. Create any new chart components in `src/components/charts/` if needed

## Data Sources

- **Temperature Data**: Berkeley Earth
- **Precipitation Data**: Open-Meteo
- **Disaster Data**: FEMA
- **Wildfire Data**: NIFC (National Interagency Fire Center)
- **Population Data**: ACS (American Community Survey)