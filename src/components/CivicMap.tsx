"use client";

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
import { colors } from '../lib/theme'; // Import centralized colors

// Fix for default icon issues with Webpack
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface CivicMapProps {
  geoJsonData: any; // GeoJSON object for the district/region boundary
  center: [number, number]; // [latitude, longitude] for initial map center
  zoom: number; // Initial zoom level
  onFeatureHover?: (properties: any) => void;
  onFeatureLeave?: () => void;
}

const MapUpdater: React.FC<{ center: [number, number]; zoom: number; geoJsonData: any }> = ({ center, zoom, geoJsonData }) => {
  const map = useMap();
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  useEffect(() => {
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }
    if (geoJsonData) {
      geoJsonLayerRef.current = L.geoJSON(geoJsonData, {
        style: {
          color: colors.platform.accent, // Accent color for boundary
          weight: 3,
          opacity: 0.7,
          fillColor: colors.platform.accent, // Accent color with some transparency
          fillOpacity: 0.2,
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.name) {
            layer.bindTooltip(feature.properties.name, { sticky: true });
          }
          // Add hover effects if needed
          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({
                weight: 5,
                color: colors.platform.text, // Brighten to white
                dashArray: '',
                fillOpacity: 0.4,
              });
              l.bringToFront();
            },
            mouseout: (e) => {
              geoJsonLayerRef.current?.resetStyle(e.target);
            },
          });
        },
      }).addTo(map);
      map.fitBounds(geoJsonLayerRef.current.getBounds()); // Fit map to GeoJSON bounds
    }
  }, [geoJsonData, map]);

  return null;
};

const CivicMap: React.FC<CivicMapProps> = ({ geoJsonData, center, zoom }) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false} // Disable scroll zoom to prevent interference with page scroll
      className="h-[300px] w-full rounded-lg z-0" // Ensure map has a height and width
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} zoom={zoom} geoJsonData={geoJsonData} />
    </MapContainer>
  );
};

export default CivicMap;