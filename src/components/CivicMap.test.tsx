import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CivicMap from './CivicMap';
import * as ReactLeaflet from 'react-leaflet';
import L from 'leaflet';

// Mock Leaflet and react-leaflet components/hooks
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, className }: any) => (
    <div data-testid="map-container" data-center={center} data-zoom={zoom} className={className}>
      {children}
    </div>
  ),
  TileLayer: ({ url }: any) => <div data-testid="tile-layer" data-url={url}></div>,
  GeoJSON: ({ data, style, onEachFeature }: any) => (
    <div data-testid="geojson-layer" data-data={JSON.stringify(data)} data-style={JSON.stringify(style)}>
      {/* Simulate onEachFeature being called */}
      {data && data.features && data.features.map((feature: any, index: number) => (
        <div key={index} data-testid={`geojson-feature-${index}`}>
          {onEachFeature && onEachFeature(feature, { bindTooltip: jest.fn(), on: jest.fn(), setStyle: jest.fn(), bringToFront: jest.fn() })}
        </div>
      ))}
    </div>
  ),
  useMap: jest.fn(),
}));

// Mock Leaflet itself for methods like L.geoJSON and L.Icon.Default
jest.mock('leaflet', () => ({
  ...jest.requireActual('leaflet'), // Import and retain default exports
  __esModule: true, // This is important for mocking default exports
  Map: jest.fn(() => ({
    setView: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn(),
  })),
  geoJSON: jest.fn((data, options) => ({
    addTo: jest.fn(),
    getBounds: jest.fn(() => ({
      isValid: () => true, // Mock a valid bounds object
      getNorthEast: () => ({ lat: 38, lng: -121 }),
      getSouthWest: () => ({ lat: 37, lng: -123 }),
    })),
    options: options, // Store options for assertion
    data: data, // Store data for assertion
  })),
  Icon: {
    Default: {
      mergeOptions: jest.fn(),
      _getIconUrl: jest.fn(), // Mock the problematic property
    },
  },
}));

describe('CivicMap', () => {
  const mockGeoJsonData = {
    type: "FeatureCollection",
    bbox: [-122.514, 37.708, -122.357, 37.832],
    features: [{
      type: "Feature",
      properties: { name: "Test District" },
      geometry: { type: "Polygon", coordinates: [[[]]] }
    }]
  };
  const mockCenter: [number, number] = [34.0522, -118.2437];
  const mockZoom = 10;

  let mockMapInstance: any;
  let mockGeoJsonLayerInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the map instance returned by useMap
    mockMapInstance = {
      setView: jest.fn(),
      removeLayer: jest.fn(),
      fitBounds: jest.fn(),
    };
    (ReactLeaflet.useMap as jest.Mock).mockReturnValue(mockMapInstance);

    // Mock the L.geoJSON instance
    mockGeoJsonLayerInstance = {
      addTo: jest.fn(),
      getBounds: jest.fn(() => ({
        isValid: () => true,
        getNorthEast: () => ({ lat: 38, lng: -121 }),
        getSouthWest: () => ({ lat: 37, lng: -123 }),
      })),
      options: {},
      data: {},
      on: jest.fn(), // Mock the 'on' method for event listeners
      resetStyle: jest.fn(), // Mock resetStyle
    };
    (L.geoJSON as jest.Mock).mockReturnValue(mockGeoJsonLayerInstance);
  });

  it('renders MapContainer and TileLayer', () => {
    render(<CivicMap geoJsonData={null} center={mockCenter} zoom={mockZoom} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
    expect(screen.getByTestId('map-container')).toHaveAttribute('data-center', String(mockCenter));
    expect(screen.getByTestId('map-container')).toHaveAttribute('data-zoom', String(mockZoom));
  });

  it('does not render GeoJSON layer if geoJsonData is null', () => {
    render(<CivicMap geoJsonData={null} center={mockCenter} zoom={mockZoom} />);
    expect(screen.queryByTestId('geojson-layer')).not.toBeInTheDocument();
    expect(L.geoJSON).not.toHaveBeenCalled();
  });

  it('renders GeoJSON layer and fits bounds when geoJsonData is provided', async () => {
    render(<CivicMap geoJsonData={mockGeoJsonData} center={mockCenter} zoom={mockZoom} />);

    await waitFor(() => {
      expect(screen.getByTestId('geojson-layer')).toBeInTheDocument();
      expect(L.geoJSON).toHaveBeenCalledWith(mockGeoJsonData, expect.any(Object));
      expect(mockGeoJsonLayerInstance.addTo).toHaveBeenCalledWith(mockMapInstance);
      expect(mockMapInstance.fitBounds).toHaveBeenCalledWith(mockGeoJsonLayerInstance.getBounds());
    });
  });

  it('updates map view when center or zoom props change', async () => {
    const { rerender } = render(<CivicMap geoJsonData={null} center={mockCenter} zoom={mockZoom} />);
    expect(mockMapInstance.setView).toHaveBeenCalledWith(mockCenter, mockZoom);

    const newCenter: [number, number] = [35.0, -100.0];
    const newZoom = 12;
    rerender(<CivicMap geoJsonData={null} center={newCenter} zoom={newZoom} />);

    await waitFor(() => {
      expect(mockMapInstance.setView).toHaveBeenCalledWith(newCenter, newZoom);
      expect(mockMapInstance.setView).toHaveBeenCalledTimes(2); // Initial call + update
    });
  });

  it('removes old GeoJSON layer and adds new one when geoJsonData changes', async () => {
    const { rerender } = render(<CivicMap geoJsonData={mockGeoJsonData} center={mockCenter} zoom={mockZoom} />);
    await waitFor(() => expect(L.geoJSON).toHaveBeenCalledTimes(1));

    const newGeoJsonData = { ...mockGeoJsonData, features: [{ ...mockGeoJsonData.features[0], properties: { name: "New District" } }] };
    rerender(<CivicMap geoJsonData={newGeoJsonData} center={mockCenter} zoom={mockZoom} />);

    await waitFor(() => {
      expect(mockMapInstance.removeLayer).toHaveBeenCalledTimes(1);
      expect(L.geoJSON).toHaveBeenCalledTimes(2); // Old and new GeoJSON
      expect(L.geoJSON).toHaveBeenCalledWith(newGeoJsonData, expect.any(Object));
    });
  });

  it('applies correct default styling to GeoJSON layer', async () => {
    render(<CivicMap geoJsonData={mockGeoJsonData} center={mockCenter} zoom={mockZoom} />);
    await waitFor(() => {
      expect(L.geoJSON).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        style: {
          color: '#a259ff',
          weight: 3,
          opacity: 0.7,
          fillColor: '#a259ff',
          fillOpacity: 0.2,
        },
      }));
    });
  });
});