# Missing Data: Economic Proxies for Climate Impact Analysis

## Overview
This document describes the missing economic data needed for Story 5 - "When Heat Meets the Economy" which aims to correlate summer temperature anomalies with economic productivity proxies.

## Required Data Sets

### 1. Summer Temperature Anomalies
- **Description**: Summer (JJA) temperature anomalies per city/state-year
- **Current Status**: Partially available in `city_annual_avg_temp.json` but needs anomaly calculation
- **Source**: Berkeley Earth or GHCN-derived data
- **Format Needed**: 
  ```
  {
    "states": {
      "stateId": {
        "temps": {
          "summerAnomaly": [[year, anomaly_c]]
        }
      }
    }
  }
  ```

### 2. Construction Hours Index
- **Description**: Normalized index of construction hours worked
- **Current Status**: Missing
- **Proposed Source**: BLS hours worked (Construction)
- **Format Needed**:
  ```
  {
    "states": {
      "stateId": {
        "econProxies": {
          "construction_hours_index": [[year, idx]]
        }
      }
    }
  }
  ```

### 3. Agricultural Yield Proxy
- **Description**: Normalized proxy for agricultural yields
- **Current Status**: Missing
- **Proposed Source**: USDA crop yields for selected states/crops
- **Format Needed**:
  ```
  {
    "states": {
      "stateId": {
        "econProxies": {
          "ag_yield_proxy": [[year, idx]]
        }
      }
    }
  }
  ```

### 4. Electricity Load Proxy
- **Description**: Normalized proxy for regional electricity load
- **Current Status**: Missing
- **Proposed Source**: EIA balancing authorities data
- **Format Needed**:
  ```
  {
    "states": {
      "stateId": {
        "econProxies": {
          "electric_load_proxy": [[year, idx]]
        }
      }
    }
  }
  ```

## Metadata Requirements

Each proxy needs metadata for transparency:
```
{
  "meta": {
    "proxies": {
      "construction_hours_index": {
        "description": "BLS construction hours worked normalized index",
        "unit": "index (0-100)",
        "source": "BLS",
        "transform": "z-score normalization"
      },
      "ag_yield_proxy": {
        "description": "USDA crop yields normalized proxy",
        "unit": "index (0-100)",
        "source": "USDA",
        "transform": "z-score normalization"
      },
      "electric_load_proxy": {
        "description": "EIA regional electricity load normalized proxy",
        "unit": "index (0-100)",
        "source": "EIA",
        "transform": "z-score normalization"
      }
    }
  }
}
```

## Implementation Plan

1. Create a new climate artifact file that includes all required data
2. Develop data processing scripts to generate the artifact from source data
3. Implement visualization components for the correlation analysis
4. Add the story to the climate narratives application

## Next Steps

1. Acquire source data from BLS, USDA, and EIA
2. Develop ETL pipeline to process and normalize the data
3. Create the climate artifact with the required structure
4. Implement the visualization components