"use client";
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DegreeBarsStackedProps {
  data: { year: number; hdd: number | null; cdd: number | null }[];
  showHdd: boolean;
  showCdd: boolean;
}

export default function DegreeBarsStacked({ data, showHdd, showCdd }: DegreeBarsStackedProps) {
  // Filter and prepare data based on visibility settings
  const filteredData = useMemo(() => {
    return data.map(item => ({
      year: item.year,
      hdd: showHdd ? item.hdd : null,
      cdd: showCdd ? item.cdd : null,
    })).filter(item => 
      (showHdd && item.hdd !== null) || 
      (showCdd && item.cdd !== null)
    );
  }, [data, showHdd, showCdd]);

  // Calculate domain dynamically based on visible data
  const yDomain = useMemo(() => {
    if (filteredData.length === 0) return [0, 100];
    
    const values = filteredData.flatMap(item => [
      item.hdd ?? 0,
      item.cdd ?? 0
    ]).filter(val => val !== null) as number[];
    
    if (values.length === 0) return [0, 100];
    
    const max = Math.max(...values);
    return [0, max * 1.1]; // Add 10% padding
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
          />
          <Tooltip 
            formatter={(value) => [Number(value).toFixed(1), 'Degree Days']}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Legend />
          {showHdd && (
            <Bar 
              dataKey="hdd" 
              name="Heat On Cold Days (HDD)" 
              fill="#ef4444" 
              stackId="a" 
            />
          )}
          {showCdd && (
            <Bar 
              dataKey="cdd" 
              name="Cooling on Hot Days (CDD)" 
              fill="#3b82f6" 
              stackId="a" 
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}