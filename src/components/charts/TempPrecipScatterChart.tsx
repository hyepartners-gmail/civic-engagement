"use client";

import { ResponsiveScatterPlot } from "@nivo/scatterplot";
import { Card } from "../shared/Card";
import { colors } from '@/lib/theme';
import { CITY_COLORS } from '../controls/CitiesToggleGroup';
import { memo } from 'react';

const CITY_NAMES: Record<string, string> = {
  'seattle': 'Seattle, WA',
  'los-angeles': 'Los Angeles, CA',
  'chicago': 'Chicago, IL',
  'houston': 'Houston, TX',
  'atlanta': 'Atlanta, GA',
  'new-york': 'New York, NY'
};

interface TempPrecipDataPoint {
  year: number;
  temp: number;
  precip: number;
  city: string;
  cityName: string;
}

interface TempPrecipScatterChartProps {
  data: TempPrecipDataPoint[];
  cities: string[];
}

const TempPrecipScatterChart = memo(function TempPrecipScatterChart({ data, cities }: TempPrecipScatterChartProps) {
  // Group data by city
  const scatterData = cities.map(cityId => {
    const cityData = data.filter(d => d.city === cityId);
    if (cityData.length === 0) return {
      id: CITY_NAMES[cityId] || cityId,
      data: []
    };
    
    return {
      id: CITY_NAMES[cityId] || cityId,
      data: cityData.map(d => ({
        x: d.temp,
        y: d.precip,
        year: d.year,
        city: d.city,
        cityName: d.cityName
      }))
    };
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-platform-text text-lg font-medium">
          Temperature Anomaly vs. Precipitation
        </h3>
      </div>
      <Card className="flex-1 p-4">
        <div className="h-96">
          <ResponsiveScatterPlot
            data={scatterData}
            margin={{ top: 60, right: 140, bottom: 70, left: 90 }}
            xScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
            yScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Temperature Anomaly (°C)',
              legendPosition: 'middle',
              legendOffset: 45
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Precipitation (mm)',
              legendPosition: 'middle',
              legendOffset: -70
            }}
            colors={({ serieId }) => {
              // Convert serieId to string and find matching city
              const serieIdStr = String(serieId);
              // Find the city ID from the full name
              const cityId = Object.entries(CITY_NAMES).find(
                ([id, name]) => name === serieIdStr
              )?.[0] || cities[0];
              
              return CITY_COLORS[cityId] || '#1f77b4';
            }}
            nodeSize={9}
            tooltip={({ node }) => {
              const data = node.data as any;
              return (
                <div className="bg-platform-contrast text-platform-text p-2 rounded shadow-lg border border-platform-accent">
                  <strong>{data.cityName}</strong>
                  <div>Year: {data.year}</div>
                  <div>Temperature: {data.x.toFixed(2)}°C</div>
                  <div>Precipitation: {data.y.toFixed(1)} mm</div>
                </div>
              );
            }}
            useMesh={true}
            legends={[
              {
                anchor: 'bottom-right' as const,
                direction: 'column' as const,
                justify: false,
                translateX: 130,
                translateY: 0,
                itemWidth: 140,
                itemHeight: 12,
                itemsSpacing: 5,
                itemDirection: 'left-to-right' as const,
                symbolSize: 12,
                symbolShape: 'circle' as const,
                effects: [
                  {
                    on: 'hover' as const,
                    style: {
                      itemOpacity: 1
                    }
                  }
                ]
              }
            ]}
            theme={{
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
            }}
          />
        </div>
        <div className="mt-4 text-sm text-platform-text/80">
          <p>Each point represents a year's temperature anomaly and precipitation. Hover over points to see details.</p>
        </div>
      </Card>
    </div>
  );
});

export default TempPrecipScatterChart;