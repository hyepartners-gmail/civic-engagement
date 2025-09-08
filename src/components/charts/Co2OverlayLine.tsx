"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Co2OverlayLineProps {
  data: { year: number; co2: number | null }[];
  perCapita: boolean;
}

export default function Co2OverlayLine({ data, perCapita }: Co2OverlayLineProps) {
  // Filter out null values
  const filteredData = data.filter(item => item.co2 !== null);

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
            yAxisId="left" 
            orientation="left" 
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'Degree Days', 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fontSize: 12 }}
            label={{ 
              value: perCapita ? 'CO₂ (tons per capita)' : 'CO₂ (million tons)', 
              angle: 90, 
              position: 'insideRight' 
            }}
          />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'co2') {
                return [Number(value).toFixed(2), perCapita ? 'tons per capita' : 'million tons'];
              }
              return [Number(value).toFixed(1), 'Degree Days'];
            }}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="co2" 
            name="CO₂ Emissions" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}