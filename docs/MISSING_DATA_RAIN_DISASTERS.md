# Missing Data for Story 3: Rain Isn't the Same

## Required Data

### State-Level Precipitation Data
We need state-level precipitation data to calculate precipitation anomalies:

1. **Monthly precipitation totals by state** from NOAA nClimDiv
   - Fields needed: `state_id`, `year`, `month`, `precip` (in mm or inches)
   - Time period: 1895-present (to match nClimDiv availability)
   - Format needed: JSON or similar structured data

2. **State precipitation anomalies** (computed from the above data)
   - Option A (preferred): Standardized precipitation anomaly (z-score) per state-month vs 1991–2020, then average to annual
   - Option B: Percent of normal ((year_total / normal_total) - 1)
   - Data format: `[year, anomaly_value]` pairs where:
     - `year` is the calendar year (e.g., 1953, 1954, ...)
     - `anomaly_value` is the precipitation anomaly (z-score or percent of normal)

### Flood and Drought Disaster Data
We need FEMA disaster declaration data specifically for flood and drought incidents:

1. **Individual disaster declarations** with:
   - Fields needed: `declaration_date`, `state`, `incident_type` (normalized to {flood, drought})
   - Optional field: `pa_obligated_total` (for financial impact)
   - Time period: 1953-present (to match existing disaster data)

2. **Annual counts by incident type and state**:
   - Data format: `[year, count]` pairs where:
     - `year` is the calendar year
     - `count` is the number of flood or drought declarations for that state and year

## Current Data Gaps

The current data files in `/public/climate/` are missing:

1. **State-level precipitation data** - We only have city-level precipitation data in [city_annual_precip_mm.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/city_annual_precip_mm.json)
2. **Detailed FEMA disaster data** - We only have aggregated data by year for hurricanes and wildfires in [disasters_by_year.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/disasters_by_year.json), but no breakdown by:
   - State
   - Incident type (specifically flood/drought)
3. **Missing data structures in [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json)**:
   - `states.{stateId}.precip.anomaly` arrays are empty or missing
   - `states.{stateId}.precip.total` arrays are empty or missing
   - `states.{stateId}.disasters.countByType.flood` arrays are empty or missing
   - `states.{stateId}.disasters.countByType.drought` arrays are empty or missing

## Data Structure Needed

```json
{
  "states": {
    "wa": {
      "precip": {
        "anomaly": [
          [1953, -0.2],
          [1954, 0.5],
          // ... more data
        ],
        "total": [
          [1953, 850],
          [1954, 1020],
          // ... more data (optional)
        ]
      },
      "disasters": {
        "countByType": {
          "flood": [
            [1953, 2],
            [1954, 1],
            // ... more data
          ],
          "drought": [
            [1953, 0],
            [1954, 1],
            // ... more data
          ]
        }
      }
    }
  }
}
```

## Implementation Plan (Once Data is Available)

1. Add the missing state precipitation anomaly and disaster count data to [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json)
2. Create selectors to retrieve precipitation anomaly and disaster count data by state
3. Implement data processing scripts to:
   - Calculate state precipitation anomalies from raw NOAA nClimDiv data
   - Aggregate FEMA disaster declarations by state, year, and incident type (flood/drought)
4. Create UI components for dual-axis visualization (precipitation anomalies vs. disaster counts)
5. Implement state selection functionality (or derive state from selected city)
6. Ensure all components work with placeholder data until real data is available