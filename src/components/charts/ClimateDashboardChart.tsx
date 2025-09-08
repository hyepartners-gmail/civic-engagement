"use client";

import { useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { Card } from "../shared/Card";
import { colors } from '@/lib/theme';

interface ClimateDataPoint {
  year: number;
  anomaly: number | null;
  co2: number | null;
  disasters: number | null;
  acres: number | null;
}

interface ClimateDashboardChartProps {
  data: ClimateDataPoint[];
}

export default function ClimateDashboardChart({ data }: ClimateDashboardChartProps) {
  const [visibleMetrics, setVisibleMetrics] = useState({
    anomaly: true,
    co2: true,
    disasters: true,
    acres: true,
  });

  // Transform data for each metric
  const anomalyData = data
    .filter(d => d.anomaly !== null)
    .map(d => ({ x: d.year, y: d.anomaly })) as { x: number; y: number }[];

  const co2Data = data
    .filter(d => d.co2 !== null)
    .map(d => ({ x: d.year, y: d.co2 })) as { x: number; y: number }[];

  const disastersData = data
    .filter(d => d.disasters !== null)
    .map(d => ({ x: d.year, y: d.disasters })) as { x: number; y: number }[];

  const acresData = data
    .filter(d => d.acres !== null)
    .map(d => ({ x: d.year, y: d.acres })) as { x: number; y: number }[];

  // Create series data for the chart
  const seriesData = [];
  
  if (visibleMetrics.anomaly) {
    seriesData.push({
      id: "Temperature Anomaly (°C)",
      data: anomalyData,
      color: "hsl(200, 70%, 50%)",
    });
  }
  
  if (visibleMetrics.co2) {
    seriesData.push({
      id: "CO₂ Emissions",
      data: co2Data,
      color: "hsl(120, 70%, 50%)",
    });
  }
  
  if (visibleMetrics.disasters) {
    seriesData.push({
      id: "Disaster Counts",
      data: disastersData,
      color: "hsl(340, 70%, 50%)",
    });
  }
  
  if (visibleMetrics.acres) {
    seriesData.push({
      id: "Acres Burned",
      data: acresData,
      color: "hsl(20, 70%, 50%)",
    });
  }

  const commonProps = {
    margin: { top: 50, right: 110, bottom: 50, left: 60 },
    xScale: {
      type: "linear" as const,
      min: "auto" as const,
      max: "auto" as const,
    },
    yScale: {
      type: "linear" as const,
      min: "auto" as const,
      max: "auto" as const,
      stacked: false,
    },
    axisBottom: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: "Year",
      legendOffset: 36,
      legendPosition: "middle" as const,
    },
    colors: { scheme: "nivo" as const },
    enablePointLabel: false,
    pointSize: 6,
    pointColor: { theme: "background" },
    pointBorderWidth: 2,
    pointBorderColor: { from: "serieColor" },
    pointLabel: "y",
    pointLabelYOffset: -12,
    enableSlices: "x" as const,
    useMesh: true,
    legends: [
      {
        anchor: "bottom-right" as const,
        direction: "column" as const,
        justify: false,
        translateX: 100,
        translateY: 0,
        itemsSpacing: 0,
        itemDirection: "left-to-right" as const,
        itemWidth: 80,
        itemHeight: 20,
        itemOpacity: 0.75,
        symbolSize: 12,
        symbolShape: "circle" as const,
        symbolBorderColor: "rgba(0, 0, 0, .5)",
        effects: [
          {
            on: "hover" as const,
            style: {
              itemBackground: "rgba(0, 0, 0, .03)",
              itemOpacity: 1,
            },
          },
        ],
      },
    ],
    theme: {
      axis: { 
        ticks: { 
          text: { 
            fill: colors.platform.text, 
            fontSize: 10 
          }
        },
        legend: { 
          text: { 
            fill: colors.platform.text, 
            fontSize: 12 
          } 
        } 
      },
      grid: { 
        line: { 
          stroke: colors.platform.contrast, 
          strokeWidth: 1 
        } 
      },
      tooltip: { 
        container: { 
          background: colors.platform.contrast, 
          color: colors.platform.text, 
          fontSize: '12px' 
        } 
      },
    },
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-platform-text text-lg font-medium">
          Climate Dashboard
        </h3>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center text-platform-text text-sm">
            <input
              type="checkbox"
              checked={visibleMetrics.anomaly}
              onChange={(e) => setVisibleMetrics({ ...visibleMetrics, anomaly: e.target.checked })}
              className="mr-1 rounded text-platform-primary focus:ring-platform-primary"
            />
            Temp Anomaly
          </label>
          <label className="flex items-center text-platform-text text-sm">
            <input
              type="checkbox"
              checked={visibleMetrics.co2}
              onChange={(e) => setVisibleMetrics({ ...visibleMetrics, co2: e.target.checked })}
              className="mr-1 rounded text-platform-primary focus:ring-platform-primary"
            />
            CO₂ Emissions
          </label>
          <label className="flex items-center text-platform-text text-sm">
            <input
              type="checkbox"
              checked={visibleMetrics.disasters}
              onChange={(e) => setVisibleMetrics({ ...visibleMetrics, disasters: e.target.checked })}
              className="mr-1 rounded text-platform-primary focus:ring-platform-primary"
            />
            Disasters
          </label>
          <label className="flex items-center text-platform-text text-sm">
            <input
              type="checkbox"
              checked={visibleMetrics.acres}
              onChange={(e) => setVisibleMetrics({ ...visibleMetrics, acres: e.target.checked })}
              className="mr-1 rounded text-platform-primary focus:ring-platform-primary"
            />
            Wildfire Acres
          </label>
        </div>
      </div>
      <Card className="flex-1 p-4">
        <div className="h-96">
          <ResponsiveLine
            {...commonProps}
            data={seriesData}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: "Values",
              legendOffset: -50,
              legendPosition: "middle",
            }}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-platform-contrast/50 p-3 rounded">
            <h4 className="text-platform-text font-medium">Temperature Anomaly</h4>
            <p className="text-platform-text/80 text-sm">Global/National temperature deviation from baseline</p>
          </div>
          <div className="bg-platform-contrast/50 p-3 rounded">
            <h4 className="text-platform-text font-medium">CO₂ Emissions</h4>
            <p className="text-platform-text/80 text-sm">National carbon dioxide emissions</p>
          </div>
          <div className="bg-platform-contrast/50 p-3 rounded">
            <h4 className="text-platform-text font-medium">Disaster Counts</h4>
            <p className="text-platform-text/80 text-sm">Frequency of climate-related disasters</p>
          </div>
          <div className="bg-platform-contrast/50 p-3 rounded">
            <h4 className="text-platform-text font-medium">Wildfire Acres</h4>
            <p className="text-platform-text/80 text-sm">Total acres burned by wildfires annually</p>
          </div>
        </div>
      </Card>
    </div>
  );
}