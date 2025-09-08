"use client";
import { useState } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface Callout {
  year: number;
  title: string;
  description: string;
  type: 'flood' | 'drought' | 'wildfire' | 'hurricane' | 'severe-storm' | 'winter-storm';
}

const CALLOUTS: Callout[] = [
  {
    year: 1930,
    title: 'Dust Bowl Begins',
    description: 'Severe drought and poor farming practices led to massive soil erosion across the Great Plains.',
    type: 'drought'
  },
  {
    year: 1936,
    title: 'Dust Bowl Peak',
    description: 'The worst years of the Dust Bowl, with massive dust storms affecting millions of acres.',
    type: 'drought'
  },
  {
    year: 1988,
    title: 'Summer Heat Wave',
    description: 'One of the worst droughts in U.S. history, affecting much of the central and eastern United States.',
    type: 'drought'
  },
  {
    year: 2005,
    title: 'Hurricane Katrina',
    description: 'One of the deadliest and most destructive hurricanes in U.S. history, causing massive flooding in New Orleans.',
    type: 'hurricane'
  },
  {
    year: 2017,
    title: 'Hurricane Harvey',
    description: 'Catastrophic flooding in Houston, Texas, from unprecedented rainfall.',
    type: 'flood'
  },
  {
    year: 2020,
    title: 'Western Wildfires',
    description: 'Record-breaking wildfire season across the western United States, burning over 10 million acres.',
    type: 'wildfire'
  }
];

const TYPE_COLORS: Record<string, string> = {
  flood: 'border-blue-500 bg-blue-500/10',
  drought: 'border-yellow-500 bg-yellow-500/10',
  wildfire: 'border-red-500 bg-red-500/10',
  hurricane: 'border-purple-500 bg-purple-500/10',
  'severe-storm': 'border-green-500 bg-green-500/10',
  'winter-storm': 'border-cyan-500 bg-cyan-500/10'
};

interface StoryCalloutsProps {
  activeYear: number | null;
  onYearSelect?: (year: number) => void;
}

export default function StoryCallouts({ activeYear, onYearSelect }: StoryCalloutsProps) {
  const [openCallout, setOpenCallout] = useState<number | null>(null);

  const handleCalloutClick = (year: number) => {
    if (onYearSelect) {
      onYearSelect(year);
    }
    setOpenCallout(openCallout === year ? null : year);
  };

  if (CALLOUTS.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Notable Events</h3>
      <div className="space-y-3">
        {CALLOUTS.map((callout) => (
          <div
            key={callout.year}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              TYPE_COLORS[callout.type]
            } ${
              activeYear === callout.year
                ? 'ring-2 ring-platform-accent scale-[1.02]'
                : 'hover:scale-[1.01]'
            }`}
            onClick={() => handleCalloutClick(callout.year)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{callout.year}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-platform-contrast">
                    {callout.type.charAt(0).toUpperCase() + callout.type.slice(1)}
                  </span>
                </div>
                <h4 className="font-medium mt-1">{callout.title}</h4>
                <p className="text-sm text-platform-text/80 mt-1">{callout.description}</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-platform-text/60 flex-shrink-0 mt-1 ml-2" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to highlight this event on the chart</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}