"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface CompareControlsProps {
  cities: string[] | string;
  onCitiesChange: (cities: string[]) => void;
  syncY: boolean;
  onSyncYChange: (syncY: boolean) => void;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  allCities: Record<string, string>;
}

export default function CompareControls({
  cities,
  onCitiesChange,
  syncY,
  onSyncYChange,
  threshold,
  onThresholdChange,
  allCities
}: CompareControlsProps) {
  // Ensure cities is always an array
  const citiesArray = Array.isArray(cities) ? cities : (cities ? [cities] : []);
  
  const [newCity, setNewCity] = useState('');
  
  const addCity = () => {
    if (newCity && !citiesArray.includes(newCity)) {
      onCitiesChange([...citiesArray, newCity]);
      setNewCity('');
    }
  };
  
  const removeCity = (cityId: string) => {
    onCitiesChange(citiesArray.filter(id => id !== cityId));
  };
  
  const availableCities = Object.keys(allCities).filter(id => !citiesArray.includes(id));

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-2 block">Selected Cities</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {citiesArray.map(cityId => (
            <div 
              key={cityId} 
              className="flex items-center bg-platform-contrast/50 border border-platform-accent/30 rounded-full pl-3 pr-2 py-1 text-sm"
            >
              <span className="text-[#12001a] font-medium">{allCities[cityId] || cityId}</span>
              <button 
                onClick={() => removeCity(cityId)}
                className="ml-2 text-platform-accent hover:text-platform-accent/80"
                aria-label={`Remove ${allCities[cityId] || cityId}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        
        {availableCities.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={newCity} onValueChange={setNewCity}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Add a city" />
              </SelectTrigger>
              <SelectContent>
                {availableCities.map(cityId => (
                  <SelectItem key={cityId} value={cityId}>
                    {allCities[cityId] || cityId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addCity} disabled={!newCity}>Add</Button>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center space-x-2">
          <Label htmlFor="sync-y">Sync Y-Axis</Label>
          <Switch
            id="sync-y"
            checked={syncY}
            onCheckedChange={onSyncYChange}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="threshold">Hot Days Threshold</Label>
          <Select 
            value={String(threshold)} 
            onValueChange={(value) => onThresholdChange(Number(value))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90">90°F</SelectItem>
              <SelectItem value="95">95°F</SelectItem>
              <SelectItem value="100">100°F</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
