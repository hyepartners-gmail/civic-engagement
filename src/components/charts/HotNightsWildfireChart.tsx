"use client";
import { useMemo } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { isHighPercentile } from '@/lib/selectors/extremes';

interface HotNightsWildfireChartProps {
  warmNightsData: { year: number; nights: number | null }[];
  wildfireData: { year: number; acres: number | null }[];
  femaData: { year: number; events: number | null }[];
  threshold: number;
  wildfireScope: 'national' | 'state';
}

export default function HotNightsWildfireChart({ 
  warmNightsData, 
  wildfireData, 
  femaData, 
  threshold,
  wildfireScope
}: HotNightsWildfireChartProps) {
  // Check if we have any data to display
  const hasData = useMemo(() => {
    return warmNightsData.length > 0 || wildfireData.length > 0 || femaData.length > 0;
  }, [warmNightsData, wildfireData, femaData]);

  // If no data at all, show a message
  if (!hasData) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center bg-gray-100 bg-opacity-10 rounded-lg p-4">
        <p className="text-lg font-medium text-platform-text/70 mb-2">No data available</p>
        <p className="text-sm text-platform-text/50 max-w-md text-center">
          No wildfire or warm nights data is available for this selection. Try changing the location or threshold settings.
        </p>
      </div>
    );
  }

  // Align all data series by year
  const alignedData = useMemo(() => {
    const years = new Set<number>();
    
    warmNightsData.forEach(d => years.add(d.year));
    wildfireData.forEach(d => years.add(d.year));
    femaData.forEach(d => years.add(d.year));
    
    return Array.from(years).sort().map(year => ({
      year,
      nights: warmNightsData.find(d => d.year === year)?.nights ?? null,
      acres: wildfireData.find(d => d.year === year)?.acres ?? null,
      events: femaData.find(d => d.year === year)?.events ?? null,
    }));
  }, [warmNightsData, wildfireData, femaData]);

  // Check if any warm night value is in high percentile
  const hasHighPercentile = useMemo(() => {
    return warmNightsData.some(d => 
      d.nights !== null && isHighPercentile(
        warmNightsData
          .filter(item => item.nights !== null)
          .map(item => [item.year, item.nights] as [number, number | null]), 
        d.nights
      )
    );
  }, [warmNightsData]);

  // Filter out null values for display
  const displayData = useMemo(() => {
    return alignedData.filter(d => 
      d.nights !== null || d.acres !== null || (d.events !== null && d.events > 0)
    );
  }, [alignedData]);

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
            tick={{ fontSize: 12 }}
            label={{ 
              value: `Nights ≥ ${threshold}°F`, 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'Acres Burned', 
              angle: 90, 
              position: 'insideRight' 
            }}
          />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'nights') {
                return [Number(value).toFixed(0), 'nights'];
              } else if (name === 'acres') {
                return [Number(value).toLocaleString(), 'acres'];
              } else if (name === 'events') {
                return [Number(value).toFixed(0), 'events'];
              }
              return [String(value), ''];
            }}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Legend />
          <Area 
            yAxisId="right"
            type="monotone" 
            dataKey="acres" 
            name={`${wildfireScope === 'national' ? 'National' : 'State'} Wildfire Acres`} 
            stroke="#dc2626" 
            fill="#dc2626" 
            fillOpacity={0.3}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="nights" 
            name={`Nights ≥ ${threshold}°F`} 
            stroke={hasHighPercentile ? "#f97316" : "#ef4444"} 
            strokeWidth={hasHighPercentile ? 3 : 2}
            dot={{ r: 4, fill: hasHighPercentile ? '#f97316' : '#ef4444' }}
            activeDot={{ r: 6, fill: hasHighPercentile ? '#f97316' : '#ef4444' }}
          />
          {femaData.length > 0 && (
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="events" 
              name="FEMA Heat Events" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ r: 3, fill: '#8b5cf6' }}
              activeDot={{ r: 5, fill: '#8b5cf6' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      
      {hasHighPercentile && (
        <div className="mt-4 p-3 bg-orange-100 border-l-4 border-orange-500 text-orange-700">
          <p className="font-semibold">Health Alert:</p>
          <p>Warm night counts are in the 90th percentile or higher compared to historical baselines, indicating increased health risks.</p>
        </div>
      )}
    </div>
  );
}