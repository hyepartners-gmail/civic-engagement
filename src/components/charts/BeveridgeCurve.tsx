"use client";
import { useState, useEffect, useRef } from 'react';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import ChartErrorBoundary from './ChartErrorBoundary';
import dynamic from 'next/dynamic';

// Dynamically import the scatterplot component with error handling
const ResponsiveScatterPlot = dynamic(
  () => import('@nivo/scatterplot').then(mod => mod.ResponsiveScatterPlot),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />,
    // Add error handling
    suspense: false
  }
);

interface BeveridgeCurveProps {
  data: { fy: number; ur: number; openings: number }[];
  anomalies: number[];
}

export default function BeveridgeCurve({ data, anomalies }: BeveridgeCurveProps) {
  const [isRendered, setIsRendered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use a more robust approach to ensure the component only renders after DOM is ready
  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame to ensure DOM is fully ready
      const frame = requestAnimationFrame(() => {
        setIsRendered(true);
      });
      
      return () => {
        cancelAnimationFrame(frame);
      };
    }
  }, []);

  // Additional check to ensure we have valid data before rendering
  if (!data || data.length === 0) {
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  // Don't render the chart until we're sure the DOM is ready
  if (!isRendered) {
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  const chartData = [{
    id: 'Fiscal Years',
    data: data.map(d => ({ 
      x: d.ur, 
      y: d.openings, 
      year: d.fy
    }))
  }];

  // Additional safeguard to ensure chartData is valid
  if (!chartData || chartData[0]?.data?.length === 0) {
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  // Render the chart within an error boundary
  return (
    <ChartErrorBoundary>
      <ChartWrapper 
        fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
        className="h-full w-full"
      >
        <ResponsiveScatterPlot
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 60, left: 70 }}
          xScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
          yScale={{ type: 'linear' as const, min: 0 as const, max: 'auto' as const }}
          blendMode="multiply"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            legend: 'Unemployment Rate (%)',
            legendPosition: 'middle',
            legendOffset: 46
          }}
          axisLeft={{
            legend: 'Job Openings Rate (%)',
            legendPosition: 'middle',
            legendOffset: -60
          }}
          nodeSize={(d: any) => (anomalies.includes(d.data.year) ? 12 : 8)}
          nodeComponent={({ node }: any) => {
            const isAnomaly = anomalies.includes((node.data as any).year);
            const radius = isAnomaly ? 6 : 4;
            const strokeWidth = isAnomaly ? 2 : 1;
            // Derive stroke color from node.color, or use white for anomalies
            const strokeColor = isAnomaly ? 'white' : (node.color as string); // Cast to string for direct use
            const fillColor = node.color; // Use node.color for fill

            return (
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
              />
            );
          }}
          colors={{ scheme: 'spectral' }}
          tooltip={({ node }: any) => (
            <div className="bg-platform-contrast text-white p-2 rounded shadow-lg text-sm">
              <strong>FY {(node.data as any).year}</strong>
              <div>UR: {node.formattedX}%</div>
              <div>Openings: {node.formattedY}%</div>
            </div>
          )}
          theme={{
            axis: { ticks: { text: { fill: colors.platform.text, fontSize: 10 } }, legend: { text: { fill: colors.platform.text, fontSize: 12 } } },
            grid: { line: { stroke: colors.platform.contrast, strokeWidth: 1 } },
          }}
        />
      </ChartWrapper>
    </ChartErrorBoundary>
  );
}