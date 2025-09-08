"use client";
import { useState } from 'react';
import { BarChart3, Zap, Cloud, Leaf, ArrowRight } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import dynamic from 'next/dynamic';

// Dynamically import Nivo bar chart for comparison
const ResponsiveBar = dynamic(
  () => import('@nivo/bar').then(mod => {
    if (!mod || !mod.ResponsiveBar) {
      throw new Error('Failed to load ResponsiveBar component');
    }
    return mod.ResponsiveBar;
  }).catch(error => {
    console.error('Error loading ResponsiveBar:', error);
    return () => <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">Chart unavailable</p>
      </div>
    </div>;
  }),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
  }
);

interface CompareRegionsProps {
  data: {
    region1: { 
      capacity: number; 
      generation: number; 
      emissions: number; 
      renewable_share: number 
    };
    region2: { 
      capacity: number; 
      generation: number; 
      emissions: number; 
      renewable_share: number 
    };
  };
  region1: string;
  region2: string;
  regions: string[];
  onRegion1Change: (region: string) => void;
  onRegion2Change: (region: string) => void;
}

const MetricComparison = ({ 
  label, 
  icon, 
  region1Value, 
  region2Value, 
  unit,
  isPercentage = false
}: { 
  label: string; 
  icon: React.ReactNode;
  region1Value: number; 
  region2Value: number; 
  unit: string;
  isPercentage?: boolean;
}) => {
  const formatValue = (value: number) => {
    if (isPercentage) return value.toFixed(1);
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const difference = region2Value - region1Value;
  const percentDiff = region1Value !== 0 ? (difference / region1Value) * 100 : 0;
  const isRegion2Higher = difference > 0;

  return (
    <div className="flex items-center justify-between p-3 hover:bg-platform-contrast/30 rounded-lg">
      <div className="flex items-center w-1/3">
        <span className="text-platform-accent mr-2">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center justify-center w-1/3">
        <span className="font-mono text-sm">{formatValue(region1Value)}{isPercentage ? '%' : unit}</span>
      </div>
      <div className="flex items-center justify-center w-1/3">
        <span className="font-mono text-sm">{formatValue(region2Value)}{isPercentage ? '%' : unit}</span>
        {region1Value !== 0 && (
          <span className={`ml-2 text-xs flex items-center ${isRegion2Higher ? 'text-green-500' : 'text-red-500'}`}>
            <ArrowRight className="h-3 w-3 mr-1" />
            {Math.abs(percentDiff).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
};

export default function CompareRegions({ 
  data, 
  region1, 
  region2, 
  regions, 
  onRegion1Change, 
  onRegion2Change 
}: CompareRegionsProps) {
  const [sortBy, setSortBy] = useState<'difference' | 'region1' | 'region2'>('difference');

  // Prepare data for the bar chart
  const chartData = [
    {
      metric: 'Capacity',
      [region1]: data.region1.capacity,
      [region2]: data.region2.capacity,
    },
    {
      metric: 'Generation',
      [region1]: data.region1.generation,
      [region2]: data.region2.generation,
    },
    {
      metric: 'Emissions',
      [region1]: data.region1.emissions,
      [region2]: data.region2.emissions,
    },
    {
      metric: 'Renewable Share',
      [region1]: data.region1.renewable_share,
      [region2]: data.region2.renewable_share,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-platform-text">Compare Regions</h3>
          <p className="text-sm text-platform-text/70">Side-by-side comparison of energy metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="difference">Sort by Difference</SelectItem>
              <SelectItem value="region1">Sort by {region1}</SelectItem>
              <SelectItem value="region2">Sort by {region2}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-platform-text">Region Selection</h4>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-platform-text/70 mb-1 block">Region 1</label>
              <Select value={region1} onValueChange={onRegion1Change}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-platform-text/70 mb-1 block">Region 2</label>
              <Select value={region2} onValueChange={onRegion2Change}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium text-platform-text mb-4">Key Differences</h4>
          <div className="space-y-2">
            <MetricComparison
              label="Capacity"
              icon={<BarChart3 className="h-4 w-4" />}
              region1Value={data.region1.capacity}
              region2Value={data.region2.capacity}
              unit="MW"
            />
            <MetricComparison
              label="Generation"
              icon={<Zap className="h-4 w-4" />}
              region1Value={data.region1.generation}
              region2Value={data.region2.generation}
              unit="MWh"
            />
            <MetricComparison
              label="Emissions"
              icon={<Cloud className="h-4 w-4" />}
              region1Value={data.region1.emissions}
              region2Value={data.region2.emissions}
              unit="tons"
            />
            <MetricComparison
              label="Renewable Share"
              icon={<Leaf className="h-4 w-4" />}
              region1Value={data.region1.renewable_share}
              region2Value={data.region2.renewable_share}
              unit="%"
              isPercentage={true}
            />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-medium text-platform-text mb-4">Metrics Comparison</h4>
        <div className="h-80">
          <ResponsiveBar
            data={chartData}
            keys={[region1, region2]}
            indexBy="metric"
            margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={{ scheme: 'nivo' }}
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
              legend: 'Metrics',
              legendPosition: 'middle',
              legendOffset: 32
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Values',
              legendPosition: 'middle',
              legendOffset: -60
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
                direction: 'row',
                justify: false,
                translateX: 0,
                translateY: 60,
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
            ariaLabel="Region comparison chart"
          />
        </div>
      </Card>
    </div>
  );
}