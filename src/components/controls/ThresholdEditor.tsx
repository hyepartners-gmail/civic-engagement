"use client";
import { useUrlState } from '@/hooks/useUrlState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings } from 'lucide-react';

const THRESHOLD_OPTIONS = [
  { value: '68', label: '68°F' },
  { value: '70', label: '70°F' },
  { value: '75', label: '75°F' },
];

interface ThresholdEditorProps {
  onThresholdChange?: (threshold: string) => void;
}

export default function ThresholdEditor({ onThresholdChange }: ThresholdEditorProps) {
  const [threshold, setThreshold] = useUrlState<string>('wn', '70');

  const handleChange = (value: string) => {
    setThreshold(value);
    
    // Call the parent handler if provided
    if (onThresholdChange) {
      onThresholdChange(value);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Settings className="h-4 w-4 text-platform-text/70" />
      <Label htmlFor="threshold-editor" className="text-sm font-medium">
        Warm Night Threshold:
      </Label>
      <Select value={threshold || '70'} onValueChange={handleChange}>
        <SelectTrigger className="w-24 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {THRESHOLD_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}