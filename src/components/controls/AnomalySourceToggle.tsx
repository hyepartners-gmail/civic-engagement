"use client";
import { useUrlState } from '@/hooks/useUrlState';
import { Button } from "@/components/ui/button";

interface AnomalySourceToggleProps {
  source: 'global' | 'us';
  onSourceChange: (source: 'global' | 'us') => void;
}

export default function AnomalySourceToggle({ source, onSourceChange }: AnomalySourceToggleProps) {
  const [urlSource, setUrlSource] = useUrlState<'global' | 'us'>('anom', 'global');

  const handleSourceChange = (newSource: 'global' | 'us') => {
    onSourceChange(newSource);
    setUrlSource(newSource);
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium">Anomaly Source</label>
      <div className="flex space-x-2">
        <Button
          variant={source === 'global' ? "default" : "outline"}
          size="sm"
          onClick={() => handleSourceChange('global')}
          className="text-xs"
        >
          Global (GISTEMP)
        </Button>
        <Button
          variant={source === 'us' ? "default" : "outline"}
          size="sm"
          onClick={() => handleSourceChange('us')}
          className="text-xs"
        >
          U.S. National
        </Button>
      </div>
    </div>
  );
}