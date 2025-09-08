'use client';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CompareData {
  fy: number;
  jobs: number;
  gdpGrowth?: number;
}

interface CompareFYsProps {
  data: CompareData[];
}

export default function CompareFYs({ data }: CompareFYsProps) {
  const [selectedFYs, setSelectedFYs] = useState<(number | null)[]>([null, null, null]);

  const handleSelect = (index: number, fy: number) => {
    setSelectedFYs(prev => {
      const newSelection = [...prev];
      newSelection[index] = fy;
      return newSelection;
    });
  };

  const allYears = data.map(d => d.fy).sort((a, b) => b - a);

  const tableData = selectedFYs
    .filter((fy): fy is number => fy !== null)
    .map(fy => data.find(d => d.fy === fy))
    .filter((d): d is CompareData => d !== undefined);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[0, 1, 2].map(i => {
          const availableYears = allYears.filter(year => 
            !selectedFYs.includes(year) || selectedFYs[i] === year
          );
          return (
            <Select 
              key={i} 
              value={selectedFYs[i] ? String(selectedFYs[i]) : undefined}
              onValueChange={(val) => handleSelect(i, Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select FY ${i + 1}`} />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        })}
      </div>
      {tableData.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Metric</th>
              {tableData.map(d => <th key={d.fy} className="text-right p-2">{d.fy}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Net Jobs (M)</td>
              {tableData.map(d => (
                <td key={d.fy} className="text-right p-2 font-mono">{d.jobs.toFixed(2)}</td>
              ))}
            </tr>
            <tr>
              <td className="p-2">GDP Growth (%)</td>
              {tableData.map(d => (
                <td key={d.fy} className="text-right p-2 font-mono">{d.gdpGrowth?.toFixed(1) ?? 'N/A'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}