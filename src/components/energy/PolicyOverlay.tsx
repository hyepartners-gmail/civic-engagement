"use client";
import { useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { FeatureCollection } from 'geojson';

interface PolicyOverlayProps {
  usStatesGeoJson: FeatureCollection;
  rpsData: Record<string, { target: number | null; year: number | null; notes: string }>;
  onRegionSelect?: (regionId: string) => void;
}

export default function PolicyOverlay({ 
  usStatesGeoJson, 
  rpsData,
  onRegionSelect
}: PolicyOverlayProps) {
  // Create color scale based on RPS targets
  const rpsColorScale = useMemo(() => {
    const targets = Object.values(rpsData)
      .map(d => d.target)
      .filter(t => t !== null) as number[];
    
    if (targets.length === 0) return null;
    
    return scaleLinear<string>()
      .domain([0, Math.max(...targets)])
      .range(['#E8F5E9', '#1B5E20']); // Light to Dark Green
  }, [rpsData]);

  // Style function for GeoJSON features
  const style = (feature: any) => {
    const stateAbbr = feature.properties.abbr;
    const rps = rpsData[stateAbbr];
    
    if (!rps || rps.target === null) {
      return {
        fillColor: '#BDBDBD', // Gray for no target
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
      };
    }
    
    const fillColor = rpsColorScale ? rpsColorScale(rps.target) : '#808080';
    
    return {
      fillColor,
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.8
    };
  };

  // Event handlers for GeoJSON features
  const onEachFeature = (feature: any, layer: any) => {
    const stateAbbr = feature.properties.abbr;
    const stateName = feature.properties.name;
    const rps = rpsData[stateAbbr];
    
    if (rps) {
      const tooltipContent = rps.target !== null 
        ? `<strong>${stateName}</strong><br/>${rps.target}% by ${rps.year}<br/>${rps.notes}`
        : `<strong>${stateName}</strong><br/>No RPS target<br/>${rps.notes}`;
      
      layer.bindTooltip(tooltipContent);
      
      if (onRegionSelect) {
        layer.on({
          click: () => onRegionSelect(stateAbbr)
        });
      }
    }
  };

  return (
    <div className="h-full w-full">
      {/* This component would be integrated with the main map */}
      <div className="text-sm text-platform-text/70">
        <h4 className="font-semibold mb-2">Renewable Portfolio Standards</h4>
        <p>RPS targets by state. Darker green indicates higher renewable energy targets.</p>
        <div className="mt-2 flex items-center">
          <div className="w-4 h-4 bg-gray-300 mr-2"></div>
          <span>No target</span>
        </div>
        <div className="mt-1 flex items-center">
          <div className="w-4 h-4 bg-green-200 mr-2"></div>
          <span>Low target</span>
        </div>
        <div className="mt-1 flex items-center">
          <div className="w-4 h-4 bg-green-800 mr-2"></div>
          <span>High target</span>
        </div>
      </div>
    </div>
  );
}