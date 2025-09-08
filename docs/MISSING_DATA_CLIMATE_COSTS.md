# Missing Data for Story 8: The Cost of a Changing Climate

## Required Data

### FEMA Disaster Costs Data
We need annual FEMA disaster costs data for the national level, broken down by disaster types:

1. **National FEMA Costs** - `national.series.annual.femaCosts`
   - Total public assistance costs
   - Broken down by disaster types:
     - Hurricane
     - Flood
     - Wildfire
     - Drought
     - Severe Storm

Data format: 
```json
{
  "hurricane": [[year, cost], ...],
  "flood": [[year, cost], ...],
  "wildfire": [[year, cost], ...],
  "drought": [[year, cost], ...],
  "severeStorm": [[year, cost], ...],
  "total": [[year, cost], ...]
}
```

Where:
- `year` is the calendar year (e.g., 1900, 1901, ...)
- `cost` is the dollar amount in nominal dollars

### National Population Data
We need annual U.S. population data to calculate per-capita costs:

1. **National Population** - `national.series.annual.population`

Data format: `[year, population]` pairs where:
- `year` is the calendar year
- `population` is the U.S. population for that year

### National Emissions Data
We need national CO₂ emissions data for the overlay line:

1. **National CO₂ Emissions** - `national.series.annual.emissions.co2`

Data format: `[year, emissions]` pairs where:
- `year` is the calendar year
- `emissions` is the CO₂ emissions in million metric tons

## Current Data Gaps in climate.json

The current [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json) file is missing:

1. `national.series.annual.femaCosts` - Missing entirely
2. `national.series.annual.population` - Empty array
3. `national.series.annual.emissions.co2` - Missing entirely

## Data Structure Needed

```json
{
  "national": {
    "series": {
      "annual": {
        "femaCosts": {
          "hurricane": [[1900, 1000000], [1901, 1200000], ...],
          "flood": [[1900, 800000], [1901, 900000], ...],
          "wildfire": [[1900, 500000], [1901, 600000], ...],
          "drought": [[1900, 300000], [1901, 400000], ...],
          "severeStorm": [[1900, 700000], [1901, 800000], ...],
          "total": [[1900, 3300000], [1901, 3900000], ...]
        },
        "population": [[1900, 76212168], [1901, 77420840], ...],
        "emissions": {
          "co2": [[1900, 225], [1901, 235], ...]
        }
      }
    }
  }
}
```

## Available Data Sources

We have some relevant data in other public folders:

1. **Federal Budget Data**:
   - CPI data in [cpi.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/federal_budget/cpi.json) - Can be used for inflation adjustment
   - GDP data in [macro.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/federal_budget/macro.json)

## Implementation Plan

1. Add the missing FEMA costs, population, and emissions data to [climate.json](file:///Users/bftclb/dyad-apps/census3/next-frontend/public/climate/climate.json)
2. Create selectors to retrieve and process FEMA costs data
3. Implement inflation adjustment helper function
4. Create UI components for cost visualization
5. Ensure all components work with placeholder data until real data is available