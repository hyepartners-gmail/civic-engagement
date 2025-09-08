"use client";
import { useState, useEffect } from 'react';
import { energySchema } from '@/lib/energySchema';

export default function TestEnergyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch directly from the JSON file
        const res = await fetch("/climate/power_plants_state_aggregates.json");
        
        // Get the response text regardless of content type
        const text = await res.text();
        setResponseText(text);
        
        // Try to parse as JSON
        let jsonData;
        try {
          jsonData = JSON.parse(text);
          console.log("JSON data successfully parsed:", jsonData);
        } catch (parseError: unknown) { // Explicitly type as unknown
          console.error("Error parsing JSON:", parseError);
          const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          setParsingError(`Error parsing JSON: ${errorMessage}. Raw response: ${text.substring(0, 100)}...`);
          setError("Failed to parse response as JSON");
          setLoading(false);
          return;
        }
        
        // Try to validate with zod schema
        try {
          const validatedData = energySchema.parse(jsonData);
          setData(validatedData);
          setError(null);
        } catch (zodError) {
          console.error("Schema validation error:", zodError);
          setParsingError(`Schema validation error: ${JSON.stringify(zodError)}`);
          // Still set the data for inspection even if validation fails
          setData(jsonData);
        }
      } catch (err: unknown) { // Explicitly type as unknown
        console.error("Error fetching data:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Energy Data</h1>
      
      {loading && <div className="text-blue-500">Loading...</div>}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {parsingError && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <strong>Parsing Error:</strong> {parsingError}
        </div>
      )}
      
      {responseText && !data && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Raw Response</h2>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-40 text-xs">
            {responseText.substring(0, 1000)}...
          </pre>
        </div>
      )}
      
      {data && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Data Summary</h2>
          <p className="mb-2"><strong>Number of states:</strong> {data.length || 0}</p>
          
          {data.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">First State: {data[0].state}</h3>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-4 rounded">
                <div><strong>Plant count:</strong> {data[0].plant_count}</div>
                <div><strong>Capacity:</strong> {data[0].capacity_mw} MW</div>
                <div><strong>Generation:</strong> {data[0].annual_net_gen_mwh} MWh</div>
                <div><strong>CO₂ Emissions:</strong> {data[0].annual_co2_tons} tons</div>
              </div>
              
              <h3 className="text-lg font-semibold mt-4 mb-2">Fuel Types</h3>
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium">Counts by Fuel Type:</h4>
                <pre className="text-xs mt-2">
                  {JSON.stringify(data[0].counts_by_fuel, null, 2)}
                </pre>
                
                <h4 className="font-medium mt-4">Has Coordinates:</h4>
                <p>{data[0].coordinates_by_fuel ? "Yes" : "No"}</p>
                
                {data[0].coordinates_by_fuel && (
                  <div className="mt-2">
                    <h4 className="font-medium">Coordinate Sample (Coal):</h4>
                    <pre className="text-xs mt-2">
                      {JSON.stringify(data[0].coordinates_by_fuel.coal?.slice(0, 2), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}