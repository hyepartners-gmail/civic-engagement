"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import StoryLayout from "@/components/shared/StoryLayout";
import { selectStateCO2 } from "@/lib/selectors/emissions";
import { mergeByYear } from "@/utils/array";
import { selectDegreeDays } from "@/lib/selectors/degreeDays";

export default function TestMergePage() {
  const { data, isLoading, isError, error } = useClimateArtifact();

  // Test the data merging for the overlapping year range
  let testData = null;
  let hddData = null;
  let co2Data = null;
  let mergedData = null;
  
  if (data) {
    try {
      // Get CO2 data for Texas
      co2Data = selectStateCO2(data, { 
        stateId: 'tx', 
        perCapita: false, 
        smoothing: false
      });
      
      // Get degree days data for Texas (using actual data now)
      const degreeDaysData = selectDegreeDays(data, { scope: 'state', id: 'tx', cadence: 'annual' });
      hddData = degreeDaysData.hdd;
      
      // Filter data to overlapping year range (1960-2020)
      const filteredHdd = hddData.filter(([year]: [number, number | null]) => year >= 1960 && year <= 2020);
      const filteredCo2 = co2Data.filter(([year]: [number, number | null]) => year >= 1960 && year <= 2020);
      
      console.log('Filtered HDD data:', filteredHdd);
      console.log('Filtered CO2 data:', filteredCo2);
      
      // Merge the filtered data
      const merged = mergeByYear(filteredHdd, filteredCo2);
      console.log('Merged data:', merged);
      
      // Format for display
      mergedData = merged.map(([year, hdd, co2]) => ({
        year,
        hdd: hdd !== null ? Number(hdd.toFixed(1)) : null,
        co2: co2 !== null ? Number(co2.toFixed(1)) : null,
      }));
      
      testData = {
        hddRange: {
          start: Math.min(...filteredHdd.map(([year]: [number, number | null]) => year)),
          end: Math.max(...filteredHdd.map(([year]: [number, number | null]) => year)),
          count: filteredHdd.length
        },
        co2Range: {
          start: Math.min(...filteredCo2.map(([year]: [number, number | null]) => year)),
          end: Math.max(...filteredCo2.map(([year]: [number, number | null]) => year)),
          count: filteredCo2.length
        },
        mergedRange: {
          start: Math.min(...merged.map(([year]: [number, ...(number | null)[]]) => year)),
          end: Math.max(...merged.map(([year]: [number, ...(number | null)[]]) => year)),
          count: merged.length
        }
      };
    } catch (e) {
      console.error("Error processing data:", e);
    }
  }

  return (
    <StoryLayout
      title="Data Merge Test"
      description="Testing data merging for overlapping year ranges"
      showCity={false}
      showBasePeriod={false}
      showFiscalYear={false}
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Data Merge Test</h1>
        
        {isLoading && <p>Loading climate data...</p>}
        
        {isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>Error loading climate data:</p>
            <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        )}
        
        {data && testData && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Data Ranges</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded p-3">
                  <h3 className="font-medium">HDD Data</h3>
                  <p>Years: {testData.hddRange.start} - {testData.hddRange.end}</p>
                  <p>Count: {testData.hddRange.count} points</p>
                </div>
                <div className="border rounded p-3">
                  <h3 className="font-medium">CO2 Data</h3>
                  <p>Years: {testData.co2Range.start} - {testData.co2Range.end}</p>
                  <p>Count: {testData.co2Range.count} points</p>
                </div>
                <div className="border rounded p-3">
                  <h3 className="font-medium">Merged Data</h3>
                  <p>Years: {testData.mergedRange.start} - {testData.mergedRange.end}</p>
                  <p>Count: {testData.mergedRange.count} points</p>
                </div>
              </div>
            </div>
            
            {mergedData && mergedData.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Sample Merged Data</h2>
                <div className="max-h-96 overflow-y-auto border rounded p-2">
                  <pre>{JSON.stringify(mergedData.slice(0, 20), null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </StoryLayout>
  );
}