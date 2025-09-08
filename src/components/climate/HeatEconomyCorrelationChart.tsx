"use client";

import React, { useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ClimateEconArtifact } from '@/hooks/useClimateEconData';
import { createCorrelationData } from '@/lib/selectors/climateEconSelectors';

interface HeatEconomyCorrelationChartProps {
  data: ClimateEconArtifact;
  stateId: string;
}

const HeatEconomyCorrelationChart: React.FC<HeatEconomyCorrelationChartProps> = ({ data, stateId }) => {
  const correlationData = useMemo(() => {
    return createCorrelationData(data, stateId);
  }, [data, stateId]);

  // Prepare data for Nivo line chart
  const chartData = useMemo(() => {
    // Filter out data points with missing values
    const filteredData = correlationData.filter(d => 
      d.summerAnomaly !== null && 
      (d.constructionIndex !== null || d.agYieldProxy !== null || d.electricLoadProxy !== null)
    );

    return [
      {
        id: 'Summer Temperature Anomaly',
        data: filteredData.map(d => ({
          x: d.year,
          y: d.summerAnomaly
        }))
      },
      {
        id: 'Construction Hours Index',
        data: filteredData.map(d => ({
          x: d.year,
          y: d.constructionIndex
        })).filter(d => d.y !== null)
      },
      {
        id: 'Agricultural Yield Proxy',
        data: filteredData.map(d => ({
          x: d.year,
          y: d.agYieldProxy
        })).filter(d => d.y !== null)
      },
      {
        id: 'Electric Load Proxy',
        data: filteredData.map(d => ({
          x: d.year,
          y: d.electricLoadProxy
        })).filter(d => d.y !== null)
      }
    ];
  }, [correlationData]);

  if (correlationData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-white rounded-lg">
        <p className="text-gray-500">No data available for {stateId}</p>
      </div>
    );
  }

  return (
    <div className="h-96 bg-white rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Heat vs. Economic Proxies: {data.states[stateId].name}</h3>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Year',
          legendOffset: 36,
          legendPosition: 'middle'
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Values',
          legendOffset: -40,
          legendPosition: 'middle'
        }}
        colors={{ scheme: 'nivo' }}
        pointSize={4}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh={true}
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
      />
    </div>
  );
};

export default HeatEconomyCorrelationChart;