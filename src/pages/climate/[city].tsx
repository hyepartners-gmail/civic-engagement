"use client";

import { useRouter } from 'next/router';
import { useClimateArtifact } from '@/hooks/useClimateArtifact';
import StoryLayout from '@/components/shared/StoryLayout';
import ChartContainer from '@/components/shared/ChartContainer';
import { selectTempAnomaly } from '@/lib/selectors/temps';
import { selectPrecipAnomaly } from '@/lib/selectors/precip';
import { useClimateState } from '@/hooks/useClimateState';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const CITY_NAMES: Record<string, string> = {
  'seattle': 'Seattle, WA',
  'los-angeles': 'Los Angeles, CA',
  'chicago': 'Chicago, IL',
  'new-york': 'New York, NY',
  'houston': 'Houston, TX',
  'atlanta': 'Atlanta, GA'
};

export default function CityPage() {
  const router = useRouter();
  const { city } = router.query;
  const { data, isLoading, isError, error } = useClimateArtifact();
  const { basePeriod, cadence } = useClimateState();

  // Convert cadence to a valid value for the selector functions
  const validCadence = cadence === 'monthly' ? 'annual' : cadence;

  if (!city || Array.isArray(city)) {
    return <div>Invalid city</div>;
  }

  const cityName = CITY_NAMES[city] || city;

  if (!data) {
    return (
      <StoryLayout
        title={cityName}
        description={`Climate data for ${cityName}`}
      >
        <ChartContainer isLoading={isLoading} isError={isError} error={error as Error | null}>
          <div />
        </ChartContainer>
      </StoryLayout>
    );
  }

  // Get temperature anomaly data
  const tempAnomalySeries = selectTempAnomaly(data, { 
    scope: 'city', 
    cityId: city, 
    basePeriod, 
    cadence: validCadence
  });

  // Get precipitation data
  const precipSeries = selectPrecipAnomaly(data, { 
    scope: 'city', 
    cityId: city, 
    basePeriod, 
    cadence: validCadence
  });

  // Format data for charts
  const tempChartData = [
    {
      id: 'Temperature Anomaly',
      data: tempAnomalySeries
        .filter(([_, value]) => value !== null)
        .map(([year, value]) => ({ x: year, y: value }))
    }
  ];

  const precipChartData = [
    {
      id: 'Precipitation',
      data: precipSeries
        .filter(([_, value]) => value !== null)
        .map(([year, value]) => ({ x: year, y: value }))
    }
  ];

  return (
    <StoryLayout
      title={cityName}
      description={`Climate data for ${cityName}`}
    >
      <div className="space-y-8">
        <ChartContainer 
          isLoading={isLoading} 
          isError={isError} 
          error={error}
        >
          <h3 className="text-lg font-medium mb-4">Temperature Anomaly</h3>
          <div className="h-80">
            <LineChart
              data={tempChartData}
              margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                type="number"
                domain={['dataMin', 'dataMax']}
                label={{ value: 'Year', position: 'bottom', offset: 0 }}
              />
              <YAxis
                label={{ value: 'Temperature Anomaly (°C)', angle: -90, position: 'left' }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="y"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </div>
        </ChartContainer>

        <ChartContainer 
          isLoading={isLoading} 
          isError={isError} 
          error={error}
        >
          <h3 className="text-lg font-medium mb-4">Precipitation</h3>
          <div className="h-80">
            <LineChart
              data={precipChartData}
              margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                type="number"
                domain={['dataMin', 'dataMax']}
                label={{ value: 'Year', position: 'bottom', offset: 0 }}
              />
              <YAxis
                label={{ value: 'Precipitation (mm)', angle: -90, position: 'left' }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="y"
                stroke="#82ca9d"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </div>
        </ChartContainer>
      </div>
    </StoryLayout>
  );
}