#!/usr/bin/env ts-node

/**
 * Script to process EIA-860 and eGRID data into the power_plants_state_aggregates.json format
 * This script joins plant data from multiple sources and calculates derived metrics
 */

import * as fs from 'fs';
import * as path from 'path';

// Define the structure based on energySchema.ts
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

// Function to process and join the data
async function processEnergyData() {
  try {
    console.log('Processing energy data...');
    
    // Load EIA-860 data
    const eia860Path = path.join(__dirname, '..', 'public', 'climate', 'eia860_plants_merged.json');
    const eia860Data = JSON.parse(fs.readFileSync(eia860Path, 'utf8'));
    console.log(`Loaded ${eia860Data.length} EIA-860 plants`);
    
    // Load eGRID data
    const egridPath = path.join(__dirname, '..', 'public', 'climate', 'egrid_latest_plant.json');
    const egridData = JSON.parse(fs.readFileSync(egridPath, 'utf8'));
    console.log(`Loaded ${egridData.length} eGRID plants`);
    
    // Create a map of eGRID data by ORISPL code for faster lookup
    const egridMap = new Map<number, any>();
    // Skip the first entry which contains headers
    for (let i = 1; i < egridData.length; i++) {
      const plant = egridData[i];
      const orispl = parseInt(plant['DOE/EIA ORIS plant or facility code']);
      if (!isNaN(orispl)) {
        egridMap.set(orispl, plant);
      }
    }
    console.log(`Mapped ${egridMap.size} eGRID plants by ORISPL code`);
    
    // Process plants and join data
    const processedPlants: Plant[] = [];
    
    // Skip the first entry which contains headers
    for (let i = 1; i < eia860Data.length; i++) {
      const eiaPlant = eia860Data[i];
      
      // Extract plant ID (ORISPL code)
      const plantId = eiaPlant['Plant Code'];
      if (!plantId) continue;
      
      // Look up corresponding eGRID data
      const egridPlant = egridMap.get(plantId);
      
      // Skip plants without eGRID data
      if (!egridPlant) continue;
      
      // Extract and convert data
      const capacity_mw = parseFloat(egridPlant['Plant nameplate capacity (MW)']) || 0;
      
      // Skip very small plants
      if (capacity_mw < 1) continue;
      
      const annual_net_gen_mwh = parseFloat(egridPlant['Plant annual net generation (MWh)']) || null;
      const co2_tons = parseFloat(egridPlant['Plant annual CO2 emissions (tons)']) || null;
      
      // Calculate CO2 intensity (kg/MWh)
      let co2_intensity_kg_mwh = null;
      if (annual_net_gen_mwh && co2_tons && annual_net_gen_mwh > 0) {
        co2_intensity_kg_mwh = (co2_tons * 1000) / annual_net_gen_mwh;
      }
      
      // Map fuel types
      const primaryFuel = egridPlant['Plant primary fuel'] || eiaPlant['Plant Name'];
      let fuel_type = 'Other';
      
      if (primaryFuel) {
        const fuel = primaryFuel.toUpperCase();
        if (fuel.includes('COAL')) fuel_type = 'Coal';
        else if (fuel.includes('GAS') || fuel.includes('METHANE')) fuel_type = 'Natural Gas';
        else if (fuel.includes('NUCLEAR') || fuel.includes('URANIUM')) fuel_type = 'Nuclear';
        else if (fuel.includes('HYDRO')) fuel_type = 'Hydro';
        else if (fuel.includes('WIND')) fuel_type = 'Wind';
        else if (fuel.includes('SOLAR')) fuel_type = 'Solar';
        else if (fuel.includes('GEOTHERMAL')) fuel_type = 'Geothermal';
        else if (fuel.includes('BIOMASS') || fuel.includes('WOOD') || fuel.includes('WASTE')) fuel_type = 'Biomass';
        else if (fuel.includes('OIL') || fuel.includes('DIESEL') || fuel.includes('FUEL')) fuel_type = 'Petroleum';
      }
      
      // Extract location data
      const latitude = parseFloat(egridPlant['Plant latitude']) || 0;
      const longitude = parseFloat(egridPlant['Plant longitude']) || 0;
      
      // Skip plants without valid coordinates
      if (latitude === 0 && longitude === 0) continue;
      
      // Extract operator/owner
      const operator = egridPlant['Plant transmission or distribution system owner name'] || 
                      eiaPlant['Utility Name'] || 
                      'Unknown';
      
      // Create processed plant object
      const processedPlant: Plant = {
        plant_id: plantId,
        plant_name: egridPlant['Plant name'] || eiaPlant['Plant Name'] || 'Unknown',
        state: egridPlant['Plant state abbreviation'] || eiaPlant['Plant State'] || '',
        latitude,
        longitude,
        fuel_type,
        capacity_mw,
        annual_net_gen_mwh,
        co2_tons,
        co2_intensity_kg_mwh,
        operator,
        online_year: null // Would need additional data source for this
      };
      
      processedPlants.push(processedPlant);
    }
    
    console.log(`Processed ${processedPlants.length} plants`);
    
    // Write to climate directory
    const outputPath = path.join(__dirname, '..', 'public', 'climate', 'power_plants_state_aggregates.json');
    
    // Ensure climate directory exists
    const climateDir = path.dirname(outputPath);
    if (!fs.existsSync(climateDir)) {
      fs.mkdirSync(climateDir, { recursive: true });
    }
    
    // Write processed data
    fs.writeFileSync(outputPath, JSON.stringify(processedPlants, null, 2));
    console.log(`Successfully wrote energy data to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error processing energy data:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  processEnergyData();
}

export { processEnergyData };