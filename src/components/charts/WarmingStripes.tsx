"use client";

import { useRef, useEffect, useState, useMemo } from 'react';
import { useClimateState } from '@/hooks/useClimateState';
import { perf } from '@/lib/perf';
import { logger } from '@/lib/logger';

interface WarmingStripesProps {
  data: [number, number | null][];
  showCrosshair?: boolean;
}

export default function WarmingStripes({ data, showCrosshair = true }: WarmingStripesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [hoveredTemp, setHoveredTemp] = useState<number | null>(null);
  const { setYear } = useClimateState();
  
  // Memoize filtered data to prevent recreation on every render
  const validData = useMemo(() => {
    return data.filter(([_, value]) => value !== null) as [number, number][];
  }, [data]);
  
  // Memoize min and max years and values
  const { minYear, maxYear, minTemp, maxTemp } = useMemo(() => {
    const minYear = validData.length > 0 ? validData[0][0] : 0;
    const maxYear = validData.length > 0 ? validData[validData.length - 1][0] : 0;
    
    const tempValues = validData.map(([_, value]) => value);
    const minTemp = tempValues.length > 0 ? Math.min(...tempValues) : 0;
    const maxTemp = tempValues.length > 0 ? Math.max(...tempValues) : 0;
    
    return { minYear, maxYear, minTemp, maxTemp };
  }, [validData]);
  
  // Format temperature with sign
  const formatTemp = (temp: number): string => {
    return `${temp >= 0 ? '+' : ''}${temp.toFixed(1)}°C`;
  };
  
  // Color scale function - blue to red
  const getColor = (temp: number): string => {
    // Normalize temperature to -1 to 1 range
    const normalized = (temp - minTemp) / (maxTemp - minTemp) * 2 - 1;
    
    // Convert to RGB
    let r, g, b;
    
    if (normalized < 0) {
      // Blue for cold (negative anomalies)
      r = Math.round(255 * (1 + normalized));
      g = Math.round(255 * (1 + normalized));
      b = 255;
    } else {
      // Red for hot (positive anomalies)
      r = 255;
      g = Math.round(255 * (1 - normalized));
      b = Math.round(255 * (1 - normalized));
    }
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  // Draw the warming stripes
  useEffect(() => {
    if (!canvasRef.current || validData.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Start performance measurement
    perf.mark('draw-warming-stripes-start');
    
    // Set canvas dimensions to match container
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = (container.clientHeight || 200) - 20; // Reduce height to make room for x-axis
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate stripe width
    const stripeWidth = canvas.width / validData.length;
    
    // Draw each stripe
    validData.forEach(([year, temp], index) => {
      const x = index * stripeWidth;
      
      // Set color based on temperature
      ctx.fillStyle = getColor(temp);
      
      // Draw rectangle
      ctx.fillRect(x, 0, stripeWidth + 1, canvas.height); // +1 to avoid gaps
    });
    
    // End performance measurement
    perf.mark('draw-warming-stripes-end');
    perf.measure('warming-stripes-render', 'draw-warming-stripes-start', 'draw-warming-stripes-end');
    
    // Log the event
    logger.event('warming_stripes_render', { 
      data_points: validData.length,
      min_year: minYear,
      max_year: maxYear,
      min_temp: minTemp,
      max_temp: maxTemp
    });
    
  }, [validData, minTemp, maxTemp, minYear, maxYear]);
  
  // Handle mouse move for crosshair and temperature
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || validData.length === 0) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Calculate year index based on mouse position
    const stripeWidth = canvas.width / validData.length;
    const index = Math.floor(x / stripeWidth);
    
    if (index >= 0 && index < validData.length) {
      const [year, temp] = validData[index];
      setHoveredYear(year);
      setHoveredTemp(temp);
      
      if (showCrosshair) {
        setYear(year);
        // Pass the temperature to the global state for YearReadout
        window.hoveredTemp = temp;
      }
    }
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredYear(null);
    setHoveredTemp(null);
    window.hoveredTemp = null;
  };
  
  return (
    <div className="relative h-48 w-full">
      {/* Canvas container */}
      <div className="h-full">
        <canvas 
          ref={canvasRef} 
          className="w-full h-[calc(100%-20px)]"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        
        {/* X-axis labels container - positioned below the canvas */}
        <div className="h-5 w-full relative">
          <div className="absolute left-0 right-0 flex justify-between text-xs text-white/70 px-2">
            <span>{minYear}</span>
            <span>{maxYear}</span>
          </div>
        </div>
      </div>
      
      {/* Crosshair overlay */}
      {showCrosshair && hoveredYear !== null && (
        <div className="absolute top-0 bottom-5 w-px bg-white/50 pointer-events-none"
          style={{
            left: `${(validData.findIndex(([year]) => year === hoveredYear) + 0.5) * 100 / validData.length}%`
          }}
        />
      )}
      
      {/* Legend */}
      <div className="absolute top-0 right-0 bg-black/30 text-white text-xs p-1 rounded m-1">
        <div className="flex items-center">
          <div className="w-3 h-3 mr-1" style={{ backgroundColor: getColor(minTemp) }}></div>
          <span>{formatTemp(minTemp)}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 mr-1" style={{ backgroundColor: getColor(maxTemp) }}></div>
          <span>{formatTemp(maxTemp)}</span>
        </div>
      </div>
    </div>
  );
}