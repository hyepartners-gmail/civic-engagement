"use client";
import { useState } from 'react';
import { useHierarchy } from '@/hooks/useHierarchy';
import { Projection } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Info } from 'lucide-react';

interface InterestVsChipProps {
  projection: Projection['tenYear'];
  year: number;
}

export default function InterestVsChip({ projection, year }: InterestVsChipProps) {
  const { root, getNode } = useHierarchy();
  const [compareId, setCompareId] = useState('func:500'); // Default to Education

  const functions = (root as any)?.children?.filter((c: any) => c.kind === 'function' && c.id !== 'func:900') || [];
  const projectionYearData = projection.find(d => d.year === year);
  const netInterest = projectionYearData?.netInterest || 0;
  const compareNode = getNode(compareId);
  const compareValue = compareNode?.values[year]?.nominal || 0;
  const ratio = compareValue > 0 ? netInterest / compareValue : 0;

  return (
    <div className="bg-platform-cyan/10 p-3 rounded-lg flex items-center gap-2 text-sm">
      <Info className="h-5 w-5 text-platform-cyan flex-shrink-0" />
      <span className="text-platform-text">In {year}, Net Interest is projected to be <strong>{ratio.toFixed(1)}x</strong> the spending on</span>
      <Select value={compareId} onValueChange={setCompareId}>
        <SelectTrigger className="w-48 h-8 text-xs bg-platform-contrast border-platform-accent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
          {functions.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}