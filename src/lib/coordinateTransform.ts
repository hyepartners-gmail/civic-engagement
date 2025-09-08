// Coordinate transformation utilities for converting between coordinate systems

// The proposed plan GeoJSON files have been corrected and are now in WGS84 (EPSG:4326)
// No transformation is needed - just pass through the coordinates
const transformCoordinate = (x: number, y: number): [number, number] => {
  // The coordinates are already in WGS84 format (longitude, latitude)
  // Just return them as-is
  return [x, y];
};

// Transform GeoJSON coordinates from EPSG:9311 to EPSG:4326
export const transformGeoJSON = (geoJson: any): any => {
  if (!geoJson || !geoJson.features) return geoJson;
  
  const transformCoordinates = (coords: any): any => {
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      // Single coordinate pair
      return transformCoordinate(coords[0], coords[1]);
    } else if (Array.isArray(coords)) {
      // Array of coordinates (could be nested)
      return coords.map(transformCoordinates);
    }
    return coords;
  };
  
  return {
    ...geoJson,
    features: geoJson.features.map((feature: any) => ({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: transformCoordinates(feature.geometry.coordinates)
      }
    }))
  };
};