"use client";

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TileTempAnomalyProps {
  series: [number, number | null][];
  syncedDomain?: [number, number] | null;
}

export default function TileTempAnomaly({ series, syncedDomain }: TileTempAnomalyProps) {
  // Convert series to Recharts format
  const chartData = useMemo(() => {
    return series
      .filter(([_, value]) => value !== null)
      .map(([year, value]) => ({
        year,
        anomaly: value
      }));
  }, [series]);
  
  // Determine domain
  const domain = useMemo(() => {
    if (syncedDomain) return syncedDomain;
    
    if (chartData.length === 0) return [0, 1];
    
    const values = chartData.map(d => d.anomaly as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // Ensure domain includes 0 for proper baseline
    return [Math.min(min - range * 0.1, 0), Math.max(max + range * 0.1, 0)];
  }, [chartData, syncedDomain]);
  
  if (chartData.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-500">
        <p>No temperature anomaly data available</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Temperature Anomaly</h4>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis 
              dataKey="year" 
              hide={true}
            />
            <YAxis 
              domain={domain}
              hide={true}
            />
            <Tooltip 
              formatter={(value) => [`${Number(value).toFixed(2)}°C`, 'Anomaly']}
              labelFormatter={(year) => `Year: ${year}`}
            />
            <Line 
              type="monotone" 
              dataKey="anomaly" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{chartData[0]?.year}</span>
        <span>{chartData[chartData.length - 1]?.year}</span>
      </div>
    </div>
  );
}