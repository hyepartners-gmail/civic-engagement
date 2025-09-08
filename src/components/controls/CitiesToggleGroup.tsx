"use client";

import { useClimateState } from '@/hooks/useClimateState';
import { useUrlState } from '@/hooks/useUrlState';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/shared/Card';
import { useMemo, useCallback } from 'react';

const CITIES = [
  { id: 'seattle', name: 'Seattle, WA' },
  { id: 'los-angeles', name: 'Los Angeles, CA' },
  { id: 'chicago', name: 'Chicago, IL' },
  { id: 'houston', name: 'Houston, TX' },
  { id: 'atlanta', name: 'Atlanta, GA' },
  { id: 'new-york', name: 'New York, NY' },
];

// Color palette for cities - following the category10 scheme
export const CITY_COLORS: Record<string, string> = {
  'seattle': '#1f77b4',
  'los-angeles': '#ff7f0e',
  'chicago': '#2ca02c',
  'houston': '#d62728',
  'atlanta': '#9467bd',
  'new-york': '#8c564b',
};

export default function CitiesToggleGroup() {
  const [selectedCitiesParam, setSelectedCities] = useUrlState<string | string[]>('cities', ['seattle']);
  
  // Normalize selectedCities to ensure it's always an array
  const selectedCities = useMemo(() => {
    if (Array.isArray(selectedCitiesParam)) {
      return selectedCitiesParam;
    }
    return selectedCitiesParam ? [selectedCitiesParam] : ['seattle'];
  }, [selectedCitiesParam]);

  const toggleCity = useCallback((cityId: string) => {
    if (selectedCities.includes(cityId)) {
      // Don't allow removing all cities
      if (selectedCities.length > 1) {
        setSelectedCities(selectedCities.filter(id => id !== cityId));
      }
    } else {
      setSelectedCities([...selectedCities, cityId]);
    }
  }, [selectedCities, setSelectedCities]);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-platform-text/80 block">Compare Cities</Label>
      <div className="flex flex-wrap gap-2">
        {CITIES.map(city => (
          <Button
            key={city.id}
            variant={selectedCities.includes(city.id) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleCity(city.id)}
            className="flex items-center gap-1.5 h-8"
            style={{
              backgroundColor: selectedCities.includes(city.id) 
                ? CITY_COLORS[city.id] 
                : 'transparent',
              borderColor: CITY_COLORS[city.id],
              color: selectedCities.includes(city.id) ? 'white' : CITY_COLORS[city.id]
            }}
          >
            <span 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CITY_COLORS[city.id] }}
            />
            {city.name}
          </Button>
        ))}
      </div>
    </div>
  );
}