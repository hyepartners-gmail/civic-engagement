"use client";
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WarmNightsLineProps {
  data: { year: number; nights: number | null }[];
  threshold: number;
  isHighPercentile: boolean;
}

export default function WarmNightsLine({ data, threshold, isHighPercentile }: WarmNightsLineProps) {
  // Filter out null values
  const filteredData = useMemo(() => {
    return data.filter(item => item.nights !== null);
  }, [data]);

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
            tick={{ fontSize: 12 }}
            label={{ 
              value: `Nights ≥ ${threshold}°F`, 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <Tooltip 
            formatter={(value) => [Number(value).toFixed(0), 'nights']}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="nights" 
            name={`Nights ≥ ${threshold}°F`} 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ r: 4, fill: isHighPercentile ? '#f97316' : '#ef4444' }}
            activeDot={{ r: 6, fill: isHighPercentile ? '#f97316' : '#ef4444' }}
          />
          {isHighPercentile && (
            <Line 
              type="monotone" 
              dataKey="nights" 
              name="High Percentile" 
              stroke="#f97316" 
              strokeWidth={4}
              dot={{ r: 6, fill: '#f97316' }}
              activeDot={{ r: 8, fill: '#f97316' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}