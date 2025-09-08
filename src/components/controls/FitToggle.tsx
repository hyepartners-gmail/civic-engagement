"use client";

import { useUrlState } from '@/hooks/useUrlState';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface FitToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  r2?: number;
}

export default function FitToggle({ enabled, onToggle, r2 }: FitToggleProps) {
  const [urlFit, setUrlFit] = useUrlState<string>('fit', 'none');

  const handleToggle = (newState: boolean) => {
    onToggle(newState);
    setUrlFit(newState ? 'linear' : 'none');
  };

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="fit-toggle">Show Trend Line</Label>
      <Switch
        id="fit-toggle"
        checked={enabled}
        onCheckedChange={handleToggle}
      />
      
      {enabled && r2 !== undefined && r2 > 0 && (
        <div className="text-sm text-gray-600">
          R² = {r2.toFixed(3)}
        </div>
      )}
      
      {enabled && r2 !== undefined && r2 === 0 && (
        <div className="text-sm text-yellow-600">
          Insufficient data for R²
        </div>
      )}
    </div>
  );
}