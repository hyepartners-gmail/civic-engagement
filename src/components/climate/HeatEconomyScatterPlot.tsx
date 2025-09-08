"use client";

import React, { useMemo } from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { ClimateEconArtifact } from '@/hooks/useClimateEconData';
import { createCorrelationData } from '@/lib/selectors/climateEconSelectors';

interface HeatEconomyScatterPlotProps {
  data: ClimateEconArtifact;
  stateId: string;
  xAxisMetric: 'constructionIndex' | 'agYieldProxy' | 'electricLoadProxy';
}

const HeatEconomyScatterPlot: React.FC<HeatEconomyScatterPlotProps> = ({ data, stateId, xAxisMetric }) => {
  const correlationData = useMemo(() => {
    return createCorrelationData(data, stateId);
  }, [data, stateId]);

  // Prepare data for Nivo scatter plot
  const scatterPlotData = useMemo(() => {
    // Filter out data points with missing values
    const filteredData = correlationData.filter(d => 
      d.summerAnomaly !== null && 
      (xAxisMetric === 'constructionIndex' ? d.constructionIndex !== null :
       xAxisMetric === 'agYieldProxy' ? d.agYieldProxy !== null :
       d.electricLoadProxy !== null)
    );

    // Map to scatter plot format
    const points = filteredData.map(d => {
      const xValue = xAxisMetric === 'constructionIndex' ? d.constructionIndex :
                    xAxisMetric === 'agYieldProxy' ? d.agYieldProxy :
                    d.electricLoadProxy;
      
      return {
        x: xValue as number,  // Explicitly cast to number since we've filtered out nulls
        y: d.summerAnomaly as number  // Explicitly cast to number since we've filtered out nulls
      };
    });

    // Determine series name based on xAxisMetric
    const seriesName = xAxisMetric === 'constructionIndex' ? 'Construction Hours Index' :
                      xAxisMetric === 'agYieldProxy' ? 'Agricultural Yield Proxy' :
                      'Electric Load Proxy';

    return [
      {
        id: seriesName,
        data: points
      }
    ];
  }, [correlationData, xAxisMetric]);

  // Get axis labels
  const xAxisLabel = xAxisMetric === 'constructionIndex' ? 'Construction Hours Index' :
                    xAxisMetric === 'agYieldProxy' ? 'Agricultural Yield Proxy' :
                    'Electric Load Proxy';
  
  const yAxisLabel = 'Summer Temperature Anomaly (°C)';

  if (scatterPlotData[0].data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-white rounded-lg">
        <p className="text-gray-500">No data available for correlation analysis</p>
      </div>
    );
  }

  return (
    <div className="h-96 bg-white rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">
        {yAxisLabel} vs. {xAxisLabel}: {data.states[stateId].name}
      </h3>
      <ResponsiveScatterPlot
        data={scatterPlotData}
        margin={{ top: 60, right: 140, bottom: 70, left: 90 }}
        xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: xAxisLabel,
          legendOffset: 45,
          legendPosition: 'middle'
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: yAxisLabel,
          legendOffset: -70,
          legendPosition: 'middle'
        }}
        colors={{ scheme: 'nivo' }}
        nodeSize={10}
        useMesh={true}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 130,
            translateY: 0,
            itemWidth: 100,
            itemHeight: 12,
            itemsSpacing: 5,
            itemDirection: 'left-to-right',
            symbolSize: 12,
            symbolShape: 'circle',
            effects: [
              {
                on: 'hover',
                style: {
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

export default HeatEconomyScatterPlot;