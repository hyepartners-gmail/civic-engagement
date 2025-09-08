"use client";
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WildfireAreaProps {
  data: { year: number; acres: number | null }[];
  scope: 'national' | 'state';
}

export default function WildfireArea({ data, scope }: WildfireAreaProps) {
  // Filter out null values
  const filteredData = useMemo(() => {
    return data.filter(item => item.acres !== null);
  }, [data]);

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
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
              value: 'Acres Burned', 
              angle: 90, 
              position: 'insideRight' 
            }}
          />
          <Tooltip 
            formatter={(value) => [Number(value).toLocaleString(), 'acres']}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Area 
            type="monotone" 
            dataKey="acres" 
            name={`${scope === 'national' ? 'National' : 'State'} Wildfire Acres`} 
            stroke="#dc2626" 
            fill="#dc2626" 
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}