import React from 'react';
import { ResponsiveBar, BarDatum } from '@nivo/bar';
import { colors } from '@/lib/theme';

interface DegreeDaysBarsProps {
  data: {
    degreeDays: { year: number; hdd: number; cdd: number }[];
    co2: { x: number; y: number | null }[];
  };
  normalize: boolean;
}

export default function DegreeDaysBars({ data, normalize }: DegreeDaysBarsProps) {
  // Prepare degree days data
  const degreeDaysData = data.degreeDays.map(d => ({
    year: d.year,
    hdd: d.hdd,
    cdd: d.cdd
  }));

  // Prepare CO2 data
  const co2Data = data.co2
    .filter(d => d.y !== null)
    .map(d => ({
      year: d.x,
      co2: d.y as number
    }));

  // Merge data by year
  const mergedData = degreeDaysData.map(dd => {
    const co2Entry = co2Data.find(c => c.year === dd.year);
    return {
      year: dd.year,
      hdd: dd.hdd,
      cdd: dd.cdd,
      co2: co2Entry ? co2Entry.co2 : 0 // Use 0 instead of null
    };
  });

  // Normalize if requested
  let normalizedData: BarDatum[];
  if (normalize) {
    const hddMax = Math.max(...mergedData.map(d => d.hdd));
    const cddMax = Math.max(...mergedData.map(d => d.cdd));
    const co2Max = Math.max(...mergedData.map(d => d.co2));
    
    normalizedData = mergedData.map(d => ({
      year: d.year,
      hdd: hddMax !== 0 ? (d.hdd / hddMax) * 100 : 0,
      cdd: cddMax !== 0 ? (d.cdd / cddMax) * 100 : 0,
      co2: co2Max !== 0 ? (d.co2 / co2Max) * 100 : 0
    })) as BarDatum[];
  } else {
    // Ensure data has proper types for Nivo chart
    normalizedData = mergedData as BarDatum[];
  }

  return (
    <div className="h-80">
      <ResponsiveBar
        data={normalizedData}
        keys={['hdd', 'cdd', 'co2']}
        indexBy="year"
        margin={{ top: 20, right: 130, bottom: 60, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={{ scheme: 'nivo' }}
        defs={[
          {
            id: 'dots',
            type: 'patternDots',
            background: 'inherit',
            color: '#38bcb2',
            size: 4,
            padding: 1,
            stagger: true
          },
          {
            id: 'lines',
            type: 'patternLines',
            background: 'inherit',
            color: '#eed312',
            rotation: -45,
            lineWidth: 6,
            spacing: 10
          }
        ]}
        fill={[
          {
            match: {
              id: 'hdd'
            },
            id: 'dots'
          },
          {
            match: {
              id: 'cdd'
            },
            id: 'lines'
          }
        ]}
        borderColor={{
          from: 'color',
          modifiers: [
            [
              'darker',
              1.6
            ]
          ]
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Year',
          legendPosition: 'middle',
          legendOffset: 40
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: normalize ? 'Normalized Values (%)' : 'Absolute Values',
          legendPosition: 'middle',
          legendOffset: -50
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{
          from: 'color',
          modifiers: [
            [
              'darker',
              1.6
            ]
          ]
        }}
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemDirection: 'left-to-right',
            itemOpacity: 0.85,
            symbolSize: 20,
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
        role="application"
        ariaLabel="Degree Days and CO2 Emissions Chart"
      />
    </div>
  );
}