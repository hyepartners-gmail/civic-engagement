# Missing Data: Energy Explorer

## Overview

### Current Status
- **Current Status**: Partially available in existing power_plants_state_aggregates.json structure but needs complete dataset
- **Data Sources**: EIA-860, EIA-923, eGRID, NREL/OpenEI, ACS
- **Coverage**: National-level plant data with state-level aggregations

## Data Transformation Requirements

### Joining Process
1. **EIA 860 + EIA 923**: Match on plant_id to combine capacity and generation data
2. **EIA + eGRID**: Match on plant_id to combine operational and emissions data
3. **NREL Integration**: Add renewable project specifics

### Calculations Needed
1. **CO₂ Intensity**: kg/MWh = (CO₂ tons × 1000) / Annual Generation MWh
2. **Capacity Factor**: % = Annual Generation MWh / (Capacity MW × 8760 hours)
3. **Regional Aggregations**: Sum capacity, generation, and emissions by state

## Implementation Plan

### Phase 1: Core Dataset
1. Acquire EIA 860, 923, and eGRID data
2. Perform data joining and cleaning
3. Calculate derived metrics (CO₂ intensity, capacity factor)
4. Export to power_plants_state_aggregates.json format in the public/climate directory

### Phase 2: Regional Context
1. Acquire geographic boundary data
2. Process RPS policy data by state
3. Create supporting JSON files

### Phase 3: Historical Analysis
1. Extract commission dates from EIA data
2. Build time series for renewable additions
3. Create data structure for growth visualization

## Technical Requirements

### File Formats
- **Primary Data**: JSON (following existing energySchema.ts)
- **Geographic Data**: GeoJSON
- **Time Series**: JSON arrays

### Validation
- All numeric fields should be validated
- Geographic coordinates should be within valid ranges
- Plant IDs should be unique
- Required fields should not be null

### Performance
- Dataset should be optimized for web delivery (<5MB)
- Indexing by plant_id for fast lookups
- Pre-aggregated regional data for fast rendering

## Next Steps

1. **Data Acquisition**: Obtain latest datasets from EIA, EPA, and NREL
2. **ETL Development**: Create processing pipeline to join and transform data
3. **Validation**: Implement data quality checks
4. **Testing**: Verify with sample datasets
5. **Deployment**: Integrate with existing energy page