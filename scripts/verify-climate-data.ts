#!/usr/bin/env ts-node

/**
 * Script to verify that climate data loading is working correctly
 */

import { createClimateArtifact } from "../src/hooks/useRawClimateArtifact";

async function main() {
  try {
    console.log("Verifying climate data loading...");
    
    // Test fetching the data files directly
    const testDataFiles = async () => {
      const files = [
        '/climate/city_annual_avg_temp.json',
        '/climate/city_annual_precip_mm.json',
        '/climate/disasters_by_year.json',
        '/climate/wildfires_acres_by_year.json'
      ];
      
      for (const file of files) {
        try {
          const response = await fetch(`http://localhost:32100${file}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${file}: ${response.statusText}`);
          }
          const data = await response.json();
          console.log(`✓ Successfully loaded ${file} with ${data.length} records`);
        } catch (error) {
          console.error(`✗ Error loading ${file}:`, error);
          return false;
        }
      }
      return true;
    };
    
    // Test the createClimateArtifact function
    const testDataProcessing = async () => {
      try {
        // Load sample data
        const tempResponse = await fetch('http://localhost:32100/climate/city_annual_avg_temp.json');
        const precipResponse = await fetch('http://localhost:32100/climate/city_annual_precip_mm.json');
        const disastersResponse = await fetch('http://localhost:32100/climate/disasters_by_year.json');
        const wildfiresResponse = await fetch('http://localhost:32100/climate/wildfires_acres_by_year.json');
        
        if (!tempResponse.ok || !precipResponse.ok || !disastersResponse.ok || !wildfiresResponse.ok) {
          throw new Error('Failed to fetch one or more data files');
        }
        
        const cityTemps = await tempResponse.json();
        const cityPrecip = await precipResponse.json();
        const disasters = await disastersResponse.json();
        const wildfires = await wildfiresResponse.json();
        
        // Create the climate artifact
        const artifact = createClimateArtifact(cityTemps, cityPrecip, disasters, wildfires, [], []);
        
        console.log('✓ Successfully created climate artifact');
        console.log(`  - Meta version: ${artifact.meta.version}`);
        console.log(`  - Number of cities: ${Object.keys(artifact.cities).length}`);
        
        if (artifact.national && artifact.national.series && artifact.national.series.annual) {
          console.log(`  - National temp data points: ${artifact.national.series.annual.tempAnomaly?.length || 0}`);
          console.log(`  - Disaster data points: ${artifact.national.series.annual.disasters?.total?.length || 0}`);
          console.log(`  - Wildfire data points: ${artifact.national.series.annual.wildfire?.acresBurned?.length || 0}`);
        }
        
        return true;
      } catch (error) {
        console.error('✗ Error processing climate data:', error);
        return false;
      }
    };
    
    // Run tests
    const dataFilesOk = await testDataFiles();
    const dataProcessingOk = await testDataProcessing();
    
    if (dataFilesOk && dataProcessingOk) {
      console.log('\n🎉 All climate data verification tests passed!');
      console.log('The climate page should now be working correctly.');
    } else {
      console.log('\n❌ Some climate data verification tests failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}