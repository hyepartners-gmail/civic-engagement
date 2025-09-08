# Missing Data: Energy Explorer Phase 2

## Overview
This document describes the data requirements for Phase 2 of the Energy Explorer feature, which includes facility detail views and regional aggregates. The implementation should use the existing data files:
- **eia860_plants_merged.json**: Plant-level operational data
- **egrid_latest_plant.json**: Emissions and generation data
- **eia923_generation_merged.json**: Annual generation time series data

## Required Data Enhancements

### 1. Facility Detail Data
For each facility, we need enriched data in the existing JSON files:

#### In eia860_plants_merged.json:
- Historical generation/emissions time series (annual) - add `history` array field
- Unit/turbine level details with capacity/fuel/emissions - add `units` array field
- Status information - add `status` field
- Sector information - add `sector` field

#### In egrid_latest_plant.json:
- Ensure all plants have CO₂ intensity calculations (kg/MWh)
- Add renewable generation breakdowns where applicable

#### In eia923_generation_merged.json:
- Ensure comprehensive time series data for all plants (2001-present)
- Include monthly generation data for more granular analysis

### 2. Regional Aggregates
For regional summaries, we need:

#### State-level aggregations:
- Total capacity (MW) by fuel type
- Annual generation (MWh) by fuel type
- CO₂ emissions (tons) by fuel type
- Renewable share (%) by state
- Time series data for trend analysis (2001-present)

#### Grid region aggregations:
- Similar metrics grouped by NERC regions or ISOs

## Data Transformation Requirements

### Field Mapping Enhancements
1. **Plant Identification**: Use ORISPL code consistently across all files
2. **Historical Data**: Add time series arrays to existing plant records
3. **Unit Details**: Add unit-level information for large plants

### Calculations Needed
1. **CO₂ Intensity**: kg/MWh = (CO₂ tons × 1000) / Annual Generation MWh
2. **Renewable Share**: % = (Renewable Generation / Total Generation) × 100
3. **Capacity Factor**: % = (Annual Generation MWh) / (Capacity MW × 8760 hours) × 100
4. **Historical Aggregates**: Year-over-year totals by state/region

## Implementation Plan

### Phase 1: Enhanced Selectors
1. Implement `selectPlantById(id)` - all plant fields (enhanced)
2. Implement `selectPlantHistory(id)` - generation/emissions time series
3. Implement `selectRegionalSummary(scope, id)` - aggregated metrics
4. Implement `selectPlantsByRegion(region)` - plants filtered by region
5. Implement `selectRegionComparison(region1, region2)` - comparative metrics

### Phase 2: Component Development
1. Enhance PlantDetailPanel with:
   - Basic info display
   - Generation/emissions charts
   - Units/turbines table
   - Historical performance visualization
2. Build RegionalSummary with metric toggles
3. Build RegionalMapOverlay with choropleth
4. Implement Compare Regions mode

## Technical Requirements

### Data Structure Enhancements
The existing Plant interface needs to be extended to support detail views:

```typescript
interface Plant {
  plant_id: number; // ORISPL code
  plant_name: string;
  state: string;
  latitude: number;
  longitude: number;
  fuel_type: string;
  capacity_mw: number;
  annual_net_gen_mwh: number | null;
  co2_tons: number | null;
  co2_intensity_kg_mwh: number | null;
  operator: string;
  online_year: number | null;
  // Additional fields for detail view
  status?: string;
  sector?: string;
  // Historical data (would require joining with time series data)
  history?: PlantHistory[];
  // Unit details
  units?: PlantUnit[];
}

interface PlantHistory {
  year: number;
  generation_mwh: number;
  co2_tons: number;
  capacity_factor: number;
}

interface PlantUnit {
  unit_id: string;
  capacity_mw: number;
  fuel_type: string;
  online_year: number | null;
  retirement_year: number | null;
}

interface RegionalSummary {
  region_id: string;
  region_name: string;
  capacity_mw: number;
  generation_mwh: number;
  co2_tons: number;
  co2_intensity_kg_mwh: number;
  renewable_share_pct: number;
  history: RegionalHistory[];
  by_fuel_type: Record<string, {
    capacity_mw: number;
    generation_mwh: number;
    co2_tons: number;
  }>;
}

interface RegionalHistory {
  year: number;
  capacity_mw: number;
  generation_mwh: number;
  co2_tons: number;
  renewable_generation_mwh: number;
}
```

## Next Steps

1. **Data Enhancement**: Update existing JSON files with required fields
2. **Selector Enhancement**: Implement enhanced selectors using existing data
3. **Component Development**: Build detail and regional components
4. **Testing**: Create unit tests for new selectors
5. **Documentation**: Update implementation documentation