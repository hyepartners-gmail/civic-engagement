"use client";
import { useClimateState, Cadence } from '@/hooks/useClimateState';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

export default function FiscalYearToggle() {
  const { cadence, setState } = useClimateState();

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="cadence-toggle" className="text-xs text-platform-text/80">
        Calendar Year
      </Label>
      <Switch
        id="cadence-toggle"
        checked={cadence === 'fiscal'}
        onCheckedChange={(checked) => setState({ cadence: checked ? 'fiscal' : 'annual' })}
      />
      <Label htmlFor="cadence-toggle" className="text-xs text-platform-text/80">
        Fiscal Year
      </Label>
    </div>
  );
}