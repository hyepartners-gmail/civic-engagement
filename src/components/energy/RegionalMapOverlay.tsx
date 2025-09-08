"use client";
import { useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import { FeatureCollection } from 'geojson';

interface RegionalMapOverlayProps {
  usStatesGeoJson: FeatureCollection;
  regionalData: Record<string, { 
    capacity: number; 
    generation: number; 
    emissions: number;
    renewable_generation: number;
    renewable_share: number;
  }>;
  metric: 'capacity' | 'generation' | 'emissions' | 'renewable_share';
  onRegionSelect?: (regionId: string) => void;
}

const MapController = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

export default function RegionalMapOverlay({ 
  usStatesGeoJson, 
  regionalData, 
  metric,
  onRegionSelect
}: RegionalMapOverlayProps) {
  // Create color scale based on the selected metric
  const colorScale = useMemo(() => {
    const values = Object.values(regionalData).map(d => {
      if (metric === 'renewable_share') return d.renewable_share;
      if (metric === 'capacity') return d.capacity;
      if (metric === 'generation') return d.generation;
      return d.emissions;
    });
    
    return scaleLinear<string>()
      .domain([Math.min(...values), Math.max(...values)])
      .range(['#FFE0E0', '#FF4D4D']); // Light to dark red scale
  }, [regionalData, metric]);

  // Style function for GeoJSON features
  const style = (feature: any) => {
    const stateAbbr = feature.properties.abbr;
    const data = regionalData[stateAbbr];
    
    if (!data) {
      return {
        fillColor: '#CCCCCC',
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.5
      };
    }
    
    const value = metric === 'renewable_share' ? data.renewable_share :
                  metric === 'capacity' ? data.capacity :
                  metric === 'generation' ? data.generation :
                  data.emissions;
    
    return {
      fillColor: colorScale(value),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  // Event handlers for GeoJSON features
  const onEachFeature = (feature: any, layer: any) => {
    const stateAbbr = feature.properties.abbr;
    const stateName = feature.properties.name;
    const data = regionalData[stateAbbr];
    
    if (data) {
      layer.bindTooltip(`
        <div class="text-sm">
          <strong>${stateName}</strong><br/>
          ${metric === 'renewable_share' ? 'Renewable Share' : 
            metric === 'capacity' ? 'Capacity' :
            metric === 'generation' ? 'Generation' : 'Emissions'}: 
          ${metric === 'renewable_share' ? data.renewable_share.toFixed(1) + '%' :
            metric === 'capacity' ? data.capacity.toLocaleString() + ' MW' :
            metric === 'generation' ? data.generation.toLocaleString() + ' MWh' :
            data.emissions.toLocaleString() + ' tons'}
        </div>
      `);
      
      if (onRegionSelect) {
        layer.on({
          click: () => onRegionSelect(stateAbbr)
        });
      }
    }
  };

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        className="h-full w-full"
        zoomControl={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
      >
        <MapController center={[39.8283, -98.5795]} zoom={4} />
        <GeoJSON
          data={usStatesGeoJson}
          style={style}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
    </div>
  );
}