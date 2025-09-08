"use client";

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { colors } from '../lib/theme';

// Fix for default icon issues
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DistrictProperties {
  id: string;
  name: string;
  population: number;
  population_deviation?: number;
  edges_score?: number;
  partisan_lean?: string;
  packing_cracking_flag?: 'Packed' | 'Cracked' | 'None';
  compactness?: number;
}

interface RedistrictingMapProps {
  selectedState: string | null;
  nationalData: any;
  stateData: any;
  activeLayers: any;
  selectedVoteYear: string;
  onStateClick: (stateCode: string) => void;
  onDistrictClick: (districtProperties: DistrictProperties, voteDataForDistrict: any | null) => void;
}

const getVoteMarginColor = (margin: number, winner: 'D' | 'R' | 'Other') => {
  if (winner === 'D') {
    if (margin > 0.2) return '#00008B';
    if (margin > 0.1) return '#1E90FF';
    return '#ADD8E6';
  }
  if (winner === 'R') {
    if (margin > 0.2) return '#8B0000';
    if (margin > 0.1) return '#DC143C';
    return '#F08080';
  }
  return colors.semantic.info;
};

const getCompactnessColor = (compactness: number) => {
  if (compactness > 0.7) return '#3CB371'; // MediumSeaGreen
  if (compactness > 0.5) return '#FFD700'; // Gold
  return '#FF4500'; // OrangeRed
};

// Define a bounding box for the entire US (including Alaska and Hawaii)
// These coordinates are approximate and may need fine-tuning for perfect fit
const US_BOUNDS: L.LatLngBoundsExpression = [
  [18.0, -170.0], // Southwest (Hawaii/Alaska)
  [72.0, -65.0]   // Northeast (Maine/Alaska)
];

// Component to manage map view updates (zoom, pan, fit bounds)
const MapUpdater: React.FC<{
  selectedState: string | null;
  nationalData: any;
  stateData: any;
  activeLayers: any;
}> = ({ selectedState, nationalData, stateData, activeLayers }) => {
  const map = useMap();
  const initialLoadRef = useRef(true);

  useEffect(() => {
    console.log('[MapUpdater] useEffect triggered. selectedState:', selectedState);

    if (selectedState) {
      // State selected: try to fit to state data
      const dataToFit = 
        (activeLayers.currentDistricts && stateData?.currentDistrictsGeoJson?.features?.length > 0 && stateData.currentDistrictsGeoJson) ||
        (activeLayers.planPopulation && stateData?.proposedPlans.population?.features?.length > 0 && stateData.proposedPlans.population) ||
        (activeLayers.planCompact && stateData?.proposedPlans.compact?.features?.length > 0 && stateData.proposedPlans.compact) ||
        (activeLayers.planCounties && stateData?.proposedPlans.counties?.features?.length > 0 && stateData.proposedPlans.counties) ||
        (activeLayers.planPopulationCenters && stateData?.proposedPlans.populationCenters?.features?.length > 0 && stateData.proposedPlans.populationCenters) ||
        (activeLayers.planVra && stateData?.proposedPlans.vra?.features?.length > 0 && stateData.proposedPlans.vra) ||
        (stateData?.currentDistrictsGeoJson?.features?.length > 0 && stateData.currentDistrictsGeoJson); // Fallback to current if no active proposed

      if (dataToFit) {
        if (selectedState === 'AK') {
            // Special handling for Alaska: fixed view
            console.log('[MapUpdater] Special handling: Setting fixed view for Alaska.');
            map.setView([64.0, -150.0], 3); // Center on mainland Alaska, zoom out slightly
        } else if (selectedState === 'HI') {
            // Special handling for Hawaii: fixed view
            console.log('[MapUpdater] Special handling: Setting fixed view for Hawaii.');
            map.setView([20.0, -157.5], 6); // Center on Hawaii, zoom in more
        } else {
            // For all other states, use fitBounds
            console.log('[MapUpdater] Fitting to selected state data.');
            const layer = L.geoJSON(dataToFit);
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
              map.fitBounds(bounds.pad(0.1));
            } else {
              console.warn('[MapUpdater] Invalid bounds for selected state data. Keeping current view.');
            }
        }
      } else {
        console.log('[MapUpdater] State selected, but no valid state data yet. Keeping current view.');
        // Do nothing, keep current view (which should be US map)
      }
    } else {
      // No state selected: fit to national data (only once on initial load)
      if (initialLoadRef.current && nationalData?.features?.length > 0) {
        console.log('[MapUpdater] Initial load, fitting to national data.');
        // Fit to predefined US bounds
        map.fitBounds(US_BOUNDS);
        initialLoadRef.current = false;
      } else if (!initialLoadRef.current) {
        console.log('[MapUpdater] Not initial load, no state selected. Keeping current view (US map).');
        // Do nothing, stay on US map
      } else {
        console.log('[MapUpdater] Initial load, but no national data. Setting default view.');
        map.setView([39.8283, -98.5795], 4);
        initialLoadRef.current = false;
      }
    }
  }, [selectedState, nationalData, stateData, activeLayers, map]);

  return null;
};

const RedistrictingMap: React.FC<RedistrictingMapProps> = (props) => {
  const { selectedState, nationalData, stateData, activeLayers, selectedVoteYear, onStateClick, onDistrictClick } = props;

  console.log('[RedistrictingMap] Rendering component. Props:', { selectedState, nationalData: !!nationalData, stateData: !!stateData });
  if (nationalData) {
      console.log('[RedistrictingMap] nationalData details:', {
          type: nationalData.type,
          featureCount: nationalData.features?.length || 0,
          firstFeature: nationalData.features?.[0]
      });
  }

  const nationalStyle = {
    color: colors.platform.accent,
    weight: 0.5,
    opacity: 0.6,
    fillColor: colors.platform.contrast,
    fillOpacity: 0.3,
  };

  const onEachNationalFeature = (feature: any, layer: L.Layer) => {
    if (feature?.properties?.state) {
      console.log('[RedistrictingMap] onEachNationalFeature for:', feature.properties.state);
    }
    layer.on('click', () => {
      if (feature.properties.state) {
        onStateClick(feature.properties.state);
      }
    });
  };

  const stateStyle = (feature: any) => {
    const districtId = feature?.properties.id || feature?.properties.GEOID20 || feature?.properties.CD118FP;
    const vote = stateData?.voteData?.[selectedVoteYear]?.[districtId];
    const districtStats = stateData?.evaluationData?.districts?.[districtId] || {};
    
    let fillColor = colors.platform.contrast; // Default fill color
    let weight = 2;
    let opacity = 0.4;

    if (activeLayers.voteMargin && vote) {
      fillColor = getVoteMarginColor(vote.margin, vote.winner);
      opacity = 0.7;
    } else if (activeLayers.compactness && districtStats.compactness !== undefined) {
      fillColor = getCompactnessColor(districtStats.compactness);
      opacity = 0.7;
    }
    
    return { color: colors.platform.accent, weight, fillColor, fillOpacity: opacity };
  };

  const onEachStateFeature = (feature: any, layer: L.Layer) => {
    layer.on('click', () => {
      const districtId = feature.properties.id || feature.properties.GEOID20 || feature.properties.CD118FP;
      const districtStats = stateData?.evaluationData?.districts?.[districtId] || {};
      const voteData = stateData?.voteData?.[selectedVoteYear]?.[districtId] || null;
      onDistrictClick({
        id: districtId,
        name: feature.properties.name || `District ${districtId}`,
        population: districtStats.population || 0,
        compactness: districtStats.compactness,
        population_deviation: districtStats.population_deviation,
        edges_score: districtStats.edges_score,
        partisan_lean: districtStats.partisan_lean,
        packing_cracking_flag: districtStats.packing_cracking_flag,
      }, voteData);
    });
  };

  const getVisibleStateLayers = () => {
    if (!selectedState || !stateData) return null;
    
    const layers = [];
    if (activeLayers.currentDistricts && stateData.currentDistrictsGeoJson) {
      console.log('[RedistrictingMap] Adding currentDistrictsGeoJson layer.');
      layers.push(<GeoJSON key="current" data={stateData.currentDistrictsGeoJson} style={stateStyle} onEachFeature={onEachStateFeature} />);
    }
    if (activeLayers.planPopulation && stateData.proposedPlans.population) {
      console.log('[RedistrictingMap] Adding planPopulation layer.');
      layers.push(<GeoJSON key="population" data={stateData.proposedPlans.population} style={stateStyle} onEachFeature={onEachStateFeature} />);
    }
    if (activeLayers.planCompact && stateData.proposedPlans.compact) {
      console.log('[RedistrictingMap] Adding planCompact layer.');
      layers.push(<GeoJSON key="compact" data={stateData.proposedPlans.compact} style={stateStyle} onEachFeature={onEachStateFeature} />);
    }
    if (activeLayers.planCounties && stateData.proposedPlans.counties) {
      console.log('[RedistrictingMap] Adding planCounties layer.');
      layers.push(<GeoJSON key="counties" data={stateData.proposedPlans.counties} style={stateStyle} onEachFeature={onEachStateFeature} />);
    }
    if (activeLayers.planPopulationCenters && stateData.proposedPlans.populationCenters) {
      console.log('[RedistrictingMap] Adding planPopulationCenters layer.');
      layers.push(<GeoJSON key="populationCenters" data={stateData.proposedPlans.populationCenters} style={stateStyle} onEachFeature={onEachStateFeature} />);
    }
    if (activeLayers.planVra && stateData.proposedPlans.vra) {
      console.log('[RedistrictingMap] Adding planVra layer.');
      layers.push(<GeoJSON key="vra" data={stateData.proposedPlans.vra} style={stateStyle} onEachFeature={onEachStateFeature} />);
    }
    return layers;
  };

  return (
    <MapContainer
      center={[39.8283, -98.5795]}
      zoom={4}
      scrollWheelZoom={true}
      className="h-full w-full rounded-lg z-0"
      style={{ backgroundColor: colors.platform.background }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {!selectedState && nationalData && (
        <>
          {console.log('[RedistrictingMap] Rendering national GeoJSON layer. Data:', nationalData)}
          {console.log('[RedistrictingMap] National data feature count:', nationalData.features?.length || 0)}
          <GeoJSON 
            key="national-layer"
            data={nationalData} 
            style={nationalStyle} 
            onEachFeature={(feature, layer) => {
              console.log('[RedistrictingMap] onEachNationalFeature called for feature:', feature.properties?.state || feature.properties?.name);
              onEachNationalFeature(feature, layer);
            }} 
          />
        </>
      )}

      {getVisibleStateLayers()}

      <MapUpdater
        key={selectedState || 'national'} // Key ensures MapUpdater re-mounts when selectedState changes
        selectedState={selectedState}
        nationalData={nationalData}
        stateData={stateData}
        activeLayers={activeLayers}
      />
    </MapContainer>
  );
};

export default RedistrictingMap;