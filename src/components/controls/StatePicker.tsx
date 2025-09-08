"use client";
import { useClimateState } from '@/hooks/useClimateState';
import { useUrlState } from '@/hooks/useUrlState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

// Map cities to states
const CITY_TO_STATE: Record<string, string> = {
  'seattle': 'wa',
  'los-angeles': 'ca',
  'chicago': 'il',
  'houston': 'tx',
  'atlanta': 'ga',
  'new-york': 'ny'
};

// State names mapping
const STATE_NAMES: Record<string, string> = {
  'national': 'National Average',
  'wa': 'Washington',
  'ca': 'California',
  'il': 'Illinois',
  'tx': 'Texas',
  'ga': 'Georgia',
  'ny': 'New York'
};

const STATES = [
  { id: 'national', name: 'National Average' },
  { id: 'wa', name: 'Washington' },
  { id: 'ca', name: 'California' },
  { id: 'il', name: 'Illinois' },
  { id: 'tx', name: 'Texas' },
  { id: 'ga', name: 'Georgia' },
  { id: 'ny', name: 'New York' },
];

export default function StatePicker() {
  const { city, state, setState } = useClimateState();
  const [urlState, setUrlState] = useUrlState<string | null>('state', null);

  // If no state is selected in URL, default to the state of the selected city
  const effectiveStateId = urlState || CITY_TO_STATE[city] || 'wa';

  const handleStateChange = (value: string) => {
    setState({ state: value });
    setUrlState(value);
  };

  return (
    <div className="relative">
      <Label htmlFor="state-picker" className="text-xs text-platform-text">State</Label>
      <Select value={effectiveStateId} onValueChange={handleStateChange}>
        <SelectTrigger id="state-picker" className="w-40 h-8 bg-platform-contrast border-platform-accent text-platform-text">
          <SelectValue placeholder="Select state" />
        </SelectTrigger>
        <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
          {STATES.map(s => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}