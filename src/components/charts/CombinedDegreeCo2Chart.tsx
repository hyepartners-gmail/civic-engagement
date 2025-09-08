"use client";
import { useState, useMemo, useRef } from 'react';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CombinedDegreeCo2ChartProps {
  data: { 
    year: number; 
    hdd: number | null; 
    cdd: number | null; 
    co2: number | null;
  }[];
  showHdd: boolean;
  showCdd: boolean;
  perCapita: boolean;
  normalize: boolean;
}

export default function CombinedDegreeCo2Chart({ 
  data, 
  showHdd, 
  showCdd, 
  perCapita, 
  normalize 
}: CombinedDegreeCo2ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Normalize data if requested
  const processedData = useMemo(() => {
    if (!normalize) return data;
    
    // Find max values for normalization
    const hddMax = Math.max(...data.map(d => d.hdd ?? 0));
    const cddMax = Math.max(...data.map(d => d.cdd ?? 0));
    const co2Max = Math.max(...data.map(d => d.co2 ?? 0));
    
    return data.map(item => ({
      ...item,
      hdd: hddMax > 0 ? ((item.hdd ?? 0) / hddMax) * 100 : 0,
      cdd: cddMax > 0 ? ((item.cdd ?? 0) / cddMax) * 100 : 0,
      co2: co2Max > 0 ? ((item.co2 ?? 0) / co2Max) * 100 : 0,
    }));
  }, [data, normalize]);

  // Filter and prepare data based on visibility settings
  const filteredData = useMemo(() => {
    console.log('Filtering data:', processedData);
    const result = processedData.filter(item => 
      (showHdd && item.hdd !== null) || 
      (showCdd && item.cdd !== null) ||
      (item.co2 !== null)
    );
    console.log('Filtered data:', result);
    return result;
  }, [processedData, showHdd, showCdd]);

  // Calculate domains dynamically
  const yDomainLeft = useMemo(() => {
    if (filteredData.length === 0) {
      console.log('Empty filtered data, returning default domain [0, 100]');
      return [0, 100];
    }
    
    const degreeValues = filteredData.flatMap(item => [
      showHdd ? (item.hdd ?? 0) : 0,
      showCdd ? (item.cdd ?? 0) : 0
    ]).filter(val => val !== null) as number[];
    
    console.log('Degree values for left axis:', degreeValues);
    
    if (degreeValues.length === 0) {
      console.log('No degree values, returning default domain [0, 100]');
      return [0, 100];
    }
    
    const min = Math.min(...degreeValues);
    const max = Math.max(...degreeValues);
    const range = max - min;
    console.log('Left axis domain:', [min - range * 0.1, max + range * 0.1]);
    return [min - range * 0.1, max + range * 0.1]; // Add 10% padding
  }, [filteredData, showHdd, showCdd]);

  const yDomainRight = useMemo(() => {
    if (filteredData.length === 0) {
      console.log('Empty filtered data, returning default domain [0, 100]');
      return [0, 100];
    }
    
    const co2Values = filteredData
      .map(item => item.co2)
      .filter((val): val is number => val !== null);
    
    console.log('CO2 values for right axis:', co2Values);
    
    if (co2Values.length === 0) {
      console.log('No CO2 values, returning default domain [0, 100]');
      return [0, 100];
    }
    
    const min = Math.min(...co2Values);
    const max = Math.max(...co2Values);
    const range = max - min;
    console.log('Right axis domain:', [min - range * 0.1, max + range * 0.1]);
    return [min - range * 0.1, max + range * 0.1]; // Add 10% padding
  }, [filteredData]);

  // Custom tooltip formatter
  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'co2') {
      return [Number(value).toFixed(normalize ? 1 : 2), normalize ? '%' : (perCapita ? 'tons/capita' : 'million tons')];
    }
    return [Number(value).toFixed(1), normalize ? '%' : 'degree days'];
  };

  // Accessibility: Focus management
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && chartRef.current) {
      // Allow normal tab behavior
      return;
    }
    
    // Custom keyboard navigation could be added here
    // For example, arrow keys to navigate between data points
  };

  return (
    <div 
      ref={chartRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="img"
      aria-label={`Degree Days and CO2 Emissions Chart. Showing ${showHdd ? 'Heat On Cold Days (HDD)' : ''} ${showHdd && showCdd ? 'and' : ''} ${showCdd ? 'Cooling on Hot Days (CDD)' : ''} with CO2 Emissions ${perCapita ? 'per capita' : 'total'}`}
      className="w-full h-96 focus:outline-none"
    >
      {/* Offscreen description for screen readers */}
      <div className="sr-only">
        <p>
          This chart shows Heat On Cold Days (HDD) in red bars at the bottom, 
          Cooling on Hot Days (CDD) in blue bars stacked on top of HDD, 
          and CO2 Emissions as a green line on the right axis.
        </p>
        <p>
          HDD represents the demand for heating, CDD represents the demand for cooling,
          and CO2 Emissions show the carbon output from energy generation.
        </p>
        <p>
          Use the legend chips to toggle visibility of HDD and CDD bars.
          Use the per capita toggle to switch between total and per capita CO2 emissions.
          Use the normalize view switch to see percentage changes over time.
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={filteredData}
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
            domain={yDomainLeft}
            tick={{ fontSize: 12 }}
            label={{ 
              value: normalize ? 'Degree Days (%)' : 'Degree Days', 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={yDomainRight}
            tick={{ fontSize: 12 }}
            label={{ 
              value: normalize ? 'CO₂ (%)' : (perCapita ? 'CO₂ (tons/capita)' : 'CO₂ (million tons)'), 
              angle: 90, 
              position: 'insideRight' 
            }}
          />
          <Tooltip 
            formatter={formatTooltipValue}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Legend />
          {showHdd && (
            <Bar 
              yAxisId="left"
              dataKey="hdd" 
              name="Heat On Cold Days (HDD)" 
              fill="#ef4444" 
              stackId="a" 
              tabIndex={0}
              role="img"
              aria-label="Heat On Cold Days (HDD) bars"
            />
          )}
          {showCdd && (
            <Bar 
              yAxisId="left"
              dataKey="cdd" 
              name="Cooling on Hot Days (CDD)" 
              fill="#3b82f6" 
              stackId="a" 
              tabIndex={0}
              role="img"
              aria-label="Cooling on Hot Days (CDD) bars"
            />
          )}
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="co2" 
            name="CO₂ Emissions" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ r: 4, tabIndex: 0 }}
            activeDot={{ r: 6, tabIndex: 0 }}
            role="img"
            aria-label="CO2 Emissions line"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}