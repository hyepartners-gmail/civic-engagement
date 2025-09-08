# Missing Data for Story 2: Heat Rising, Energy Shifting

## Required Data

### Degree Days Data (HDD/CDD)
We need heating and cooling degree days data computed from NOAA GHCN-Daily temperature data:

1. **City-level degree days** computed from daily temperature data:
   - Fields needed: `city`, year, `hdd`, `cdd`
   - Computation: 
     - Daily average temperature = (tmax + tmin) / 2
     - HDD = max(0, 18°C - daily_avg_temp)  [base 65°F / 18°C]
     - CDD = max(0, daily_avg_temp - 18°C)  [base 65°F / 18°C]
     - Sum to annual totals
   - Quality gate: City year valid only if ≥90% of daily coverage
   - Data format: `[year, degree_days]` pairs where:
     - `year` is the calendar year
     - `degree_days` is the annual total (in °F or °C days)

2. **Data structure needed in climate.json**:
   ```json
   {
     "cities": {
       "seattle": {
         "series": {
           "annual": {
             "degreeDays": {
               "hdd": [[year, hdd_value], ...],
               "cdd": [[year, cdd_value], ...]
             }
           }
         }
       }
     }
   }
   ```

### State CO₂ Emissions Data
We need EIA State Energy-Related CO₂ data:

1. **State-level CO₂ emissions** from EIA:
   - Fields needed: `state`, year, `co2_mmt` (million metric tons)
   - Optional: By sector data if available
   - Time period: 1973-present
   - Data format: `[year, co2_value]` pairs where:
     - `year` is the calendar year
     - `co2_value` is the annual CO₂ emissions in million metric tons

2. **Per-capita CO₂ calculations** (optional):
   - Fields needed: `state`, year, `population` (from ACS)
   - Computation: `co2_per_capita = (co2_mmt * 1e6) / population` (tons per person)
   - Data format: `[year, co2_per_capita]` pairs where:
     - `year` is the calendar year
     - `co2_per_capita` is the per-capita CO₂ emissions in tons per person

3. **Data structure needed in climate.json**:
   ```json
   {
     "states": {
       "wa": {
         "series": {
           "annual": {
             "emissions": {
               "co2_total_mton": [[year, co2_value], ...],
               "co2_per_capita_ton": [[year, co2_per_capita_value], ...]
             }
           }
         }
       }
     }
   }
   ```

## Current Data Gaps

The current data files in `/public/climate/` are missing:

1. **Degree days data** - No files containing computed HDD/CDD values from GHCN-Daily data
2. **State CO₂ emissions data** - No files containing EIA State Energy-Related CO₂ data
3. **Missing data structures in climate.json**:
   - `cities.{cityId}.series.degreeDays.hdd` arrays are missing
   - `cities.{cityId}.series.degreeDays.cdd` arrays are missing
   - `states.{stateId}.emissions.co2_total_mton` arrays are missing
   - `states.{stateId}.emissions.co2_per_capita_ton` arrays are missing

## Required Data Files

To implement this story, we need the following data files:

1. **Daily temperature data files** from NOAA GHCN-Daily for each city:
   - Format: JSON with columns for `date`, `tmax_c`, `tmin_c`
   - One file per city

2. **State CO₂ emissions data** from EIA:
   - Format: JSON with columns for `state`, year, `co2_mmt`
   - One file for all states

3. **State population data** from Census/ACS (already partially available):
   - File: acs_state_population.json
   - Format: JSON with columns for `state`, year, `population`

## Implementation Plan (Once Data is Available)

1. **Create data processing scripts** to:
   - Compute HDD/CDD from daily temperature data
   - Process EIA CO₂ emissions data
   - Calculate per-capita CO₂ emissions using population data

2. **Update climate.json** with the computed data

3. **Enhance selectors** to properly retrieve degree days and CO₂ data:
   - Update degreeDays.ts to handle the new data structure
   - Update emissions.ts to handle the new data structure

4. **Improve UI components** to handle missing data gracefully:
   - Add proper error messages when data is not available
   - Implement loading states
   - Add data quality indicators

5. **Add unit tests** for selectors and components:
   - Test data retrieval with various scenarios
   - Test edge cases (missing data, incomplete years, etc.)