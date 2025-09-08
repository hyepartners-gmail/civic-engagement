"use client";
import { useUrlState } from '@/hooks/useUrlState';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface RegionSwitchProps {
  hasStateData: boolean;
  onScopeChange?: (scope: 'national' | 'state') => void;
}

export default function RegionSwitch({ hasStateData, onScopeChange }: RegionSwitchProps) {
  const [wildfireScope, setWildfireScope] = useUrlState<'national' | 'state'>('wf', 'national');

  const handleSwitch = (checked: boolean) => {
    const newScope = checked ? 'state' : 'national';
    setWildfireScope(newScope);
    
    // Call the parent handler if provided
    if (onScopeChange) {
      onScopeChange(newScope);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="region-switch" className="text-sm font-medium">
        National Wildfire Data
      </Label>
      <Switch
        id="region-switch"
        checked={wildfireScope === 'state' && hasStateData}
        onCheckedChange={handleSwitch}
        disabled={!hasStateData}
      />
      <Label htmlFor="region-switch" className="text-sm font-medium">
        State Wildfire Data
      </Label>
      {!hasStateData && (
        <span className="text-xs text-yellow-600 ml-2">
          (State data not available)
        </span>
      )}
    </div>
  );
}