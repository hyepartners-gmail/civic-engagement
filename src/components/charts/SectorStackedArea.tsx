'use client';
import { Recession } from '@/types/employment';
import { useChartReady } from '@/hooks/useChartReady';
import dynamic from 'next/dynamic';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary';
import { colors } from '@/lib/theme';
import { SECTORS } from '@/lib/employment/narratives';

// Dynamically import ResponsiveLine to ensure it's only loaded on the client side
const ResponsiveLine = dynamic(
  () => import('@nivo/line').then(mod => {
    if (!mod || !mod.ResponsiveLine) {
      throw new Error('Failed to load ResponsiveLine component');
    }
    return mod.ResponsiveLine;
  }).catch(error => {
    console.error('Error loading ResponsiveLine:', error);
    // Return a fallback component
    return () => <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">Chart unavailable</p>
        <p className="text-xs text-platform-text/50 mt-1">Unable to load line chart component</p>
      </div>
    </div>;
  }),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
  }
);

interface SectorStackedAreaProps {
  series: { id: string; data: { x: Date; y: number; }[] }[];
  recessions: Recession[];
  activeSector: string | null;
}

const theme = {
  axis: {
    ticks: { text: { fill: '#ffffff', fontSize: 10 } },
    legend: { text: { fill: '#ffffff', fontSize: 12, fontWeight: 500 } },
  },
  grid: { line: { stroke: 'rgba(255, 255, 255, 0.1)' } },
  tooltip: {
    container: {
      background: '#000000',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: 'bold',
      borderRadius: '6px',
      boxShadow: '0 0 12px rgba(255, 255, 255, 0.5)',
      border: '2px solid rgba(255, 255, 255, 0.4)',
      padding: '12px'
    },
  },
};

export default function SectorStackedArea({ series, recessions, activeSector }: SectorStackedAreaProps) {
  const filteredSeries = activeSector ? series.filter(s => s.id === activeSector) : series;
  const isChartReady = useChartReady([series, recessions]);

  // Create a color map based on SECTORS
  const colorMap: Record<string, string> = {};
  SECTORS.forEach(sector => {
    colorMap[sector.name] = sector.color;
  });
  console.log('Using color map for sectors:', colorMap);

  // Custom color function for the chart
  const getColor = (series: any) => {
    const color = colorMap[series.id] || '#cccccc';
    return color; // Fallback color if not found
  };

  if (!isChartReady) {
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  // Check if we have valid data
  if (!series || series.length === 0) {
    return <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">Chart unavailable</p>
        <p className="text-xs text-platform-text/50 mt-1">Missing required data</p>
      </div>
    </div>;
  }

  // Filter out invalid recession data to prevent negative rectangle dimensions
  const validRecessions = (recessions || []).filter(r => {
    const startDate = new Date(r.start);
    const endDate = new Date(r.end);
    return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate >= startDate;
  });

  // Additional validation for series data
  const validSeries = filteredSeries.map(series => {
    console.log(`Processing series ${series.id}, data length: ${series.data?.length || 0}`);
    if (series.data.length > 0) {
      console.log(`Sample data for ${series.id}:`, series.data.slice(0, 2));
    }
    
    return {
      ...series,
      data: series.data.filter(d => {
        const isValid = d && d.x instanceof Date && 
          !isNaN(d.x.getTime()) && 
          typeof d.y === 'number' && 
          !isNaN(d.y) && 
          d.y >= 0;
        
        if (!isValid && d) {
          console.log(`Filtering out invalid data point from ${series.id}`);
        }
        
        return isValid;
      })
    };
  }).filter(series => {
    const hasData = series.data.length > 0;
    if (!hasData) {
      console.log(`Series ${series.id} has no valid data points after filtering`);
    }
    return hasData;
  });

  // Check if we have any valid data points
  const hasValidData = validSeries.some(s => s.data && s.data.length > 0);
  
  if (!hasValidData) {
    return <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">No data available</p>
        <p className="text-xs text-platform-text/50 mt-1">No valid data points to display</p>
      </div>
    </div>;
  }

  return (
    <div className="h-full w-full absolute inset-0">
      <ChartErrorBoundary>
        <ResponsiveLine
          data={validSeries}
          margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
          xScale={{ type: 'time' as const, useUTC: false, precision: 'year' as const }}
          yScale={{
            type: 'linear' as const,
            stacked: true,
            min: 0 as const,
            max: 1 as const,
            reverse: false
          }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            format: '%Y',
            tickValues: 'every 10 years',
            legend: 'Year',
            legendOffset: 36,
            legendPosition: 'middle',
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Share of Employment',
            legendOffset: -50,
            legendPosition: 'middle',
            format: '.0%',
          }}
          enableGridX={false}
          colors={getColor}
          enableArea={true}
          areaOpacity={0.85} // Slightly reduced opacity for better distinction
          areaBaselineValue={0}
          curve="monotoneX"
          enablePointLabel={false}
          lineWidth={2.5} // Thicker lines to create better borders between colors
          enablePoints={false}
          useMesh={true}
          defs={[
            // Add neon glow filters
            {
              id: 'glow',
              type: 'filter',
              filters: [
                { type: 'blur', passes: 2, width: 6, height: 6 },
              ],
            },
          ]}
          fill={[
            { match: '*', id: 'glow' },
          ]}
          legends={[
            {
              anchor: 'top-right',
              direction: 'column',
              justify: false,
              translateX: 0,
              translateY: 0,
              itemsSpacing: 12, // Increased spacing between items
              itemDirection: 'left-to-right',
              itemWidth: 140, // Wider items for better text spacing
              itemHeight: 28, // Taller items for better visibility
              itemOpacity: 1,
              symbolSize: 20, // Larger symbols for better visibility
              symbolShape: 'circle',
              symbolBorderWidth: 2, // Add border to symbols
              symbolBorderColor: 'rgba(255, 255, 255, 0.8)',
              itemTextColor: '#ffffff',
              itemBackground: 'rgba(0, 0, 0, 0.3)', // Add background to each item for better readability
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemBackground: 'rgba(255, 255, 255, 0.2)',
                    itemOpacity: 1,
                    itemTextColor: '#ffffff',
                    symbolSize: 18
                  }
                }
              ]
            }
          ]}
          motionConfig="gentle"
          theme={theme}
          layers={['grid', 'axes', 'areas', 'lines', 'slices', 'points', 'legends', ({ xScale, yScale, innerHeight, innerWidth, ...props }: any) => {
            // Ensure xScale and yScale are valid functions
            if (typeof xScale !== 'function' || typeof yScale !== 'function') {
              return null;
            }
            
            // Ensure we have valid dimensions
            const height = innerHeight || props.height || 400;
            const width = innerWidth || props.width || 600;
            
            if (height <= 0 || width <= 0) {
              return null;
            }
            
            console.log('[SectorStackedArea] Rendering recession layers. Valid Recessions:', validRecessions); // Log validRecessions
            return (
              <g>
                {validRecessions.map((r, i) => {
                  const startDate = new Date(r.start);
                  const endDate = new Date(r.end);
                  
                  // Check if dates are valid
                  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    console.warn(`[SectorStackedArea] Invalid date for recession ${i}: start=${r.start}, end=${r.end}`);
                    return null;
                  }
                  
                  try {
                    const xStart = xScale(startDate);
                    const xEnd = xScale(endDate);
                    
                    // Ensure coordinates are valid numbers
                    if (typeof xStart !== 'number' || typeof xEnd !== 'number' || isNaN(xStart) || isNaN(xEnd)) {
                      console.warn(`[SectorStackedArea] Invalid x-coordinates for recession ${i}: xStart=${xStart}, xEnd=${xEnd}`);
                      return null;
                    }
                    
                    const rectWidth = Math.max(0, xEnd - xStart); // Ensure non-negative width
                    const rectHeight = Math.max(0, height);
                    
                    console.log(`[SectorStackedArea] Recession ${i}: start=${r.start}, end=${r.end}, xStart=${xStart}, xEnd=${xEnd}, rectWidth=${rectWidth}, rectHeight=${rectHeight}`);
                    
                    // Only render if width is positive
                    if (rectWidth <= 0 || rectHeight <= 0) {
                      console.warn(`[SectorStackedArea] Skipping recession ${i} due to invalid dimensions: width=${rectWidth}, height=${rectHeight}`);
                      return null;
                    }
                    
                    return (
                      <rect
                        key={i}
                        x={xStart}
                        y={0}
                        width={rectWidth}
                        height={rectHeight}
                        fill="rgba(255, 255, 255, 0.15)"
                        stroke="rgba(255, 255, 255, 0.3)"
                        strokeWidth={1}
                      />
                    );
                  } catch (error) {
                    // If there's an error in scaling, skip this recession
                    console.warn(`[SectorStackedArea] Error rendering recession rectangle for ${r.start}-${r.end}:`, error);
                    return null;
                  }
                })}
              </g>
            );
          }]}
        />
      </ChartErrorBoundary>
    </div>
  );
}