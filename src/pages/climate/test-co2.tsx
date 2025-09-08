"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import StoryLayout from "@/components/shared/StoryLayout";

export default function TestCO2Page() {
  const { data, isLoading, isError, error } = useClimateArtifact();

  return (
    <StoryLayout
      title="CO2 Data Test"
      description="Testing CO2 data integration"
      showCity={false}
      showBasePeriod={false}
      showFiscalYear={false}
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">CO2 Data Test</h1>
        
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
              <h2 className="text-xl font-semibold mb-2">National CO2 Data</h2>
              {data.national?.series?.annual?.emissions?.co2 ? (
                <div>
                  <p>Found {data.national.series.annual.emissions.co2.length} data points</p>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    <pre>{JSON.stringify(data.national.series.annual.emissions.co2.slice(0, 10), null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <p className="text-red-500">No national CO2 data found</p>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">State CO2 Data (Washington)</h2>
              {data.states?.['wa']?.series?.annual?.emissions?.co2 ? (
                <div>
                  <p>Found {data.states['wa'].series.annual.emissions.co2.length} data points</p>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    <pre>{JSON.stringify(data.states['wa'].series.annual.emissions.co2.slice(0, 10), null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <p className="text-red-500">No state CO2 data found for Washington</p>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">Available States</h2>
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                <pre>{JSON.stringify(Object.keys(data.states || {}), null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </StoryLayout>
  );
}