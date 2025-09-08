# Missing Data for Story 5: When Heat Meets the Economy

## Required Data

### Summer Temperature Anomaly Data
We need summer (JJA - June, July, August) temperature anomaly data for cities and states:

1. **City-level summer anomalies** - `cities.{cityId}.series.annual.tempAnomalyJJA`
2. **State-level summer anomalies** - `states.{stateId}.series.annual.tempAnomalyJJA`

Data format: `[year, anomaly_value]` pairs where:
- `year` is the calendar year (e.g., 1900, 1901, ...)
- `anomaly_value` is the summer temperature anomaly in °C relative to the base period

### Sector Productivity Proxy Data
We need proxy data for various economic sectors:

1. **Construction Hours Proxy** - `series.annual.economy.construction`
2. **Agriculture Yield Proxy** - `series.annual.economy.agriculture`
3. **Electric Load Proxy** - `series.annual.economy.energy`

Data format: `[year, proxy_value]` pairs where:
- `year` is the calendar year
- `proxy_value` is a normalized index (0-100) representing sector performance

For cities:
- `cities.{cityId}.series.annual.economy.construction`
- `cities.{cityId}.series.annual.economy.agriculture`
- `cities.{cityId}.series.annual.economy.energy`

For states:
- `states.{stateId}.series.annual.economy.construction`
- `states.{stateId}.series.annual.economy.agriculture`
- `states.{stateId}.series.annual.economy.energy`

## Current Data Gaps in climate.json

The current [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json) file is missing:

1. All `tempAnomaly` arrays are empty: `cities.{cityId}.series.annual.tempAnomaly`
2. Missing `economy` data: `cities.{cityId}.series.annual.economy` (construction, agriculture, energy)
3. Missing `states` data entirely
4. Missing `precipTotal` data is also empty but not required for this story

## Data Structure Needed

```json
{
  "cities": {
    "seattle": {
      "series": {
        "annual": {
          "tempAnomalyJJA": [
            [1900, -0.5],
            [1901, -0.3],
            // ... more data
          ],
          "economy": {
            "construction": [
              [1900, 85],
              [1901, 87],
              // ... more data
            ],
            "agriculture": [
              [1900, 90],
              [1901, 88],
              // ... more data
            ],
            "energy": [
              [1900, 75],
              [1901, 78],
              // ... more data
            ]
          }
        }
      }
    }
  },
  "states": {
    "wa": {
      "series": {
        "annual": {
          "tempAnomalyJJA": [
            [1900, -0.4],
            [1901, -0.2],
            // ... more data
          ],
          "economy": {
            "construction": [
              [1900, 84],
              [1901, 86],
              // ... more data
            ],
            "agriculture": [
              [1900, 89],
              [1901, 87],
              // ... more data
            ],
            "energy": [
              [1900, 74],
              [1901, 77],
              // ... more data
            ]
          }
        }
      }
    }
  }
}
```

## Implementation Plan

1. Add the missing summer temperature anomaly and sector productivity proxy data to [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json)
2. Create selectors to retrieve summer anomaly and sector proxy data
3. Implement data alignment function for pairing temperature and productivity data
4. Create UI components for heat-economy correlation visualization
5. Ensure all components work with placeholder data until real data is available