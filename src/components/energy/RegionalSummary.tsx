"use client";
import { useState } from 'react';
import { BarChart3, Zap, Cloud, Leaf, TrendingUp } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import dynamic from 'next/dynamic';

// Dynamically import Nivo bar chart
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

interface RegionalSummaryProps {
  data: Record<string, { 
    capacity: number; 
    generation: number; 
    emissions: number;
    renewable_generation: number;
    renewable_share: number;
  }>;
  selectedRegion: string;
  onRegionChange: (region: string) => void;
}

const MetricCard = ({ 
  title, 
  value, 
  unit, 
  icon,
  trend
}: { 
  title: string; 
  value: string; 
  unit: string; 
  icon: React.ReactNode;
  trend?: { value: number; label: string };
}) => (
  <Card className="p-4">
    <div className="flex justify-between items-start">
      <div>
        <div className="flex items-center text-platform-text/70 text-sm">
          {icon}
          <span className="ml-2">{title}</span>
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-platform-text/70 text-sm ml-1">{unit}</span>
        </div>
      </div>
      {trend && (
        <div className={`flex items-center text-sm ${trend.value > 0 ? 'text-green-500' : 'text-red-500'}`}>
          <TrendingUp className={`h-4 w-4 mr-1 ${trend.value < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </div>
  </Card>
);

export default function RegionalSummary({ data, selectedRegion, onRegionChange }: RegionalSummaryProps) {
  const [metric, setMetric] = useState<'capacity' | 'generation' | 'emissions' | 'renewable_share'>('generation');
  
  const regions = Object.keys(data).sort();
  const regionData = data[selectedRegion] || {
    capacity: 0,
    generation: 0,
    emissions: 0,
    renewable_generation: 0,
    renewable_share: 0
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(1);
  };

  // Generate chart data from the actual metrics for the selected region
  const metricName = {
    'capacity': 'Capacity (MW)',
    'generation': 'Generation (MWh)',
    'emissions': 'Emissions (tons)',
    'renewable_share': 'Renewable Share (%)'
  }[metric];

  // Create chart data for the current year based on actual data
  const chartData = [
    { 
      year: new Date().getFullYear().toString(), 
      value: metric === 'renewable_share' ? regionData.renewable_share : 
             metric === 'emissions' ? regionData.emissions : 
             metric === 'generation' ? regionData.generation : 
             regionData.capacity 
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-platform-text">Regional Summary</h3>
          <p className="text-sm text-platform-text/70">Energy metrics for {selectedRegion}</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedRegion} onValueChange={onRegionChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {regions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="capacity">Capacity</SelectItem>
              <SelectItem value="generation">Generation</SelectItem>
              <SelectItem value="emissions">Emissions</SelectItem>
              <SelectItem value="renewable_share">Renewable Share</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Capacity" 
          value={formatNumber(regionData.capacity)} 
          unit="MW" 
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <MetricCard 
          title="Annual Generation" 
          value={formatNumber(regionData.generation)} 
          unit="MWh" 
          icon={<Zap className="h-4 w-4" />}
        />
        <MetricCard 
          title="CO₂ Emissions" 
          value={formatNumber(regionData.emissions)} 
          unit="tons" 
          icon={<Cloud className="h-4 w-4" />}
        />
        <MetricCard 
          title="Renewable Share" 
          value={regionData.renewable_share.toFixed(1)} 
          unit="%" 
          icon={<Leaf className="h-4 w-4" />}
        />
      </div>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-platform-text">
            {metric.charAt(0).toUpperCase() + metric.slice(1)} Metric
          </h4>
          <Button variant="platform-primary" size="sm">Export Data</Button>
        </div>
        <div className="h-64">
          <ResponsiveBar
            data={chartData}
            keys={['value']}
            indexBy="year"
            margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
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
              legend: 'Year',
              legendPosition: 'middle',
              legendOffset: 32
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: metricName,
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
            role="application"
            ariaLabel="Regional energy metrics"
          />
        </div>
      </Card>
    </div>
  );
}