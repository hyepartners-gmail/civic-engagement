import React, { useState } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { colors } from '@/lib/theme';

interface DualAxisLineProps {
  data: {
    left: {
      id: string;
      data: { x: number; y: number | null }[];
    };
    right: {
      id: string;
      data: { x: number; y: number | null }[];
    };
  };
  leftAxisLegend?: string;
  rightAxisLegend?: string;
  onYearHover?: (year: number | null) => void;
}

export default function DualAxisLine({ data, leftAxisLegend, rightAxisLegend, onYearHover }: DualAxisLineProps) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  // Filter out null values
  const leftData = data.left.data.filter(d => d.y !== null && d.y !== undefined);
  const rightData = data.right.data.filter(d => d.y !== null && d.y !== undefined);

  // Check if we have enough data to render the chart
  const hasLeftData = leftData.length > 0;
  const hasRightData = rightData.length > 0;

  // If we don't have enough data, render an empty state
  if (!hasLeftData && !hasRightData) {
    return (
      <div className="h-80 flex items-center justify-center">
        <p className="text-platform-text/70">No data available for the selected parameters.</p>
      </div>
    );
  }

  // Get min/max for each axis with safeguards
  const leftMin = hasLeftData ? Math.min(...leftData.map(d => d.y as number)) : 0;
  const leftMax = hasLeftData ? Math.max(...leftData.map(d => d.y as number)) : 100;
  const rightMin = hasRightData ? Math.min(...rightData.map(d => d.y as number)) : 0;
  const rightMax = hasRightData ? Math.max(...rightData.map(d => d.y as number)) : 100;

  // Calculate range for each axis with protection against division by zero
  const leftRange = leftMax - leftMin || 1; // Use 1 if range is 0
  const rightRange = rightMax - rightMin || 1; // Use 1 if range is 0

  // Normalize data to 0-100 scale for overlay with safety checks
  const normalizedLeft = hasLeftData ? leftData.map(d => ({
    x: d.x,
    y: ((d.y as number - leftMin) / leftRange) * 100
  })) : [];

  const normalizedRight = hasRightData ? rightData.map(d => ({
    x: d.x,
    y: ((d.y as number - rightMin) / rightRange) * 100
  })) : [];

  // Create chart data with safety checks
  const chartData: { id: string; data: { x: number; y: number }[]; color: string }[] = [];
  
  if (hasLeftData) {
    chartData.push({
      id: data.left.id,
      data: normalizedLeft,
      color: colors.semantic.info
    });
  }
  
  if (hasRightData) {
    chartData.push({
      id: data.right.id,
      data: normalizedRight,
      color: colors.semantic.error
    });
  }

  // Find data points for the hovered year
  const hoveredLeftPoint = hoveredYear && hasLeftData
    ? leftData.find(d => d.x === hoveredYear)
    : null;
    
  const hoveredRightPoint = hoveredYear && hasRightData
    ? rightData.find(d => d.x === hoveredYear)
    : null;

  // Handle mouse move for tooltip
  const handleMouseMove = (data: any) => {
    if (data && data.index !== undefined && chartData.length > 0 && chartData[0].data.length > data.index) {
      const year = chartData[0].data[data.index]?.x;
      setHoveredYear(year || null);
      if (onYearHover) onYearHover(year || null);
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredYear(null);
    if (onYearHover) onYearHover(null);
  };

  // Define chart theme with white text for better visibility
  const chartTheme = {
    axis: {
      ticks: {
        text: {
          fill: colors.platform.text, // White text
          fontSize: 10
        }
      },
      legend: {
        text: {
          fill: colors.platform.text, // White text
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
    legends: {
      text: {
        fill: colors.platform.text // White text for legend
      }
    }
  };

  return (
    <div className="h-80 relative">
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 60, bottom: 60, left: 60 }}
        xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        yScale={{ type: 'linear', min: 0, max: 100 }}
        axisTop={null}
        axisRight={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: rightAxisLegend,
          legendOffset: 40,
          legendPosition: 'middle'
        }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Year',
          legendOffset: 40,
          legendPosition: 'middle'
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: leftAxisLegend,
          legendOffset: -40,
          legendPosition: 'middle'
        }}
        colors={{ scheme: 'nivo' }}
        pointSize={6}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh={true}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        theme={chartTheme}
        enableSlices={false}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        tooltip={({ point }) => {
          const year = point.data.x;
          const leftPoint = leftData.find(d => d.x === year);
          const rightPoint = rightData.find(d => d.x === year);
          
          return (
            <div className="bg-platform-background border border-platform-contrast rounded-lg p-3 shadow-lg">
              <div className="text-platform-text font-semibold mb-1">{year}</div>
              <div className="flex flex-col gap-1">
                {leftPoint && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.semantic.info }}></div>
                    <span className="text-sm">{data.left.id}:</span>
                    <span className="text-sm font-medium">{leftPoint.y?.toFixed(2) || 'N/A'}</span>
                  </div>
                )}
                {rightPoint && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.semantic.error }}></div>
                    <span className="text-sm">{data.right.id}:</span>
                    <span className="text-sm font-medium">{rightPoint.y?.toFixed(2) || 'N/A'}</span>
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />
      
      {/* Highlight marker for hovered year */}
      {hoveredYear && (
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white/50 pointer-events-none"
          style={{ left: '50px' }} // Approximate position, would need more precise calculation
        />
      )}
    </div>
  );
}
