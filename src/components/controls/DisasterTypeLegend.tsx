"use client";
import { useClimateState } from '@/hooks/useClimateState';
import type { DisasterType } from '@/hooks/useClimateState';

import { Badge } from '../ui/badge';
import { Label } from '../ui/label';

const DISASTER_TYPES: { id: DisasterType; name: string; color: string }[] = [
  { id: 'flood', name: 'Flood', color: 'bg-blue-500' },
  { id: 'drought', name: 'Drought', color: 'bg-yellow-500' },
  { id: 'wildfire', name: 'Wildfire', color: 'bg-red-500' },
  { id: 'hurricane', name: 'Hurricane', color: 'bg-purple-500' },
  { id: 'severe-storm', name: 'Severe Storm', color: 'bg-green-500' },
  { id: 'winter-storm', name: 'Winter Storm', color: 'bg-cyan-500' },
];

export default function DisasterTypeLegend() {
  const { disasterTypes, setState } = useClimateState();

  const toggleDisasterType = (type: DisasterType) => {
    const newTypes = disasterTypes.includes(type)
      ? disasterTypes.filter((t: DisasterType) => t !== type)
      : [...disasterTypes, type];
    
    setState({ disasterTypes: newTypes });
  };

  return (
    <div>
      <Label className="text-xs text-platform-text/80 block mb-2">Disaster Types</Label>
      <div className="flex flex-wrap gap-2">
        {DISASTER_TYPES.map(type => (
          <Badge
            key={type.id}
            className={`cursor-pointer px-3 py-1 text-xs font-normal ${
              disasterTypes.includes(type.id)
                ? `${type.color} text-white hover:opacity-90`
                : 'bg-platform-contrast text-platform-text hover:bg-platform-accent/20'
            }`}
            onClick={() => toggleDisasterType(type.id)}
          >
            {type.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}