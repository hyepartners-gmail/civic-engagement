import { useEffect, useState } from 'react';

// Basic component to load and display employment data directly
export default function BasicEmploymentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadEmploymentData() {
      try {
        setLoading(true);
        
        // Fetch the index file directly
        console.log('Fetching employment index directly...');
        const indexRes = await fetch('/employment/employment.index.json');
        if (!indexRes.ok) {
          throw new Error(`Failed to fetch index: ${indexRes.status} ${indexRes.statusText}`);
        }
        const indexData = await indexRes.json();
        console.log('Successfully loaded index:', indexData);
        
        // Fetch the opportunity data for simplicity
        console.log('Fetching opportunity data...');
        const oppRes = await fetch('/employment/employment.opportunity.json');
        if (!oppRes.ok) {
          throw new Error(`Failed to fetch opportunity data: ${oppRes.status} ${oppRes.statusText}`);
        }
        const oppData = await oppRes.json();
        
        // Set the combined data
        setData({
          index: indexData,
          opportunity: oppData
        });
        setError(null);
      } catch (err) {
        console.error('Error loading employment data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }
    
    loadEmploymentData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Employment Data</h1>
        <div className="bg-blue-100 p-4 rounded">Loading employment data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Employment Data</h1>
        <div className="bg-red-100 p-4 rounded text-red-700">
          <p className="font-bold">Error loading employment data:</p>
          <p>{error.message}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Employment Data</h1>
      
      {data && (
        <div className="space-y-4">
          <div className="bg-green-100 p-4 rounded">
            <p className="font-bold">Successfully loaded employment data!</p>
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Index Information</h2>
            <p><strong>Files available:</strong> {Object.keys(data.index.files).join(', ')}</p>
            <p><strong>Note:</strong> {data.index.notes[0]}</p>
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Sample Data (Opportunity)</h2>
            <p><strong>Series available:</strong> {Object.keys(data.opportunity.series).length}</p>
            {data.opportunity.series && data.opportunity.series['cps.ur.white'] && (
              <div className="mt-2">
                <p><strong>Sample Series:</strong> {data.opportunity.series['cps.ur.white'].name}</p>
                <p><strong>Unit:</strong> {data.opportunity.series['cps.ur.white'].unit}</p>
                <p><strong>Data points:</strong> {data.opportunity.series['cps.ur.white'].monthly.length}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}