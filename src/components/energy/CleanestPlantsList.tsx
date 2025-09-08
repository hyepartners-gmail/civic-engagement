"use client";
import { Plant } from '@/lib/energySchema';
import { selectCleanestPlants } from '@/lib/selectors/energy';
import { Button } from '../ui/button';
import { Leaf } from 'lucide-react';

interface CleanestPlantsListProps {
  plants: Plant[];
  onPlantSelect: (plantId: number) => void;
  limit?: number;
}

export default function CleanestPlantsList({ plants, onPlantSelect, limit = 10 }: CleanestPlantsListProps) {
  const cleanestPlants = selectCleanestPlants(plants, limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Leaf className="h-4 w-4 text-green-400" />
        <h4 className="font-semibold text-platform-text">Cleanest Plants (&gt;50MW)</h4>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {cleanestPlants.length > 0 ? (
          <ul className="space-y-1">
            {cleanestPlants.map((plant: Plant) => (
              <li key={plant.plant_id}>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto text-xs p-2 hover:bg-platform-contrast/50"
                  onClick={() => onPlantSelect(plant.plant_id)}
                >
                  <span className="truncate text-left flex-1 text-platform-text">
                    {plant.plant_name}
                  </span>
                  <span className="font-mono ml-2 flex-shrink-0 text-platform-text">
                    {plant.co2_intensity_kg_mwh?.toLocaleString() ?? 'N/A'} kg/MWh
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-platform-text/70">No clean energy data available</p>
        )}
      </div>
    </div>
  );
}