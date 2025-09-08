"use client";

import { useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { Card } from "../shared/Card";
import { colors } from '@/lib/theme';

interface WildfireTrendsChartProps {
  data: {
    acres: { x: number; y: number | null }[];
    counts: { x: number; y: number | null }[];
  };
}

export default function WildfireTrendsChart({ data }: WildfireTrendsChartProps) {
  const [syncY, setSyncY] = useState(true);

  // Filter out null values
  const filteredAcres = data.acres.filter(d => d.y !== null);
  const filteredCounts = data.counts.filter(d => d.y !== null);

  // Determine min and max values for synchronized Y axis
  const acresYValues = filteredAcres.map(d => d.y as number);
  const countsYValues = filteredCounts.map(d => d.y as number);
  
  const acresMin = Math.min(...acresYValues);
  const acresMax = Math.max(...acresYValues);
  const countsMin = Math.min(...countsYValues);
  const countsMax = Math.max(...countsYValues);
  
  // Add some padding
  const acresPadding = (acresMax - acresMin) * 0.1;
  const countsPadding = (countsMax - countsMin) * 0.1;
  
  const acresYMin = syncY ? acresMin - acresPadding : undefined;
  const acresYMax = syncY ? acresMax + acresPadding : undefined;
  const countsYMin = syncY ? countsMin - countsPadding : undefined;
  const countsYMax = syncY ? countsMax + countsPadding : undefined;

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
    colors: { scheme: "category10" as const },
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

  const acresData = [
    {
      id: "Acres Burned",
      data: filteredAcres,
    },
  ];

  const countsData = [
    {
      id: "Fire Counts",
      data: filteredCounts,
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-platform-text text-lg font-medium">
          Wildfire Trends: Acres Burned vs. Fire Counts
        </h3>
        <div className="flex items-center space-x-2">
          <label htmlFor="sync-y" className="text-platform-text text-sm">
            Sync Y-Axis
          </label>
          <input
            id="sync-y"
            type="checkbox"
            checked={syncY}
            onChange={(e) => setSyncY(e.target.checked)}
            className="rounded text-platform-primary focus:ring-platform-primary"
          />
        </div>
      </div>
      <Card className="flex-1 p-4">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80">
            <ResponsiveLine
              {...commonProps}
              data={acresData}
              yScale={{
                type: "linear",
                min: acresYMin,
                max: acresYMax,
                stacked: false,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Acres Burned",
                legendOffset: -50,
                legendPosition: "middle" as const,
              }}
            />
          </div>
          <div className="h-80">
            <ResponsiveLine
              {...commonProps}
              data={countsData}
              yScale={{
                type: "linear",
                min: countsYMin,
                max: countsYMax,
                stacked: false,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Fire Counts",
                legendOffset: -50,
                legendPosition: "middle" as const,
              }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}