"use client";
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TempAnomalyOverlayProps {
  data: { year: number; anomaly: number | null }[];
  source: 'global' | 'us';
  smoothing: boolean;
}

export default function TempAnomalyOverlay({ data, source, smoothing }: TempAnomalyOverlayProps) {
  // Filter out null values
  const filteredData = useMemo(() => {
    return data.filter(item => item.anomaly !== null);
  }, [data]);

  // Calculate domain dynamically
  const yDomain = useMemo(() => {
    if (filteredData.length === 0) return [-1, 1];
    
    const values = filteredData.map(item => item.anomaly as number);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;
    
    // Ensure the domain includes 0 for proper baseline
    return [Math.min(min - range * 0.1, 0), Math.max(max + range * 0.1, 0)];
  }, [filteredData]);

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={filteredData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="year" 
            angle={-45} 
            textAnchor="end" 
            height={60}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={yDomain}
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'Temperature Anomaly (°C)', 
              angle: 90, 
              position: 'insideRight' 
            }}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <Tooltip 
            formatter={(value) => [Number(value).toFixed(2), '°C']}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="anomaly" 
            name={source === 'global' ? 'Global Temp Anomaly' : 'U.S. National Temp Anomaly'} 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          {/* Reference line at 0 for baseline */}
          <Line 
            type="monotone" 
            dataKey={() => 0} 
            name="Baseline (0°C)" 
            stroke="#94a3b8" 
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}