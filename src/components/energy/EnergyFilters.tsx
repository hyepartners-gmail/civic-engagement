"use client";
import { useEnergyState, ALL_FUEL_TYPES, RegionalMetric } from '@/hooks/useEnergyState';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { RotateCcw } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Switch } from '../ui/switch';

export default function EnergyFilters() {
  const { fuelTypes, co2Max, capacityMin, regionalMetric, showRpsOverlay, setState, resetFilters } = useEnergyState();

  const handleFuelTypeChange = (fuelType: string, checked: boolean) => {
    const newFuelTypes = checked
      ? [...fuelTypes, fuelType]
      : fuelTypes.filter(ft => ft !== fuelType);
    setState({ fuelTypes: newFuelTypes as any });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Filters</h3>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
      <div>
        <Label>Fuel Type</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {ALL_FUEL_TYPES.map(fuel => (
            <div key={fuel} className="flex items-center space-x-2">
              <Checkbox
                id={`fuel-${fuel}`}
                checked={fuelTypes.includes(fuel)}
                onCheckedChange={(checked) => handleFuelTypeChange(fuel, !!checked)}
              />
              <Label htmlFor={`fuel-${fuel}`} className="text-sm font-normal">{fuel}</Label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>CO₂ Intensity (max {co2Max} kg/MWh)</Label>
        <Slider
          value={[co2Max]}
          onValueChange={([v]) => setState({ co2Max: v })}
          min={0} max={1200} step={50}
        />
      </div>
      <div>
        <Label>Capacity (min {capacityMin} MW)</Label>
        <Slider
          value={[capacityMin]}
          onValueChange={([v]) => setState({ capacityMin: v })}
          min={0} max={5000} step={100}
        />
      </div>
      <div>
        <Label>Regional Overlay</Label>
        <RadioGroup
          value={regionalMetric}
          onValueChange={(v) => setState({ regionalMetric: v as RegionalMetric })}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="r-none" />
            <Label htmlFor="r-none" className="font-normal">None</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="capacity" id="r-capacity" />
            <Label htmlFor="r-capacity" className="font-normal">Total Capacity</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="emissions" id="r-emissions" />
            <Label htmlFor="r-emissions" className="font-normal">Total Emissions</Label>
          </div>
        </RadioGroup>
      </div>
      <div>
        <div className="flex items-center space-x-2">
          <Switch
            id="rps-overlay"
            checked={showRpsOverlay}
            onCheckedChange={(checked) => setState({ showRpsOverlay: checked })}
          />
          <Label htmlFor="rps-overlay">Show RPS Policy Overlay</Label>
        </div>
      </div>
    </div>
  );
}