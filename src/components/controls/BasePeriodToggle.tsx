"use client";
import { useClimateState } from '@/hooks/useClimateState';
import { Label } from '../ui/label';
import { Button } from '../ui/button';

export default function BasePeriodToggle() {
  const { basePeriod, setState } = useClimateState();

  return (
    <div>
      <Label className="text-xs text-platform-text/80">Baseline</Label>
      <div className="flex items-center gap-2">
        <Button
          variant={basePeriod === '1991-2020' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setState({ basePeriod: '1991-2020' })}
          className="h-8 px-3 text-xs"
        >
          1991-2020
        </Button>
        <Button
          variant={basePeriod === '1951-1980' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setState({ basePeriod: '1951-1980' })}
          className="h-8 px-3 text-xs"
        >
          1951-1980
        </Button>
      </div>
    </div>
  );
}