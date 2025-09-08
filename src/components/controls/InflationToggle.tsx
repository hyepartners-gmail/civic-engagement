"use client";

import { useUrlState } from '@/hooks/useUrlState';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface InflationToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function InflationToggle({ enabled, onToggle }: InflationToggleProps) {
  const [urlReal, setUrlReal] = useUrlState<boolean>('real', true);

  const handleToggle = (newState: boolean) => {
    onToggle(newState);
    setUrlReal(newState);
  };

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="inflation-toggle">Adjust for Inflation</Label>
      <Switch
        id="inflation-toggle"
        checked={enabled}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}