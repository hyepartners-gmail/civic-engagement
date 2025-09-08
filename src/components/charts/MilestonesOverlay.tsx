"use client";
import { useMemo } from 'react';
import { selectMilestones, Milestone } from '@/lib/selectors/emissions';

interface MilestonesOverlayProps {
  data: { year: number }[];
  visible?: boolean;
}

export default function MilestonesOverlay({ data, visible = true }: MilestonesOverlayProps) {
  const milestones = useMemo(() => selectMilestones(), []);
  
  // Find min and max years in the data for positioning
  const yearRange = useMemo(() => {
    if (data.length === 0) return { min: 1970, max: 2020 };
    const years = data.map(d => d.year);
    return { min: Math.min(...years), max: Math.max(...years) };
  }, [data]);

  if (!visible || data.length === 0) return null;

  return (
    <div className="relative h-4 mt-2">
      {milestones.map((milestone: Milestone) => {
        // Only show milestones within the data range
        if (milestone.year < yearRange.min || milestone.year > yearRange.max) return null;
        
        // Calculate position as percentage
        const position = ((milestone.year - yearRange.min) / (yearRange.max - yearRange.min)) * 100;
        
        let color = 'bg-blue-500';
        if (milestone.category === 'policy') color = 'bg-blue-500';
        if (milestone.category === 'economic') color = 'bg-yellow-500';
        if (milestone.category === 'health') color = 'bg-red-500';
        if (milestone.category === 'environmental') color = 'bg-green-500';
        
        return (
          <div
            key={milestone.year}
            className={`absolute top-0 w-0.5 h-4 ${color}`}
            style={{ left: `${position}%` }}
            aria-label={`${milestone.event} in ${milestone.year}`}
            title={`${milestone.event} (${milestone.year})`}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
              {milestone.event} ({milestone.year})
            </div>
          </div>
        );
      })}
    </div>
  );
}