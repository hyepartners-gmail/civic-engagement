# Energy Explorer Implementation

## Overview
This document describes the implementation of the Energy Explorer feature for the climate/energy page, which allows users to explore U.S. power plant data with interactive maps and tables.

## Components Implemented

### 1. Map Legend with Color Mode Switching
- **File**: `src/components/energy/MapLegend.tsx`
- **Features**:
  - Toggle between fuel type and CO₂ intensity coloring modes
  - Visual representation of fuel types with color coding
  - CO₂ intensity scale (0-200: Clean, 200-600: Moderate, 600-1000: High, 1000+: Very High)

### 2. Enhanced Energy Map
- **File**: `src/components/energy/EnergyMap.tsx`
- **Features**:
  - Support for coloring markers by fuel type or CO₂ intensity
  - Detailed popups showing plant information:
    - Name
    - Fuel Type
    - Capacity (MW)
    - Annual Output (MWh)
    - CO₂ Intensity (kg/MWh)
    - Operator
    - Online Date
  - Marker clustering for dense areas
  - Regional overlays for capacity, emissions, and RPS policies

### 3. Energy Page Updates
- **File**: `src/pages/climate/energy.tsx`
- **Features**:
  - Integration of color mode switching between map and legend
  - Maintained existing functionality (filters, insights panel, etc.)

### 4. Selectors
- **File**: `src/lib/selectors/energy.ts`
- **Functions**:
  - `filterPlants()`: Filter plants by fuel type, CO₂ intensity, and capacity
  - `groupByFuelType()`: Group plants by fuel type with counts and capacity
  - `selectPlantById()`: Select a specific plant by ID
  - `selectRegionalSummary()`: Calculate regional summaries by state
  - `selectTopEmitters()`: Select top CO₂ emitters
  - `selectCleanestPlants()`: Select plants with lowest CO₂ intensity
  - `selectRenewableBuildOverTime()`: Calculate renewable energy build over time

## Tests

### Unit Tests
- **File**: `src/__tests__/selectors/energy.test.ts`
- **Coverage**:
  - All selector functions tested with mock data
  - Edge cases handled (null values, empty arrays, etc.)

### Snapshot Tests
- **File**: `src/__tests__/pages/climate/energy.test.tsx`
- **Coverage**:
  - Page structure verification
  - Component rendering
  - Layout consistency

## URL State Management
The implementation maintains URL state synchronization for all filters:
- Fuel types (`f` parameter)
- CO₂ intensity max (`c` parameter)
- Capacity minimum (`m` parameter)
- State is encoded/decoded using LZString compression

## Accessibility Features
- Keyboard navigation support for tables
- Proper labeling of UI controls
- Color contrast compliant with accessibility standards
- Screen reader support for map popups

## Performance Considerations
- Filtering performance optimized for 10k+ plants
- Marker clustering for map performance
- Debounced state updates to prevent excessive re-renders
- Lazy loading of dynamic components

## Data Schema
The implementation follows the existing `Plant` schema:
```typescript
interface Plant {
  plant_id: number;
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
}
```

## Future Enhancements
1. Add time series filtering for renewable build data
2. Implement additional regional metrics
3. Add comparison functionality between plants
4. Enhance export capabilities with more data formats