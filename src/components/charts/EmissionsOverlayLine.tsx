"use client";

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface EmissionsOverlayLineProps {
  series: [number, number | null][];
  yAxisLabel?: string;
}

export default function EmissionsOverlayLine({ 
  series, 
  yAxisLabel = 'CO₂ Emissions' 
}: EmissionsOverlayLineProps) {
  // Convert series to Recharts format
  const chartData = useMemo(() => {
    return series
      .filter(([_, value]) => value !== null)
      .map(([year, value]) => ({
        year,
        emissions: value
      }));
  }, [series]);
  
  // Determine domain
  const domain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    
    const values = chartData.map(d => d.emissions as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    return [min - range * 0.1, max + range * 0.1];
  }, [chartData]);
  
  if (chartData.length === 0) {
    return null; // Don't render if no data
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis 
            dataKey="year" 
            hide={true}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            domain={domain}
            hide={true}
          />
          <Tooltip 
            formatter={(value) => [`${Number(value).toLocaleString()} tons`, 'CO₂ Emissions']}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="emissions" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}