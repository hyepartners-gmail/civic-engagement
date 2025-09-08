"use client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/shared/Card";
import { useUrlState } from '@/hooks/useUrlState';

interface PerCapitaToggleProps {
  perCapita: boolean;
  onToggle: (perCapita: boolean) => void;
  disabled?: boolean;
}

export default function PerCapitaToggle({ perCapita, onToggle, disabled = false }: PerCapitaToggleProps) {
  const [urlPerCapita, setUrlPerCapita] = useUrlState<boolean>('perCapita', false);
  
  const handleToggle = (checked: boolean) => {
    onToggle(checked);
    setUrlPerCapita(checked);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="per-capita-toggle" className="flex items-center gap-2">
          Per Capita Emissions
          <span className="text-xs text-platform-text/70">(vs. total)</span>
        </Label>
        <Switch
          id="per-capita-toggle"
          checked={perCapita}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>
    </Card>
  );
}