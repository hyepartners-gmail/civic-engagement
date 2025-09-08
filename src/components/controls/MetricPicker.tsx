"use client";

import { useUrlState } from '@/hooks/useUrlState';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface MetricPickerProps {
  metric: string;
  onMetricChange: (metric: string) => void;
}

const METRIC_OPTIONS = [
  { value: 'construction', label: 'Construction Hours' },
  { value: 'agriculture', label: 'Agriculture Yield Proxy' },
  { value: 'energy', label: 'Electric Load Proxy' }
];

export default function MetricPicker({ metric, onMetricChange }: MetricPickerProps) {
  const [urlMetric, setUrlMetric] = useUrlState<string>('metric', 'construction');

  const handleMetricChange = (newMetric: string) => {
    onMetricChange(newMetric);
    setUrlMetric(newMetric);
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium">Sector Metric</label>
      <Select value={metric} onValueChange={handleMetricChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select a metric" />
        </SelectTrigger>
        <SelectContent>
          {METRIC_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="text-xs text-gray-500 mt-1">
        <p>Proxy metrics for economic sectors. Real data from BLS/BEA/USDA coming soon.</p>
      </div>
    </div>
  );
}