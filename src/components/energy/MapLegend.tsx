"use client";
import { useState } from 'react';
import { Card } from '@/components/shared/Card';

interface MapLegendProps {
  onColorModeChange?: (mode: 'fuel' | 'co2') => void;
}

// Fuel type colors
const fuelColors: Record<string, string> = {
  coal: '#2f4f4f',    // Dark slate gray
  lng: '#8b0000',     // Dark red
  oil: '#ff8c00',     // Dark orange
  nuclear: '#9370db', // Medium purple
  dam: '#4169e1',     // Royal blue
  wind: '#00ff7f',    // Spring green
  solar: '#ffff00',   // Yellow
  biomass: '#8b4513', // Saddle brown
  geothermal: '#ff6347', // Tomato
  other: '#a9a9a9',   // Dark gray
};

// Fuel type labels
const fuelLabels: Record<string, string> = {
  coal: 'Coal',
  lng: 'Natural Gas',
  oil: 'Oil',
  nuclear: 'Nuclear',
  dam: 'Hydroelectric',
  wind: 'Wind',
  solar: 'Solar',
  biomass: 'Biomass',
  geothermal: 'Geothermal',
  other: 'Other',
};

export default function MapLegend({ onColorModeChange }: MapLegendProps) {
  return (
    <Card className="p-4">
      <h3 className="font-medium text-platform-text mb-3">Map Legend</h3>
      
      {/* Color mode toggle for state view */}
      {onColorModeChange && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-platform-text/90 mb-2">Color By</h4>
          <div className="flex space-x-2">
            <button 
              className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800"
              onClick={() => onColorModeChange('fuel')}
            >
              Fuel Type
            </button>
            <button 
              className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800"
              onClick={() => onColorModeChange('co2')}
            >
              CO₂ Intensity
            </button>
          </div>
        </div>
      )}
      
      {/* Fuel type legend */}
      <h4 className="text-sm font-medium text-platform-text/90 mb-2">Fuel Types</h4>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(fuelColors).map(([fuelType, color]) => (
          <div key={fuelType} className="flex items-center">
            <div 
              className="w-4 h-4 rounded-full mr-2 border border-gray-300"
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-sm text-platform-text/90">{fuelLabels[fuelType]}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-xs text-platform-text/70">
        <p>• Click on states/plants for details</p>
        <p>• Toggle between State and Plant views</p>
      </div>
    </Card>
  );
}