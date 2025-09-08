# Missing Data for Story 6: Emissions in Context

## Overview
The current climate data artifact (`/public/climate/climate.json`) is missing several key datasets required to fully implement Story 6: "Emissions in Context" as specified in the PRD. While the UI components and selectors have been implemented, the underlying data is not available.

## Missing Data Requirements

### 1. National CO₂ Emissions Data (national.emissions.co2e_total_mt)
**Description**: Annual national CO₂ emissions data from EPA GHGI (1990→present)
**Fields**: [year](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/time/fy.ts#L19-L19), `total_co2e_mt`
**Transform**: Already implemented in selectors - no additional processing needed
**Current Status**: Missing from the climate artifact
**Required Structure**:
```json
{
  "national": {
    "series": {
      "annual": {
        "emissions": {
          "co2": [
            [1990, 5000.5],
            [1991, 5050.2],
            [1992, 5100.8],
            // ... more data through present
          ]
        }
      }
    }
  }
}
```

### 2. National Population Data (national.emissions.co2e_per_capita_ton)
**Description**: Annual U.S. population data for per-capita calculations
**Fields**: [year](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/time/fy.ts#L19-L19), `population`
**Transform**: `co2e_ton_per_person = (total_co2e_mt * 1e6) / population`
**Current Status**: Empty array in climate artifact
**Required Structure**:
```json
{
  "national": {
    "series": {
      "annual": {
        "population": [
          [1990, 250000000],
          [1991, 252000000],
          [1992, 254000000],
          // ... more data through present
        ]
      }
    }
  }
}
```

### 3. Global Temperature Anomaly Data (global.tempAnomaly)
**Description**: Global temperature anomalies from NASA GISTEMP
**Fields**: [year](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/time/fy.ts#L19-L19), `anomaly_c`
**Transform**: Annual average °C vs chosen base (1991–2020 or 1951–1980)
**Optional**: rolling 10y mean for anomaly (UI setting)
**Current Status**: Not available in the current schema
**Required Structure**:
```json
{
  "global": {
    "series": {
      "annual": {
        "tempAnomaly": [
          [1990, 0.45],
          [1991, 0.42],
          [1992, 0.28],
          // ... more data through present
        ]
      }
    }
  }
}
```

### 4. U.S. National Temperature Anomaly Data (national.tempAnomaly)
**Description**: U.S. national temperature anomalies (if different from global)
**Fields**: [year](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/time/fy.ts#L19-L19), `anomaly_c`
**Transform**: Annual average °C vs chosen base (1991–2020 or 1951–1980)
**Optional**: rolling 10y mean for anomaly (UI setting)
**Current Status**: Empty array in climate artifact
**Required Structure**:
```json
{
  "national": {
    "series": {
      "annual": {
        "tempAnomaly": [
          [1990, 0.55],
          [1991, 0.52],
          [1992, 0.38],
          // ... more data through present
        ]
      }
    }
  }
}
```

## Current Data Gaps in climate.json

The current [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json) file is missing or has empty arrays for:

1. `national.series.annual.emissions.co2` - This field is missing but needed for CO₂ emissions data
2. `national.series.annual.population` - This field is empty but needed for per-capita calculations
3. `global` data section - This section is missing entirely but needed for global temperature anomalies

## Required Data Files

To implement this story, we need the following data files:

1. **EPA GHGI National CO₂ Emissions Data**:
   - Source: EPA Greenhouse Gas Inventory
   - Format: CSV with columns for [year](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/time/fy.ts#L19-L19), `total_co2e_mt`
   - Time period: 1990-present

2. **U.S. Population Data**:
   - Source: U.S. Census Bureau / American Community Survey
   - Format: CSV with columns for [year](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/time/fy.ts#L19-L19), `population`
   - Time period: 1990-present

3. **NASA GISTEMP Global Temperature Anomaly Data**:
   - Source: NASA Goddard Institute for Space Studies
   - Format: CSV with columns for [year](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/time/fy.ts#L19-L19), `anomaly_c`
   - Time period: 1990-present

4. **NOAA/NCEI U.S. National Temperature Anomaly Data** (optional):
   - Source: NOAA National Centers for Environmental Information
   - Format: CSV with columns for [year](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/time/fy.ts#L19-L19), `anomaly_c`
   - Time period: 1990-present

## Implementation Plan (Once Data is Available)

1. **Create data processing scripts** to:
   - Process EPA GHGI CO₂ emissions data
   - Process U.S. population data
   - Process NASA GISTEMP global temperature anomaly data
   - Process NOAA/NCEI U.S. national temperature anomaly data (if available)

2. **Update [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json)** with the processed data in the required structure

3. **Enhance selectors** to properly retrieve all data types:
   - Update [emissions.ts](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/selectors/emissions.ts) to handle global temperature anomaly data
   - Ensure proper data type conversion and error handling

4. **Improve UI components** to handle missing data gracefully:
   - Add proper error messages when data is not available
   - Implement loading states
   - Add data quality indicators
   - Show appropriate fallbacks when certain data series are missing

5. **Add unit tests** for all selectors and components:
   - Test data retrieval with various scenarios
   - Test edge cases (missing data, incomplete years, etc.)
   - Test per-capita calculations
   - Test smoothing functionality

6. **Implement analytics tracking**:
   - Add story_view events for Emissions in Context story
   - Add control_change events for mode switches and source toggles
   - Add download_export events for data export functionality

## Current Implementation Status

The following components are already implemented and ready to work with the data:

1. **Story Component**: [StoryEmissionsInContext.tsx](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/components/stories/StoryEmissionsInContext.tsx)
   - Handles UI controls for mode selection (per-capita vs total)
   - Implements anomaly source toggle (global vs US national)
   - Includes smoothing toggle for temperature anomalies
   - Integrates with URL state management
   - Provides data export functionality

2. **Chart Component**: [EmissionsTempChart.tsx](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/components/charts/EmissionsTempChart.tsx)
   - Dual-axis visualization of CO₂ emissions (bars) and temperature anomalies (line)
   - Milestones overlay for historical events
   - Proper axis labeling and formatting
   - Responsive design

3. **Selectors**: [emissions.ts](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/selectors/emissions.ts)
   - `selectNationalCO2` - Retrieves national CO₂ data with per-capita option
   - `selectTempAnomaly` - Retrieves temperature anomaly data for different sources
   - `selectMilestones` - Retrieves historical milestone data
   - Helper functions for data processing

4. **Unit Tests**: [emissions.test.ts](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/__tests__/emissions.test.ts)
   - Comprehensive tests for all selectors
   - Tests for per-capita calculations
   - Tests for different data sources

## Priority Implementation

Given the missing data, the priority should be:

1. Obtain and process the required data files:
   - EPA GHGI CO₂ emissions data
   - U.S. population data
   - NASA GISTEMP global temperature anomaly data

2. Update [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json) with the processed data

3. Test the existing implementation with real data

4. Add any missing functionality based on testing results:
   - Implement global temperature anomaly data handling
   - Enhance error handling for missing data scenarios
   - Add proper loading states

## Data Validation Requirements

When implementing the data processing scripts, ensure:

1. **Data Quality Checks**:
   - Verify data completeness for required time periods
   - Check for outliers or anomalous values
   - Validate data types and formats

2. **Base Period Alignment**:
   - Ensure temperature anomalies are calculated relative to the correct base period (1991-2020 or 1951-1980)
   - Verify consistency across different data sources

3. **Unit Consistency**:
   - Confirm CO₂ emissions are in million metric tons
   - Confirm temperature anomalies are in degrees Celsius
   - Verify population data is in whole persons

4. **Time Period Alignment**:
   - Ensure all datasets cover the same time period where possible
   - Handle missing years appropriately (use null values)