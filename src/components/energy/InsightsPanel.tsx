"use client";
import { Plant } from '@/lib/energySchema';
import TopEmittersList from './TopEmittersList';
import CleanestPlantsList from './CleanestPlantsList';

interface InsightsPanelProps {
  plants: Plant[];
  onPlantSelect: (plantId: number) => void;
}

export default function InsightsPanel({ plants, onPlantSelect }: InsightsPanelProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-platform-text">Emissions & Policy Insights</h3>
      <TopEmittersList plants={plants} onPlantSelect={onPlantSelect} limit={5} />
      <CleanestPlantsList plants={plants} onPlantSelect={onPlantSelect} limit={5} />
    </div>
  );
}
