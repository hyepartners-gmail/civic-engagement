# Missing Data for Story 4: Hot Nights, Harder Days

## Overview
The current climate data artifact (`/public/climate/climate.json`) is missing several key datasets required to fully implement Story 4: "Hot Nights, Harder Days" as specified in the PRD. While the UI components and selectors have been implemented, the underlying data is not available.

## Missing Data Requirements

### 1. Warm Nights Data (cities.{cityId}.series.extremes.warmNights70F)
**Description**: Annual count of nights with temperature ≥ 70°F (21.1°C) for each city, computed from NOAA GHCN-Daily minimum temperature data
**Quality Gate**: Mark city-year null if daily coverage <90%
**Current Status**: Empty arrays in all cities
**Required Structure**:
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

### 2. Additional Warm Night Thresholds (Optional)
**Description**: Pre-computed warm nights data for additional thresholds (68°F, 75°F) to avoid client-side recomputation
**Current Status**: Not implemented
**Required Structure**:
```json
{
  "cities": {
    "atlanta": {
      "series": {
        "annual": {
          "extremes": {
            "warmNights68F": [
              [2000, 55],
              [2001, 58],
              [2002, 62],
              // ... more data
            ],
            "warmNights70F": [
              [2000, 45],
              [2001, 48],
              [2002, 52],
              // ... more data
            ],
            "warmNights75F": [
              [2000, 25],
              [2001, 28],
              [2002, 32],
              // ... more data
            ]
          }
        }
      }
    }
  }
}
```

### 3. National Wildfire Data (national.wildfireAcres)
**Description**: Annual acres burned by wildfires at national level from NIFC
**Current Status**: Empty arrays in national data
**Required Structure**:
```json
{
  "national": {
    "series": {
      "annual": {
        "wildfire": {
          "acresBurned": [
            [2000, 7500000],
            [2001, 8200000],
            [2002, 6800000],
            // ... more data
          ]
        }
      }
    }
  }
}
```

### 4. State-Level Wildfire Data (states.{stateId}.wildfireAcres)
**Description**: Annual acres burned by wildfires at state level from NIFC (if available)
**Metadata**: Include metadata.coverage: national|state
**Current Status**: `states` object is empty
**Required Structure**:
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
      },
      "metadata": {
        "coverage": "state",
        "sources": ["NIFC"]
      }
    }
  }
}
```

### 5. FEMA Heat Event Declarations (states.{stateId}.disasters.countByType.heat)
**Description**: Annual count of FEMA extreme heat event declarations by state
**Current Status**: Not present in schema
**Required Structure**:
```json
{
  "states": {
    "ga": {
      "series": {
        "annual": {
          "disasters": {
            "countByType": {
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
}
```

## Required Data Files

To implement this story, we need the following data files:

1. **Daily minimum temperature data files** from NOAA GHCN-Daily for each city:
   - Format: CSV with columns for `date`, `tmin_c`
   - One file per city

2. **National wildfire data** from NIFC:
   - Format: CSV with columns for [year](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/time/fy.ts#L19-L19), `acres_burned`
   - One file for national data

3. **State-level wildfire data** from NIFC (if available):
   - Format: CSV with columns for `state`, [year](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/time/fy.ts#L19-L19), `acres_burned`
   - One file for all states

4. **FEMA disaster declarations** with filtering for heat events:
   - Format: CSV with columns for `declaration_date`, `state`, `incident_type`
   - One file for all disaster declarations

## Implementation Plan (Once Data is Available)

1. **Create data processing scripts** to:
   - Compute warm nights from daily minimum temperature data
   - Process NIFC wildfire data at national and state levels
   - Filter FEMA disaster declarations for heat events
   - Calculate daily coverage percentages for quality gates

2. **Update [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json)** with the computed data in the required structure

3. **Enhance selectors** to properly retrieve all data types:
   - Update [extremes.ts](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/selectors/extremes.ts) to handle the complete data structure
   - Add metadata handling for wildfire coverage information

4. **Improve UI components** to handle missing data gracefully:
   - Add proper error messages when data is not available
   - Implement loading states
   - Add data quality indicators
   - Show appropriate fallbacks when state data is not available

5. **Add unit tests** for all selectors and components:
   - Test data retrieval with various scenarios
   - Test edge cases (missing data, incomplete years, etc.)
   - Test quality gate functionality

6. **Implement analytics tracking**:
   - Add story_view events for Hot Nights, Harder Days story
   - Add control_change events for threshold and region switches
   - Add download_export events for data export functionality

## Current Implementation Status

The following components are already implemented and ready to work with the data:

1. **Story Component**: [StoryHotNightsHarderDays.tsx](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/components/stories/StoryHotNightsHarderDays.tsx)
   - Handles UI controls for threshold selection and region switching
   - Implements data coverage checks
   - Integrates with URL state management

2. **Chart Component**: [HotNightsWildfireChart.tsx](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/components/charts/HotNightsWildfireChart.tsx)
   - Dual-axis visualization of warm nights and wildfire acres
   - Optional FEMA heat event overlay
   - Health alert notifications for high percentile values

3. **Selectors**: [extremes.ts](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/lib/selectors/extremes.ts)
   - `selectWarmNights` - Retrieves warm nights data for a city
   - `selectWildfireAcres` - Retrieves wildfire acres data for national or state scope
   - `selectFemaHeatCounts` - Retrieves FEMA heat event data for a state
   - Helper functions for data alignment and percentile calculations

4. **Unit Tests**: [extremes.test.ts](file:///Users/bftclb/dyad-apps/census3/next-frontend/src/__tests__/extremes.test.ts)
   - Comprehensive tests for all selectors
   - Tests for data alignment functionality
   - Tests for percentile calculations

## Priority Implementation

Given the missing data, the priority should be:

1. Obtain and process the required data files
2. Update [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json) with the processed data
3. Test the existing implementation with real data
4. Add any missing functionality based on testing results