"use client";
import { useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { StateEnergyData } from "@/lib/energySchema";
import PlantLegend from "@/components/energy/PlantLegend";

// Fix for default icon issues
const defaultIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface PowerPlantMapProps {
  plants: StateEnergyData[];
  usStatesGeoJson: any;
  selectedState: string | null;
  onPlantSelect: (stateCode: string) => void;
}

// Fuel type colors
const fuelColors: Record<string, string> = {
  coal: "#2f4f4f",
  lng: "#8b0000",
  gas: "#8b0000",
  oil: "#ff8c00",
  nuclear: "#9370db",
  dam: "#4169e1",
  hydro: "#4169e1",
  wind: "#00ff7f",
  solar: "#ffff00",
  biomass: "#8b4513",
  geothermal: "#ff6347",
  other_fossil: "#a52a2a",
  other: "#a9a9a9",
  unknown: "#808080",
};

// Fuel type labels
const fuelLabels: Record<string, string> = {
  coal: "Coal",
  lng: "Natural Gas",
  gas: "Natural Gas",
  oil: "Oil",
  nuclear: "Nuclear",
  dam: "Hydroelectric",
  hydro: "Hydroelectric",
  wind: "Wind",
  solar: "Solar",
  biomass: "Biomass",
  geothermal: "Geothermal",
  other_fossil: "Other Fossil Fuels",
  other: "Other",
  unknown: "Unknown",
};

// Helper to create plant markers from coordinates
function createPlantMarkers(plants: StateEnergyData[]) {
  const markers: Array<{
    position: [number, number];
    fuelType: string;
    state: string;
    plantCount: number;
  }> = [];

  if (!plants || plants.length === 0) return markers;

  for (const stateData of plants) {
    if (!stateData?.coordinates_by_fuel) continue;

    for (const [fuelType, coords] of Object.entries(
      stateData.coordinates_by_fuel
    )) {
      if (!Array.isArray(coords)) continue;

      for (const pair of coords) {
        const [lng, lat] = pair as [number, number];
        if (typeof lat !== "number" || typeof lng !== "number") continue;

        markers.push({
          position: [lat, lng],
          fuelType,
          state: stateData.state,
          plantCount: stateData.counts_by_fuel?.[fuelType] || 0,
        });
      }
    }
  }

  return markers;
}

export default function PowerPlantMap({
  plants,
  usStatesGeoJson,
  selectedState,
  onPlantSelect,
}: PowerPlantMapProps) {
  // Debug (safe to keep while stabilizing)
  useEffect(() => {
    // console.log("PowerPlantMap plants:", plants?.length);
    // console.log("PowerPlantMap geojson features:", usStatesGeoJson?.features?.length);
  }, [plants, usStatesGeoJson]);

  const plantMarkers = useMemo(() => createPlantMarkers(plants), [plants]);

  const regionalStyle = (feature: any) => {
    const abbr = feature?.properties?.state;
    const isSelected = selectedState === abbr;
    return {
      fillColor: isSelected ? "#1e40af" : "#cbd5e1",
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? "#1e40af" : "#94a3b8",
      dashArray: "3",
      fillOpacity: isSelected ? 0.7 : 0.3,
    };
  };

  if (!usStatesGeoJson) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-500">Error: GeoJSON data not available</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        className="h-full w-full rounded-lg z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <GeoJSON
          data={usStatesGeoJson}
          style={regionalStyle}
          onEachFeature={(feature, layer) => {
            const abbr = feature?.properties?.state;
            if (!abbr) return;
            layer.on("click", () => onPlantSelect(abbr));
          }}
        />

        {plantMarkers.map((marker, i) => (
          <CircleMarker
            key={`${marker.state}-${marker.fuelType}-${i}`}
            center={marker.position}
            radius={4}
            fillColor={fuelColors[marker.fuelType] || fuelColors.unknown}
            color="#000"
            weight={0.5}
            opacity={1}
            fillOpacity={0.8}
            eventHandlers={{ click: () => onPlantSelect(marker.state) }}
          >
            <Popup>
              <div className="text-sm">
                <h4 className="font-bold">{marker.state} Power Plant</h4>
                <p>
                  <strong>Fuel Type:</strong>{" "}
                  {fuelLabels[marker.fuelType] || marker.fuelType}
                </p>
                <p>
                  <strong>Coordinates:</strong>{" "}
                  {marker.position[0].toFixed(4)}, {marker.position[1].toFixed(4)}
                </p>
                {marker.plantCount > 0 && (
                  <p>
                    <strong>Plants of this type:</strong> {marker.plantCount}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="absolute top-4 right-4 z-10 bg-white p-2 rounded shadow">
        <p className="text-sm font-medium">
          Showing {plantMarkers.length} power plants
        </p>
      </div>

      <div className="absolute bottom-4 left-4 z-10">
        <PlantLegend />
      </div>
    </div>
  );
}
