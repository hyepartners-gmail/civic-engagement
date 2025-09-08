# Missing Data for Story 6: Emissions in Context

## Required Data

### National CO₂ Emissions Data
We need annual national CO₂ emissions data for the United States from at least 1970 onwards. The data should include:

1. **Total CO₂ emissions** (in million metric tons)
2. **Per-capita CO₂ emissions** (in tons per person)

Sources:
- EPA GHGI (Greenhouse Gas Inventory) - https://www.epa.gov/ghgemissions/inventory-us-greenhouse-gas-emissions-and-sinks

### Temperature Anomaly Data
We need annual temperature anomaly data:

1. **Global temperature anomalies** (from NASA GISTEMP)
2. **U.S. national temperature anomalies** (if different from global)

Sources:
- NASA GISTEMP - https://data.giss.nasa.gov/gistemp/

### Population Data
We need annual U.S. population data to calculate per-capita emissions:

Sources:
- U.S. Census Bureau
- American Community Survey (ACS)

## Current Data Gaps in climate.json

The current [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json) file is missing:

1. `national.series.annual.emissions.co2` - This field is empty but needed for CO₂ emissions data
2. `national.series.annual.population` - This field is empty but needed for per-capita calculations

## Data Structure Needed

```
{
  "national": {
    "series": {
      "annual": {
        "emissions": {
          "co2": [
            [1970, 4523.1],
            [1971, 4647.8],
            // ... more data
          ]
        },
        "population": [
          [1970, 205052000],
          [1971, 207661000],
          // ... more data
        ]
      }
    }
  }
}
```

## Additional Data in Other Folders

We have some relevant data in other public folders:

1. **Federal Budget Data**:
   - CPI data in [cpi.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/federal_budget/cpi.json)
   - GDP data in [macro.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/federal_budget/macro.json)

While this data is useful for economic context, it doesn't directly provide the emissions data needed for this story.

## Implementation Plan

1. Add the missing emissions and population data to [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json)
2. Update selectors to properly handle the new data
3. Ensure all components work with the actual data

## Overview
The current climate data artifact (`/public/climate/climate.json`) is missing several key datasets required to implement Story 6: "Emissions in Context" as specified in the PRD.

## Missing Data Requirements

### 1. National CO₂ Emissions Data
**Location**: Should be in `national.series.annual.emissions.co2`
**Description**: Annual national CO₂ emissions data from EPA GHGI
**Current Status**: Missing from the climate artifact
**Example Structure**:
```json
{
  "national": {
    "series": {
      "annual": {
        "emissions": {
          "co2": [
            [1990, 5000],
            [1991, 5050],
            [1992, 5100],
            // ... more data
          ]
        }
      }
    }
  }
}
```

### 2. National Population Data
**Location**: Should be in `national.series.annual.population`
**Description**: Annual national population data for per-capita calculations
**Current Status**: Missing from the climate artifact
**Example Structure**:
```json
{
  "national": {
    "series": {
      "annual": {
        "population": [
          [1990, 250000000],
          [1991, 252000000],
          [1992, 254000000],
          // ... more data
        ]
      }
    }
  }
}
```

### 3. Global Temperature Anomaly Data
**Location**: Should be in a separate global data section or referenced externally
**Description**: Global temperature anomalies from NASA GISTEMP
**Current Status**: Not available in the current schema
**Example Structure**:
```json
{
  "global": {
    "series": {
      "annual": {
        "tempAnomaly": [
          [1990, 0.45],
          [1991, 0.42],
          [1992, 0.28],
          // ... more data
        ]
      }
    }
  }
}
```

### 4. Historical Milestones Data
**Location**: Should be in a separate milestones data section
**Description**: Key historical events for overlay markers
**Current Status**: Not available in the current schema
**Example Structure**:
```json
{
  "milestones": [
    { "year": 1970, "event": "Clean Air Act", "category": "policy" },
    { "year": 2008, "event": "Great Recession", "category": "economic" },
    { "year": 2020, "event": "COVID-19 Pandemic", "category": "health" }
  ]
}
```

## Required Code Implementation

Despite the missing data, the following components and selectors should be implemented to work with the data when it becomes available:

### Selectors to Implement
1. `selectNationalCO2(artifact, { perCapita, smoothing })` - Get national CO₂ data with per-capita and smoothing options
2. `selectTempAnomaly(artifact, { source })` - Get temperature anomaly data for global or national sources
3. `selectMilestones()` - Get historical milestone data for overlay markers

### Components to Implement
1. `PerCapitaBars` - Bar chart for per-capita CO₂ emissions
2. `TempAnomalyOverlay` - Line overlay for temperature anomalies
3. `AnomalySourceToggle` - Toggle between global and national anomaly sources
4. `BarsModeTabs` - Tabs to switch between per-capita and total emissions
5. `MilestonesOverlay` - Vertical rules for historical events

### Features to Implement
1. URL parameter support for all controls:
   - `mode=percap|total` for bar mode
   - `anom=global|us` for anomaly source
   - `anomSmooth=true` for anomaly smoothing
2. Milestones overlay with vertical rules
3. DownloadPanel for CSV export with metadata
4. Proper accessibility features
5. Tooltip showing all data points with correct units

## Data Generation Recommendations

To properly implement this story, the following data generation steps are recommended:

1. **Add national CO₂ emissions data**: Include EPA GHGI data in the national section
2. **Add national population data**: Include population data for per-capita calculations
3. **Add global temperature anomaly data**: Include NASA GISTEMP data
4. **Add historical milestones data**: Include key events for overlay markers

## Priority Implementation

Given the missing data, we can implement the code structure and components that would work with the data when available, focusing on:

1. Creating the selector functions with proper type safety
2. Building the UI components with appropriate fallbacks for missing data
3. Implementing URL parameter handling
4. Adding proper error handling and data coverage checks
5. Ensuring accessibility compliance
6. Creating comprehensive tests