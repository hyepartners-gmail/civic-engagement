"use client";
import { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MilestonesOverlay from './MilestonesOverlay';

interface EmissionsTempChartProps {
  co2Data: { year: number; co2: number | null }[];
  anomalyData: { year: number; anomaly: number | null }[];
  mode: 'percap' | 'total';
  anomalySource: 'global' | 'us';
  showMilestones: boolean;
}

export default function EmissionsTempChart({ 
  co2Data, 
  anomalyData, 
  mode, 
  anomalySource,
  showMilestones
}: EmissionsTempChartProps) {
  // Align all data series by year
  const alignedData = useMemo(() => {
    const years = new Set<number>();
    
    co2Data.forEach(d => years.add(d.year));
    anomalyData.forEach(d => years.add(d.year));
    
    return Array.from(years).sort().map(year => ({
      year,
      co2: co2Data.find(d => d.year === year)?.co2 ?? null,
      anomaly: anomalyData.find(d => d.year === year)?.anomaly ?? null,
    }));
  }, [co2Data, anomalyData]);

  // Filter out null values for display
  const displayData = useMemo(() => {
    return alignedData.filter(d => d.co2 !== null || d.anomaly !== null);
  }, [alignedData]);

  // Calculate domains
  const co2Domain = useMemo(() => {
    const co2Values = displayData
      .map(d => d.co2)
      .filter((val): val is number => val !== null);
    
    if (co2Values.length === 0) return [0, 100];
    
    const max = Math.max(...co2Values);
    const min = Math.min(...co2Values);
    const range = max - min;
    
    return [min - range * 0.1, max + range * 0.1];
  }, [displayData]);

  const anomalyDomain = useMemo(() => {
    const anomalyValues = displayData
      .map(d => d.anomaly)
      .filter((val): val is number => val !== null);
    
    if (anomalyValues.length === 0) return [-1, 1];
    
    const max = Math.max(...anomalyValues);
    const min = Math.min(...anomalyValues);
    const range = max - min;
    
    // Ensure the domain includes 0 for proper baseline
    return [Math.min(min - range * 0.1, 0), Math.max(max + range * 0.1, 0)];
  }, [displayData]);

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={displayData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
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
            domain={co2Domain}
            tick={{ fontSize: 12 }}
            label={{ 
              value: mode === 'percap' ? 'Tons CO₂ per person' : 'Million Metric Tons CO₂', 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={anomalyDomain}
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'Temperature Anomaly (°C)', 
              angle: 90, 
              position: 'insideRight' 
            }}
          />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'co2') {
                return [
                  Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }), 
                  mode === 'percap' ? 'tons per person' : 'million tons'
                ];
              } else if (name === 'anomaly') {
                return [Number(value).toFixed(2), '°C'];
              }
              return [String(value), ''];
            }}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Legend />
          <Bar 
            yAxisId="left"
            dataKey="co2" 
            name={mode === 'percap' ? 'CO₂ per Capita' : 'Total CO₂'} 
            fill="#3b82f6" 
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="anomaly" 
            name={anomalySource === 'global' ? 'Global Temp Anomaly' : 'U.S. National Temp Anomaly'} 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          {/* Reference line at 0 for baseline */}
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey={() => 0} 
            name="Baseline (0°C)" 
            stroke="#94a3b8" 
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}