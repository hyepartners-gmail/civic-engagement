"use client";
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerCapitaBarsProps {
  data: { year: number; co2: number | null }[];
  mode: 'percap' | 'total';
}

export default function PerCapitaBars({ data, mode }: PerCapitaBarsProps) {
  // Filter out null values
  const filteredData = useMemo(() => {
    return data.filter(item => item.co2 !== null);
  }, [data]);

  // Calculate domain dynamically
  const yDomain = useMemo(() => {
    if (filteredData.length === 0) return [0, 100];
    
    const values = filteredData.map(item => item.co2 as number);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;
    
    return [min - range * 0.1, max + range * 0.1]; // Add 10% padding
  }, [filteredData]);

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
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
              value: mode === 'percap' ? 'Tons CO₂ per person' : 'Million Metric Tons CO₂', 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <Tooltip 
            formatter={(value) => [
              Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }), 
              mode === 'percap' ? 'tons per person' : 'million tons'
            ]}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Legend />
          <Bar 
            dataKey="co2" 
            name={mode === 'percap' ? 'CO₂ per Capita' : 'Total CO₂'} 
            fill="#3b82f6" 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}