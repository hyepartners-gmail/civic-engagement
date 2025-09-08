"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import StoryLayout from "@/components/shared/StoryLayout";
import { selectStateCO2 } from "@/lib/selectors/emissions";
import { mergeByYear } from "@/utils/array";
import { selectDegreeDays } from "@/lib/selectors/degreeDays";

export default function DebugCO2Page() {
  const { data, isLoading, isError, error } = useClimateArtifact();

  // Debug the CO2 data
  let co2Data = null;
  let degreeDaysData = null;
  let mergedData = null;
  let nationalCO2Data = null;
  
  if (data) {
    try {
      // Try to get CO2 data for Texas (default state)
      co2Data = selectStateCO2(data, { 
        stateId: 'tx', 
        perCapita: false, 
        smoothing: false
      });
      
      // Try to get national CO2 data
      nationalCO2Data = data.national?.series?.annual?.emissions?.co2 || [];
      
      // Try to get degree days data for Texas (using actual data now)
      degreeDaysData = selectDegreeDays(data, { scope: 'state', id: 'tx', cadence: 'annual' });
      
      // Try to merge the data
      if (co2Data && degreeDaysData) {
        const { hdd, cdd } = degreeDaysData;
        const mergedHddCo2 = mergeByYear(hdd, co2Data);
        const mergedCddCo2 = mergeByYear(cdd, co2Data);
        
        mergedData = mergedHddCo2.map(([year, hddVal, co2Val], index) => {
          const cddVal = mergedCddCo2[index]?.[1] ?? null;
          return {
            year,
            hdd: hddVal,
            cdd: cddVal,
            co2: co2Val,
          };
        });
      }
    } catch (e) {
      console.error("Error processing data:", e);
    }
  }

  return (
    <StoryLayout
      title="CO2 Data Debug"
      description="Debugging CO2 data integration"
      showCity={false}
      showBasePeriod={false}
      showFiscalYear={false}
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">CO2 Data Debug</h1>
        
        {isLoading && <p>Loading climate data...</p>}
        
        {isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>Error loading climate data:</p>
            <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        )}
        
        {data && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Data Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded p-3">
                  <h3 className="font-medium">Artifact Loaded</h3>
                  <p>{data ? 'Yes' : 'No'}</p>
                </div>
                <div className="border rounded p-3">
                  <h3 className="font-medium">States Data</h3>
                  <p>{data.states ? `${Object.keys(data.states).length} states` : 'No states data'}</p>
                </div>
                <div className="border rounded p-3">
                  <h3 className="font-medium">Texas State Data</h3>
                  <p>{data.states?.['tx'] ? 'Available' : 'Not available'}</p>
                </div>
                <div className="border rounded p-3">
                  <h3 className="font-medium">Texas CO2 Data</h3>
                  <p>{data.states?.['tx']?.series?.annual?.emissions?.co2 ? 
                    `${data.states['tx'].series.annual.emissions.co2.length} points` : 
                    'Not available'}</p>
                </div>
                <div className="border rounded p-3">
                  <h3 className="font-medium">Texas Degree Days Data</h3>
                  <p>{data.states?.['tx']?.series?.annual?.degreeDays?.hdd ? 
                    `HDD: ${data.states['tx'].series.annual.degreeDays.hdd.length} points` : 
                    'Not available'}</p>
                  <p>{data.states?.['tx']?.series?.annual?.degreeDays?.cdd ? 
                    `CDD: ${data.states['tx'].series.annual.degreeDays.cdd.length} points` : 
                    'Not available'}</p>
                </div>
                <div className="border rounded p-3">
                  <h3 className="font-medium">National CO2 Data</h3>
                  <p>{nationalCO2Data ? 
                    `${nationalCO2Data.length} points` : 
                    'Not available'}</p>
                </div>
              </div>
            </div>
            
            {nationalCO2Data && nationalCO2Data.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-2">National CO2 Data</h2>
                <p>Found {nationalCO2Data.length} data points</p>
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  <pre>{JSON.stringify(nationalCO2Data.slice(0, 10), null, 2)}</pre>
                </div>
              </div>
            )}
            
            {co2Data && co2Data.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-2">CO2 Data for Texas</h2>
                <p>Found {co2Data.length} data points</p>
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  <pre>{JSON.stringify(co2Data.slice(0, 10), null, 2)}</pre>
                </div>
              </div>
            )}
            
            {degreeDaysData && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Degree Days Data for Texas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium">HDD Data</h3>
                    <p>{degreeDaysData.hdd?.length} points</p>
                    <div className="max-h-40 overflow-y-auto border rounded p-2">
                      <pre>{JSON.stringify(degreeDaysData.hdd?.slice(0, 5), null, 2)}</pre>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">CDD Data</h3>
                    <p>{degreeDaysData.cdd?.length} points</p>
                    <div className="max-h-40 overflow-y-auto border rounded p-2">
                      <pre>{JSON.stringify(degreeDaysData.cdd?.slice(0, 5), null, 2)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {mergedData && mergedData.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Merged Data</h2>
                <p>Found {mergedData.length} merged data points</p>
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  <pre>{JSON.stringify(mergedData.slice(0, 5), null, 2)}</pre>
                </div>
              </div>
            )}
            
            {data && !co2Data && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <p>CO2 data could not be processed. Check the console for errors.</p>
              </div>
            )}
            
            {data && co2Data && co2Data.length === 0 && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <p>CO2 data is available but empty. This might indicate a data processing issue.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </StoryLayout>
  );
}