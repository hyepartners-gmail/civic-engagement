# Climate Data

This directory contains climate data files used in the climate narratives application.

## Data Files

### 1. `city_annual_avg_temp.json`

Annual average temperatures for major cities from 1743-2023.

- **Source**: Berkeley Earth
- **Units**: Celsius
- **Fields**: city, year, avg_temp_c

### 2. `city_annual_precip_mm.json`

Annual precipitation totals for major cities from 1940-2023.

- **Source**: Berkeley Earth
- **Units**: Millimeters
- **Fields**: city, year, precip_mm

### 3. `disasters_by_year.json`

Annual count of major natural disasters by type from 1953-2023.

- **Source**: FEMA
- **Fields**: year, hurricanes, wildfires, total

### 4. `wildfires_acres_by_year.json`

Annual wildfire statistics from 1983-2023.

- **Source**: NIFC
- **Fields**: year, fires, acres, acres_million

### 5. `acs_state_population.json`

State population estimates from 2010-2023.

- **Source**: U.S. Census Bureau (ACS)
- **Fields**: year, state (abbreviation), population

### 6. `nifc_wildfires.json`
JSON version of wildfire data for direct use in UI charts

**Structure:**
```json
{
  "meta": {
    "source": "NIFC (National Interagency Fire Center)",
    "url": "https://www.nifc.gov/fire-information/statistics/wildfires",
    "units": {
      "acres": "acres",
      "acres_million": "million acres",
      "fires": "count"
    }
  },
  "national": {
    "wildfires": {
      "acres": [[year, acres], ...],
      "fires": [[year, fires], ...]
    }
  }
}
```


## Climate Narratives

The climate narratives are organized into three pages:

### 1. Warming & Water (`/climate`)
- Story 1: The Century of Warming (warming stripes)
- Story 3: Rain Isn't the Same (precip vs disaster counts)
- Story 9: The Century Pivot (before/after 1971 pivot)

### 2. Heat, Energy & Health (`/climate/compare`)
- Story 2: Heat Rising, Energy Shifting (HDD/CDD + EIA CO₂)
- Story 4: Hot Nights, Harder Days (warm nights + wildfire)
- Story 6: Emissions in Context (CO₂e + anomaly, per-capita toggle)

### 3. Risk & Cost (`/climate/risk`)
- Story 7: City vs City: Diverging Futures (small multiples + extremes)
- Story 8: Cost of a Changing Climate (FEMA $ + emissions overlay)

### City Detail Pages (`/climate/[city]`)
Each major city has its own detail page showing temperature and precipitation data.