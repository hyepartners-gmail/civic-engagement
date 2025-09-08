# Missing Data for Story 7: City vs City — Diverging Climate Futures

## Required Data

### City Temperature Anomaly Data
We need annual temperature anomaly data for each city:

1. **Seattle** - `cities.seattle.series.annual.tempAnomaly`
2. **Los Angeles** - `cities.los-angeles.series.annual.tempAnomaly`
3. **Chicago** - `cities.chicago.series.annual.tempAnomaly`
4. **Houston** - `cities.houston.series.annual.tempAnomaly`
5. **Atlanta** - `cities.atlanta.series.annual.tempAnomaly`
6. **New York** - `cities.new-york.series.annual.tempAnomaly`

Data format: `[year, anomaly_value]` pairs where:
- `year` is the calendar year (e.g., 1900, 1901, ...)
- `anomaly_value` is the temperature anomaly in °C relative to the base period

### City Hot Days Data
We need annual counts of hot days (≥90°F) for each city:

1. **Seattle** - `cities.seattle.series.annual.extremes.hotDays90F`
2. **Los Angeles** - `cities.los-angeles.series.annual.extremes.hotDays90F`
3. **Chicago** - `cities.chicago.series.annual.extremes.hotDays90F`
4. **Houston** - `cities.houston.series.annual.extremes.hotDays90F`
5. **Atlanta** - `cities.atlanta.series.annual.extremes.hotDays90F`
6. **New York** - `cities.new-york.series.annual.extremes.hotDays90F`

Additional thresholds needed:
- `hotDays95F` - Days with temperature ≥95°F
- `hotDays100F` - Days with temperature ≥100°F

Data format: `[year, count]` pairs where:
- `year` is the calendar year (e.g., 1900, 1901, ...)
- `count` is the number of days in that year meeting the temperature threshold

## Current Data Gaps in climate.json

The current [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json) file is missing:

1. All `tempAnomaly` arrays are empty: `cities.{cityId}.series.annual.tempAnomaly`
2. Missing `extremes` data: `cities.{cityId}.series.annual.extremes.hotDays90F` (and other thresholds)
3. Missing `precipTotal` data is also empty but not required for this story

## Data Structure Needed

```json
{
  "cities": {
    "seattle": {
      "series": {
        "annual": {
          "tempAnomaly": [
            [1900, -0.5],
            [1901, -0.3],
            // ... more data
          ],
          "extremes": {
            "hotDays90F": [
              [1900, 2],
              [1901, 1],
              // ... more data
            ],
            "hotDays95F": [
              [1900, 0],
              [1901, 0],
              // ... more data
            ],
            "hotDays100F": [
              [1900, 0],
              [1901, 0],
              // ... more data
            ]
          }
        }
      }
    }
    // ... other cities
  }
}
```

## Implementation Plan

1. Add the missing temperature anomaly and hot days data to [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json)
2. Create selectors to retrieve city temperature anomaly and hot days data
3. Implement UI components for city comparison visualization
4. Ensure all components work with placeholder data until real data is available