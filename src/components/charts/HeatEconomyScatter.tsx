"use client";

import { useMemo } from 'react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Line
} from 'recharts';

interface HeatEconomyScatterProps {
  points: [number, number, number][]; // [year, anomaly, proxy]
  colorByYear?: boolean;
  showFitLine?: boolean;
  fitLinePoints?: [number, number][]; // [anomaly, predicted_proxy]
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export default function HeatEconomyScatter({ 
  points, 
  colorByYear = false,
  showFitLine = false,
  fitLinePoints = [],
  xAxisLabel = 'Summer Temperature Anomaly (°C)',
  yAxisLabel = 'Sector Productivity Proxy'
}: HeatEconomyScatterProps) {
  // Convert points to Recharts format
  const chartData = useMemo(() => {
    return points.map(([year, anomaly, proxy]) => ({
      x: anomaly,
      y: proxy,
      year
    }));
  }, [points]);
  
  // Calculate quartiles for color coding
  const yearQuartiles = useMemo(() => {
    if (!colorByYear || chartData.length === 0) return null;
    
    const years = chartData.map(d => d.year).sort((a, b) => a - b);
    const n = years.length;
    
    return {
      q1: years[Math.floor(n * 0.25)],
      q2: years[Math.floor(n * 0.5)],
      q3: years[Math.floor(n * 0.75)]
    };
  }, [chartData, colorByYear]);
  
  // Determine color for each point based on year
  const getColor = (year: number) => {
    if (!colorByYear || !yearQuartiles) return '#3b82f6'; // Default blue
    
    if (year <= yearQuartiles.q1) return '#3b82f6'; // Blue (earliest)
    if (year <= yearQuartiles.q2) return '#8b5cf6'; // Violet
    if (year <= yearQuartiles.q3) return '#f59e0b'; // Amber
    return '#ef4444'; // Red (latest)
  };
  
  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        <p>No data available for scatter plot</p>
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Temperature Anomaly"
            tick={{ fontSize: 12 }}
            label={{ 
              value: xAxisLabel, 
              position: 'insideBottom', 
              offset: -40 
            }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Productivity Proxy"
            tick={{ fontSize: 12 }}
            label={{ 
              value: yAxisLabel, 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'x') return [`${Number(value).toFixed(2)}°C`, 'Temp Anomaly'];
              if (name === 'y') return [Number(value).toFixed(2), 'Proxy Value'];
              return [String(value), ''];
            }}
            labelFormatter={() => ''}
            content={({ payload }: any) => {
              if (!payload || payload.length === 0) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-white p-2 border rounded shadow">
                  <p className="font-semibold">Year: {data.year}</p>
                  <p>Temp Anomaly: {data.x.toFixed(2)}°C</p>
                  <p>Proxy Value: {data.y.toFixed(2)}</p>
                </div>
              );
            }}
          />
          {showFitLine && fitLinePoints.length > 0 && (
            <Line
              type="monotone"
              dataKey="y"
              data={fitLinePoints.map(([x, y]) => ({ x, y }))}
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              legendType="none"
            />
          )}
          <Scatter 
            name="Data Points" 
            data={chartData} 
            fill="#3b82f6"
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={getColor(payload.year)}
                  stroke="#fff"
                  strokeWidth={1}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}