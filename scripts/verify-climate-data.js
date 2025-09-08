/**
 * Script to verify that climate data loading is working correctly
 */

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
          console.error(`✗ Error loading ${file}:`, error.message);
          return false;
        }
      }
      return true;
    };
    
    // Run tests
    const dataFilesOk = await testDataFiles();
    
    if (dataFilesOk) {
      console.log('\n🎉 All climate data verification tests passed!');
      console.log('The climate page should now be working correctly.');
    } else {
      console.log('\n❌ Some climate data verification tests failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during verification:', error.message);
    process.exit(1);
  }
}

// Run the script
main();