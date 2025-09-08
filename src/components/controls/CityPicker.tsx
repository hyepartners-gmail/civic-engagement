"use client";
import { useClimateState } from '@/hooks/useClimateState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

const CITIES = [
  { id: 'seattle', name: 'Seattle, WA' },
  { id: 'los-angeles', name: 'Los Angeles, CA' },
  { id: 'chicago', name: 'Chicago, IL' },
  { id: 'houston', name: 'Houston, TX' },
  { id: 'atlanta', name: 'Atlanta, GA' },
  { id: 'new-york', name: 'New York, NY' },
];

export default function CityPicker() {
  const { city, setCity } = useClimateState();

  return (
    <div>
      <Label htmlFor="city-picker" className="text-xs text-platform-text/80">City</Label>
      <Select value={city} onValueChange={setCity}>
        <SelectTrigger className="w-40 h-8 bg-platform-contrast border-platform-accent/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
          {CITIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}