"use client";

import { Card } from '@/components/shared/Card';

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

export default function PlantLegend() {
  return (
    <Card className="p-4">
      <h3 className="font-medium text-platform-text mb-3">Plant Types</h3>
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
    </Card>
  );
}