# Missing Data for Story 4: Hot Nights, Harder Days

## Overview
The current climate data artifact (`/public/climate/climate.json`) is missing several key datasets required to implement Story 4: "Hot Nights, Harder Days" as specified in the PRD.

## Missing Data Requirements

### 1. Warm Nights Data (extremes.warmNights70F)
**Location**: Should be in `cities.{cityId}.series.annual.extremes.warmNights70F`
**Description**: Annual count of nights with temperature ≥ 70°F for each city
**Current Status**: Empty arrays in all cities
**Example Structure**:
```json
{
  "cities": {
    "atlanta": {
      "series": {
        "annual": {
          "extremes": {
            "warmNights70F": [
              [2000, 45],
              [2001, 48],
              [2002, 52],
              // ... more data
            ]
          }
        }
      }
    }
  }
}
```

### 2. State-Level Wildfire Data
**Location**: Should be in `states.{stateId}.series.annual.wildfire.acresBurned`
**Description**: Annual acres burned by wildfires at state level
**Current Status**: `states` object is empty
**Example Structure**:
```json
{
  "states": {
    "ga": {
      "series": {
        "annual": {
          "wildfire": {
            "acresBurned": [
              [2000, 15000],
              [2001, 22000],
              [2002, 18500],
              // ... more data
            ]
          }
        }
      }
    }
  }
}
```

### 3. FEMA Heat Event Declarations
**Location**: Should be in `states.{stateId}.series.annual.disasters` or a dedicated section
**Description**: Annual count of FEMA extreme heat event declarations by state
**Current Status**: Not present in schema
**Example Structure**:
```json
{
  "states": {
    "ga": {
      "series": {
        "annual": {
          "disasters": {
            "heat": [
              [2000, 2],
              [2001, 1],
              [2002, 3],
              // ... more data
            ]
          }
        }
      }
    }
  }
}
```

### 4. Support for Different Warm Night Thresholds
**Description**: The data should support different temperature thresholds for warm nights (e.g., 68°F, 70°F, 75°F)
**Current Status**: Only pre-computed 70°F data would be needed, but it's missing
**Implementation Note**: A full implementation would require daily temperature data to compute counts for any threshold

## Required Code Implementation

Despite the missing data, the following components and selectors should be implemented to work with the data when it becomes available:

### Selectors to Implement
1. `selectWarmNights(artifact, { cityId, threshold })` - Get warm nights data for a city at a specific threshold
2. `selectWildfireAcres(artifact, { scope, id })` - Get wildfire acres data for state or national scope
3. `selectFemaHeatCounts(artifact, { stateId })` - Get FEMA heat event declarations for a state
4. `alignYears([nights, wildfire, fema])` - Align multiple series by year with gaps retained

### Components to Implement
1. `WarmNightsLine` - Line chart with dots for warm nights data
2. `WildfireArea` - Shaded area chart for wildfire acres
3. `EventMarkers` - Markers for FEMA heat declarations
4. `RegionSwitch` - Toggle between national/state wildfire data
5. `ThresholdEditor` - Control to change warm night temperature threshold

### Features to Implement
1. Inline "insufficient data" badges when series coverage <80%
2. Tooltip showing year, warm nights, wildfire acres, and heat declarations
3. Health context ribbon when warm nights percentile ≥90th vs city baseline
4. Accessibility features for all markers and controls
5. URL parameter support for threshold (wn=70) and wildfire scope (wf=state|national)

## Data Generation Recommendations

To properly implement this story, the following data generation steps are recommended:

1. **Generate warm nights data**: Process daily temperature data for each city to compute annual counts of nights ≥ 70°F
2. **Add state wildfire data**: Include state-level wildfire acres burned data from NIFC
3. **Include FEMA heat data**: Add FEMA extreme heat event declarations by state
4. **Support multiple thresholds**: Either pre-compute data for common thresholds or include daily temperature data

## Priority Implementation

Given the missing data, we can implement the code structure and components that would work with the data when available, focusing on:

1. Creating the selector functions with proper type safety
2. Building the UI components with appropriate fallbacks for missing data
3. Implementing URL parameter handling
4. Adding proper error handling and data coverage checks
5. Ensuring accessibility compliance