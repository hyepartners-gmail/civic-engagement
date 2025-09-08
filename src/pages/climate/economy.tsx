"use client";

import React, { useState } from 'react';
import { useClimateEconData, ClimateEconArtifact } from '@/hooks/useClimateEconData';
import HeatEconomyCorrelationChart from '@/components/climate/HeatEconomyCorrelationChart';
import HeatEconomyScatterPlot from '@/components/climate/HeatEconomyScatterPlot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChartContainer from '@/components/shared/ChartContainer';

export default function HeatEconomyPage() {
  const { data, isLoading, isError, error } = useClimateEconData();
  const climateData = data as ClimateEconArtifact;
  const [selectedState, setSelectedState] = useState<string>('CA');
  const [selectedProxy, setSelectedProxy] = useState<'constructionIndex' | 'agYieldProxy' | 'electricLoadProxy'>('constructionIndex');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-platform-background text-platform-text p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-thin text-platform-text">When Heat Meets the Economy</h1>
          <p className="text-platform-text/80 mt-1">
            Exploring the correlation between rising temperatures and economic productivity
          </p>
        </header>
        <div className="flex justify-center items-center h-96">
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-platform-background text-platform-text p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-thin text-platform-text">When Heat Meets the Economy</h1>
          <p className="text-platform-text/80 mt-1">
            Exploring the correlation between rising temperatures and economic productivity
          </p>
        </header>
        <div className="flex justify-center items-center h-96">
          <p>Error loading data: {error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-platform-background text-platform-text p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-thin text-platform-text">When Heat Meets the Economy</h1>
          <p className="text-platform-text/80 mt-1">
            Exploring the correlation between rising temperatures and economic productivity
          </p>
        </header>
        <div className="flex justify-center items-center h-96">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  const stateOptions = Object.entries(climateData.states).map(([id, stateData]) => ({
    id,
    name: stateData.name
  }));

  return (
    <div className="min-h-screen bg-platform-background text-platform-text p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-thin text-platform-text">When Heat Meets the Economy</h1>
        <p className="text-platform-text/80 mt-1">
          Exploring the correlation between rising temperatures and economic productivity
        </p>
      </header>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Analysis Parameters</CardTitle>
          <CardDescription>Select a state and economic proxy to analyze the correlation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <label htmlFor="state-select" className="text-sm font-medium">
              State:
            </label>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((state) => (
                  <SelectItem key={state.id} value={state.id}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-4">
            <label htmlFor="proxy-select" className="text-sm font-medium">
              Economic Proxy:
            </label>
            <Select 
              value={selectedProxy} 
              onValueChange={(value: string) => setSelectedProxy(value as 'constructionIndex' | 'agYieldProxy' | 'electricLoadProxy')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a proxy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="constructionIndex">Construction Hours</SelectItem>
                <SelectItem value="agYieldProxy">Agricultural Yield</SelectItem>
                <SelectItem value="electricLoadProxy">Electric Load</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <div className="grid grid-cols-1 gap-6">
          <HeatEconomyCorrelationChart data={climateData} stateId={selectedState} />
          <HeatEconomyScatterPlot 
            data={climateData} 
            stateId={selectedState} 
            xAxisMetric={selectedProxy} 
          />
          
          <Card>
            <CardHeader>
              <CardTitle>About This Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                This visualization explores the potential correlation between summer temperature anomalies and economic productivity proxies:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Summer Temperature Anomalies</strong>: Deviations from the historical average summer temperatures (JJA)</li>
                <li><strong>Construction Hours Index</strong>: Normalized index of construction hours worked</li>
                <li><strong>Agricultural Yield Proxy</strong>: Normalized proxy for agricultural yields</li>
                <li><strong>Electric Load Proxy</strong>: Normalized proxy for regional electricity load</li>
              </ul>
              <p className="mt-4">
                Note: This is a preliminary analysis using placeholder data. The actual implementation would require 
                acquiring and processing data from BLS, USDA, and EIA sources as documented in 
                <code className="bg-gray-100 px-1 rounded">MISSING_DATA_ECONOMIC_PROXIES.md</code>.
              </p>
            </CardContent>
          </Card>
        </div>
      </ChartContainer>
    </div>
  );
}
