"use client";
import { Plant } from '@/lib/energySchema';
import { selectTopEmitters } from '@/lib/selectors/energy';
import { Button } from '../ui/button';
import { Flame } from 'lucide-react';

interface TopEmittersListProps {
  plants: Plant[];
  onPlantSelect: (plantId: number) => void;
  limit?: number;
}

export default function TopEmittersList({ plants, onPlantSelect, limit = 10 }: TopEmittersListProps) {
  const topEmitters = selectTopEmitters(plants, limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="h-4 w-4 text-red-400" />
        <h4 className="font-semibold text-platform-text">Top Emitters</h4>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {topEmitters.length > 0 ? (
          <ul className="space-y-1">
            {topEmitters.map((plant: Plant) => (
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
                    {plant.co2_tons?.toLocaleString() ?? 'N/A'} tons
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-platform-text/70">No emission data available</p>
        )}
      </div>
    </div>
  );
}