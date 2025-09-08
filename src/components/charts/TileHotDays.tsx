"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TileHotDaysProps {
  series: [number, number | null][];
  syncedDomain?: [number, number] | null;
  threshold: number;
}

export default function TileHotDays({ series, syncedDomain, threshold }: TileHotDaysProps) {
  // Convert series to Recharts format
  const chartData = useMemo(() => {
    return series
      .filter(([_, value]) => value !== null)
      .map(([year, value]) => ({
        year,
        days: value
      }));
  }, [series]);
  
  // Determine domain
  const domain = useMemo(() => {
    if (syncedDomain) return syncedDomain;
    
    if (chartData.length === 0) return [0, 10];
    
    const values = chartData.map(d => d.days as number);
    const max = Math.max(...values);
    
    return [0, max + max * 0.1];
  }, [chartData, syncedDomain]);
  
  if (chartData.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-500">
        <p>No hot days data available</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">{`Hot Days (≥${threshold}°F)`}</h4>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis 
              dataKey="year" 
              hide={true}
            />
            <YAxis 
              domain={domain}
              hide={true}
            />
            <Tooltip 
              formatter={(value) => [`${value} days`, `≥${threshold}°F`]}
              labelFormatter={(year) => `Year: ${year}`}
            />
            <Bar 
              dataKey="days" 
              fill="#ef4444" 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{chartData[0]?.year}</span>
        <span>{chartData[chartData.length - 1]?.year}</span>
      </div>
    </div>
  );
}