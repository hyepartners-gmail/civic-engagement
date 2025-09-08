"use client";
import { useUrlState } from '@/hooks/useUrlState';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';

export default function LegendChips() {
  const [ddParam, setDdParam] = useUrlState<string>('dd', 'both');

  const currentMode = ddParam || 'both';

  const toggleMode = (mode: 'hdd' | 'cdd' | 'both') => {
    setDdParam(mode);
  };

  return (
    <div>
      <Label className="text-xs text-platform-text/80 block mb-2">Degree Days</Label>
      <div className="flex flex-wrap gap-2">
        <Badge
          className={`cursor-pointer px-3 py-1 text-xs font-normal ${
            currentMode === 'hdd' || currentMode === 'both'
              ? 'bg-red-500 text-white hover:opacity-90'
              : 'bg-platform-contrast text-platform-text hover:bg-platform-accent/20'
          }`}
          onClick={() => toggleMode(currentMode === 'hdd' ? 'both' : 'hdd')}
        >
          Heat On Cold Days (HDD)
        </Badge>
        <Badge
          className={`cursor-pointer px-3 py-1 text-xs font-normal ${
            currentMode === 'cdd' || currentMode === 'both'
              ? 'bg-blue-500 text-white hover:opacity-90'
              : 'bg-platform-contrast text-platform-text hover:bg-platform-accent/20'
          }`}
          onClick={() => toggleMode(currentMode === 'cdd' ? 'both' : 'cdd')}
        >
          Cooling on Hot Days (CDD)
        </Badge>
        <Badge
          className={`cursor-pointer px-3 py-1 text-xs font-normal ${
            currentMode === 'both'
              ? 'bg-green-500 text-white hover:opacity-90'
              : 'bg-platform-contrast text-platform-text hover:bg-platform-accent/20'
          }`}
          onClick={() => toggleMode('both')}
        >
          Both
        </Badge>
      </div>
    </div>
  );
}