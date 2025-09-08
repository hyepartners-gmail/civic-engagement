"use client";
import { useMemo } from 'react';

interface EventMarkersProps {
  data: { year: number; events: number | null }[];
  onMarkerClick?: (year: number, events: number) => void;
}

export default function EventMarkers({ data, onMarkerClick }: EventMarkersProps) {
  // Filter out null values and prepare marker data
  const markerData = useMemo(() => {
    return data
      .filter(item => item.events !== null && item.events > 0)
      .map(item => ({
        year: item.year,
        events: item.events as number
      }));
  }, [data]);

  if (markerData.length === 0) {
    return null;
  }

  return (
    <div className="relative h-8 mt-2">
      <div className="absolute top-0 left-0 right-0 h-2 bg-gray-200 rounded"></div>
      {markerData.map((item, index) => (
        <div
          key={index}
          className="absolute top-0 w-4 h-4 bg-red-500 rounded-full cursor-pointer transform -translate-x-2 -translate-y-1 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          style={{ left: `${((item.year - 2000) / (2023 - 2000)) * 100}%` }}
          onClick={() => onMarkerClick?.(item.year, item.events)}
          aria-label={`FEMA heat event declaration in ${item.year} with ${item.events} events`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onMarkerClick?.(item.year, item.events);
            }
          }}
        >
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
            {item.year}: {item.events} event{item.events !== 1 ? 's' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}