"use client";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/shared/Card";

interface PivotSelectorProps {
  scope: 'city' | 'state' | 'national';
  metricSet: string;
  city: string;
  stateId: string;
  onScopeChange: (scope: 'city' | 'state' | 'national') => void;
  onMetricSetChange: (metricSet: string) => void;
  onCityChange: (city: string) => void;
  onStateChange: (stateId: string) => void;
}

const METRIC_SETS = [
  { id: 'temperature', name: 'Temperature' },
  { id: 'precipitation', name: 'Precipitation' },
  { id: 'extremes', name: 'Climate Extremes' },
  { id: 'disasters', name: 'Disasters' },
  { id: 'emissions', name: 'Emissions' },
  { id: 'wildfire', name: 'Wildfire' },
  { id: 'all', name: 'All Metrics' },
];

const CITIES = [
  { id: 'seattle', name: 'Seattle, WA' },
  { id: 'los-angeles', name: 'Los Angeles, CA' },
  { id: 'chicago', name: 'Chicago, IL' },
  { id: 'new-york', name: 'New York, NY' },
  { id: 'houston', name: 'Houston, TX' },
  { id: 'atlanta', name: 'Atlanta, GA' },
];

const STATES = [
  { id: 'wa', name: 'Washington' },
  { id: 'ca', name: 'California' },
  { id: 'il', name: 'Illinois' },
  { id: 'ny', name: 'New York' },
  { id: 'tx', name: 'Texas' },
  { id: 'ga', name: 'Georgia' },
];

export default function PivotSelector({
  scope,
  metricSet,
  city,
  stateId,
  onScopeChange,
  onMetricSetChange,
  onCityChange,
  onStateChange
}: PivotSelectorProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Geography Scope</Label>
          <Select value={scope} onValueChange={(value) => onScopeChange(value as "city" | "state" | "national")}>
            <SelectTrigger>
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="city">City</SelectItem>
              <SelectItem value="state">State</SelectItem>
              <SelectItem value="national">National</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="metric-set">Metric Set</Label>
          <Select value={metricSet} onValueChange={onMetricSetChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select metric set" />
            </SelectTrigger>
            <SelectContent>
              {METRIC_SETS.map(set => (
                <SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {scope === 'city' && (
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Select value={city} onValueChange={onCityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {scope === 'state' && (
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select value={stateId} onValueChange={onStateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {STATES.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </Card>
  );
}