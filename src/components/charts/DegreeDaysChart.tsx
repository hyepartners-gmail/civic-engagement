"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { calculateRollingAverage } from "@/lib/time/rolling";

interface DegreeDaysChartProps {
  data: { year: number; hdd: number | null; cdd: number | null }[];
  showHdd: boolean;
  showCdd: boolean;
  smoothing: boolean;
}

export default function DegreeDaysChart({ data, showHdd, showCdd, smoothing }: DegreeDaysChartProps) {
  // Process data with smoothing if requested
  const processedData = useMemo(() => {
    if (!smoothing) return data;
    
    let smoothedData = [...data];
    
    if (showHdd) {
      const hddSeries: [number, number | null][] = data.map(d => [d.year, d.hdd]);
      const smoothedHdd = calculateRollingAverage(hddSeries, 10);
      smoothedData = smoothedData.map((d, i) => ({
        ...d,
        hdd: smoothedHdd[i]?.[1] ?? d.hdd
      }));
    }
    
    if (showCdd) {
      const cddSeries: [number, number | null][] = data.map(d => [d.year, d.cdd]);
      const smoothedCdd = calculateRollingAverage(cddSeries, 10);
      smoothedData = smoothedData.map((d, i) => ({
        ...d,
        cdd: smoothedCdd[i]?.[1] ?? d.cdd
      }));
    }
    
    return smoothedData;
  }, [data, showHdd, showCdd, smoothing]);

  // Filter data to only include years with data for visible series
  const filteredData = useMemo(() => {
    return processedData.filter(item => 
      (showHdd && item.hdd !== null) || 
      (showCdd && item.cdd !== null)
    );
  }, [processedData, showHdd, showCdd]);

  // Custom tooltip formatter
  const formatValue = (value: number | null) => {
    if (value === null) return "No data";
    return `${value.toFixed(0)} °F·day`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-platform-card-background p-4 border border-platform-contrast rounded-lg shadow-lg">
          <p className="font-semibold text-platform-text">{`Year: ${label}`}</p>
          {showHdd && payload.find((p: any) => p.dataKey === "hdd") && (
            <p className="text-red-400">{`Heat On Cold Days (HDD): ${formatValue(payload.find((p: any) => p.dataKey === "hdd").value)}`}</p>
          )}
          {showCdd && payload.find((p: any) => p.dataKey === "cdd") && (
            <p className="text-blue-400">{`Cooling on Hot Days (CDD): ${formatValue(payload.find((p: any) => p.dataKey === "cdd").value)}`}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={filteredData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="year" 
            tick={{ fill: '#fff' }}
            tickCount={10}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fill: '#fff' }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={40}
            formatter={(value) => {
              if (value === "hdd") return "Heat On Cold Days (HDD)";
              if (value === "cdd") return "Cooling on Hot Days (CDD)";
              return value;
            }}
          />
          {showHdd && (
            <Line
              type="monotone"
              dataKey="hdd"
              name="hdd"
              stroke="#f87171"
              strokeWidth={2}
              dot={{ r: 2, fill: "#f87171" }}
              activeDot={{ r: 4, fill: "#f87171" }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {showCdd && (
            <Line
              type="monotone"
              dataKey="cdd"
              name="cdd"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={{ r: 2, fill: "#60a5fa" }}
              activeDot={{ r: 4, fill: "#60a5fa" }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}