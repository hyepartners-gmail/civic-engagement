"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DisasterCostBarsProps {
  series: Record<string, [number, number | null][]>;
  stacked: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export default function DisasterCostBars({ 
  series, 
  stacked, 
  xAxisLabel = 'Year', 
  yAxisLabel = 'Cost (USD)' 
}: DisasterCostBarsProps) {
  // Convert series to Recharts format
  const chartData = useMemo(() => {
    // Get all years from all series
    const years = new Set<number>();
    Object.values(series).forEach(s => {
      s.forEach(([year]) => years.add(year));
    });
    
    // Sort years
    const sortedYears = Array.from(years).sort((a, b) => a - b);
    
    // Create data points for each year
    return sortedYears.map(year => {
      const dataPoint: Record<string, number | null> = { year };
      Object.entries(series).forEach(([type, s]) => {
        const value = s.find(([y]) => y === year)?.[1] ?? null;
        dataPoint[type] = value;
      });
      return dataPoint;
    });
  }, [series]);
  
  // Get disaster types for coloring
  const disasterTypes = useMemo(() => Object.keys(series), [series]);
  
  // Define colors for different disaster types
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
  ];
  
  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        <p>No disaster cost data available</p>
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="year" 
            angle={-45} 
            textAnchor="end" 
            height={60}
            tick={{ fontSize: 12 }}
            label={{ 
              value: xAxisLabel, 
              position: 'insideBottom', 
              offset: -40 
            }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
              if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
              if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
              return `$${value}`;
            }}
            label={{ 
              value: yAxisLabel, 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <Tooltip 
            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Cost']}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Legend />
          {disasterTypes.map((type, index) => (
            <Bar
              key={type}
              dataKey={type}
              stackId={stacked ? "a" : undefined}
              fill={colors[index % colors.length]}
              name={type.charAt(0).toUpperCase() + type.slice(1)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}