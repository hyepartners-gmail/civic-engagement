awesome—here’s a compact “data dictionary” you can hand to your vibe coder. it covers what each file is for, how to join it, column names + units, and a tiny sample so they can wire pages fast.

---

# Climate Data Index

This is an index of all climate data files in this directory, organized by category.

## 1) `summary/city_annual_avg_temp.json`

Annual average temperatures for major cities from 1743-2023.

- **Source**: Berkeley Earth
- **Units**: Celsius
- **Fields**: city, year, avg_temp_c

## 2) `summary/city_annual_precip_mm.json`

Annual precipitation totals for major cities from 1940-2023.

- **Source**: Berkeley Earth
- **Units**: Millimeters
- **Fields**: city, year, precip_mm

## 3) `summary/disasters_by_year.json`

Annual count of major natural disasters by type from 1953-2023.

- **Source**: FEMA
- **Fields**: year, hurricanes, wildfires, total

## 4) `summary/wildfires_acres_by_year.json`

Annual wildfire statistics from 1983-2023.

- **Source**: NIFC
- **Fields**: year, fires, acres, acres_million

## 5) `summary/egrid_latest_plant.json`

Power plant emissions data.

- **Source**: EPA eGRID
- **Fields**: facility_id, plant_name, state, county, latitude, longitude, capacity_mw, generation_mwh, co2_lbs, so2_lbs, nox_lbs

## 6) `summary/eia860_plants_merged.json`

Power plant operational data.

- **Source**: EIA Form 860
- **Fields**: plant_id, plant_name, utility_id, utility_name, state, county, latitude, longitude, capacity_mw, status, sector

## 7) `summary/eia923_generation_merged.json`

Power plant generation data.

- **Source**: EIA Form 923
- **Fields**: plant_id, year, fuel_type, generation_mwh, co2_tons

## 8) `summary/acs_state_population.json`

State population estimates from 2010-2023.

- **Source**: U.S. Census Bureau (ACS)
- **Fields**: year, state (abbreviation), population

---

## Usage Guide

* **City pages** → use `city_annual_avg_temp.json` and `city_annual_precip_mm.json`
* **National disasters** → `disasters_by_year.json` + (optionally) `nifc_wildfires.json` / `wildfires_acres_by_year.json`
* **Power plants / emissions** → `egrid_latest_plant.json` as standalone
* **Generation** → `eia923_generation_merged.json` (aggregate to state / region / fuel) and join to `acs_state_population.json` for per-capita.

---

## joins & wiring summary

* **City pages** → use `city_annual_avg_temp.csv` and `city_annual_precip_mm.csv`

  * key: `city` (exact casing: “Seattle”, “Los Angeles”, “Chicago”, “New York City”, “Houston”, “Atlanta”)
  * x-axis: `year`

* **National disasters** → `disasters_by_year.csv` + (optionally) `nifc_wildfires.json` / `wildfires_acres_by_year.csv`

  * key: `year`

* **Power plants / emissions** → `egrid_latest_plant.csv` as standalone

  * show plant maps, fuel mix, and emission rates; **do not** assume it joins 1:1 with EIA. If you need a join, build a crosswalk first.

* **Generation** → `eia923_generation_merged.csv` (aggregate to state / region / fuel) and join to `acs_state_population.csv` for per-capita.

---

## small gotchas to watch

* Temperature file may use `avg_temp_c` **or** `temp_c` as the value column; same meaning.
* eGRID column names can change slightly year-to-year; code defensively with a small rename map.
* NIFC wildfire years start at **1983** on their official table. Earlier years won’t appear.

If you want, I can drop a tiny `schemas.py` that loads each file and returns a standardized frame for the UI (handles the `avg_temp_c` vs `temp_c` rename, optional columns in eGRID, etc.).
