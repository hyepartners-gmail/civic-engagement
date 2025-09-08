# Missing Data: Renewable Portfolio Standard (RPS) Targets

## Overview
This document describes the missing data for Renewable Portfolio Standard (RPS) targets by state that need to be added to support the PolicyOverlay feature in Phase 3 of the Energy Explorer.

## Required Data

### RPS Targets JSON Structure
The application needs a JSON file at `/data/rps_targets.json` with the following structure:

```json
{
  "CA": {
    "target": 100,
    "year": 2045,
    "notes": "100% clean electricity by 2045"
  },
  "NY": {
    "target": 70,
    "year": 2030,
    "notes": "70% renewable electricity by 2030"
  },
  "TX": {
    "target": null,
    "year": null,
    "notes": "No mandatory RPS target"
  }
}
```

### Data Fields
1. **State Abbreviation** (key): Two-letter state abbreviation (e.g., "CA", "NY", "TX")
2. **target**: Target percentage for renewable energy (0-100) or null if no target
3. **year**: Target compliance year or null if no target
4. **notes**: Additional information about the RPS policy

## Data Sources
The RPS data should be compiled from:
- Database of State Renewable Portfolio Standards and Goals (DSIRE)
- State energy office websites
- National Renewable Energy Laboratory (NREL) reports

## Required State Coverage
All 50 U.S. states plus Washington D.C.:

AL, AK, AZ, AR, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY, DC

## Implementation Plan

### 1. Data Creation
1. Research current RPS policies for all 50 states + DC
2. Create structured JSON with standardized fields
3. Include notes for policy details and caveats

### 2. Integration
1. Place JSON file at `/public/data/rps_targets.json`
2. Update EnergyMap component to use RPS data for choropleth overlay
3. Add tooltip information for RPS policies

## Technical Requirements

### JSON Schema
```typescript
interface RPSTarget {
  target: number | null;  // Target percentage (0-100) or null
  year: number | null;    // Target year or null
  notes: string;          // Policy description
}

type RPSTargets = Record<string, RPSTarget>; // Keyed by state abbreviation
```

## Example Data
```json
{
  "CA": {
    "target": 100,
    "year": 2045,
    "notes": "100% clean electricity by 2045 (SB 100, 2018)"
  },
  "TX": {
    "target": null,
    "year": null,
    "notes": "No mandatory RPS; voluntary goal of 10,000 MW renewable capacity"
  },
  "NY": {
    "target": 70,
    "year": 2030,
    "notes": "70% renewable electricity by 2030 (Climate Leadership and Community Protection Act)"
  }
}
```

## Next Steps
1. Research and compile RPS data for all states
2. Create JSON file with complete dataset
3. Validate data accuracy with official sources
4. Integrate with existing EnergyMap component