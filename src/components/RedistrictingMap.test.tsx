import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RedistrictingMap from './RedistrictingMap';
import * as ReactLeaflet from 'react-leaflet';
import L from 'leaflet';

// Mock Leaflet and react-leaflet components/hooks
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, className, style }: any) => (
    <div data-testid="map-container" data-center={center} data-zoom={zoom} className={className} style={style}>
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
  FeatureGroup: jest.fn((layers) => ({
    getBounds: jest.fn(() => ({
      isValid: () => true,
      getNorthEast: () => ({ lat: 38, lng: -121 }),
      getSouthWest: () => ({ lat: 37, lng: -123 }),
    })),
  })),
}));

describe('RedistrictingMap', () => {
  const mockCurrentDistrictsGeoJson = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { id: "CD-CA-12", name: "Current District 12", population: 750000 },
      geometry: { type: "Polygon", coordinates: [[[]]] }
    }]
  };
  const mockProposedDistrictsGeoJson = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { id: "CD-CA-P1", name: "Proposed District P1", population: 755000 },
      geometry: { type: "Polygon", coordinates: [[[]]] }
    }]
  };
  const mockBlocksGeoJson = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { id: "block-1", population: 120 },
      geometry: { type: "Polygon", coordinates: [[[]]] }
    }]
  };
  const mockVoteData = {
    '2020': {
      'CD-CA-12': { margin: 0.25, winner: 'D' },
      'CD-CA-P1': { margin: 0.15, winner: 'R' },
    },
    '2016': {
      'CD-CA-12': { margin: 0.10, winner: 'D' },
    }
  };
  const mockDistrictStats = {
    'CD-CA-12': { population: 750000, compactness: 0.65, edges_score: 0.7, partisan_lean: "D+26", population_deviation: 0.01, packing_cracking_flag: "None" },
    'CD-CA-P1': { population: 755000, compactness: 0.72, edges_score: 0.8, partisan_lean: "R+10", population_deviation: 0.005, packing_cracking_flag: "Packed" },
  };

  const defaultProps = {
    currentDistrictsGeoJson: mockCurrentDistrictsGeoJson,
    proposedDistrictsGeoJson: mockProposedDistrictsGeoJson,
    blocksGeoJson: mockBlocksGeoJson,
    voteData: mockVoteData,
    districtStats: mockDistrictStats,
    activeLayers: {
      currentDistricts: true,
      proposedDistricts: false,
      populationBlocks: false,
      voteMargin: false,
      compactness: false,
    },
    selectedVoteYear: '2020',
    onDistrictClick: jest.fn(),
  };

  let mockMapInstance: any;
  let mockGeoJsonLayerInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMapInstance = {
      setView: jest.fn(),
      removeLayer: jest.fn(),
      fitBounds: jest.fn(),
    };
    (ReactLeaflet.useMap as jest.Mock).mockReturnValue(mockMapInstance);

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
    render(<RedistrictingMap {...defaultProps} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  it('loads all expected layers based on activeLayers prop', async () => {
    render(<RedistrictingMap {...defaultProps} activeLayers={{ ...defaultProps.activeLayers, proposedDistricts: true, populationBlocks: true }} />);

    await waitFor(() => {
      expect(L.geoJSON).toHaveBeenCalledTimes(3); // Current, Proposed, Blocks
      expect(L.geoJSON).toHaveBeenCalledWith(mockCurrentDistrictsGeoJson, expect.any(Object));
      expect(L.geoJSON).toHaveBeenCalledWith(mockProposedDistrictsGeoJson, expect.any(Object));
      expect(L.geoJSON).toHaveBeenCalledWith(mockBlocksGeoJson, expect.any(Object));
      expect(mockGeoJsonLayerInstance.addTo).toHaveBeenCalledTimes(3);
    });
  });

  it('toggles visibility: removes layer when activeLayers becomes false', async () => {
    const { rerender } = render(<RedistrictingMap {...defaultProps} activeLayers={{ ...defaultProps.activeLayers, currentDistricts: true }} />);
    await waitFor(() => expect(L.geoJSON).toHaveBeenCalledWith(mockCurrentDistrictsGeoJson, expect.any(Object)));

    rerender(<RedistrictingMap {...defaultProps} activeLayers={{ ...defaultProps.activeLayers, currentDistricts: false }} />);
    await waitFor(() => {
      expect(mockMapInstance.removeLayer).toHaveBeenCalledTimes(1);
    });
  });

  it('applies vote margin colors when voteMargin is active', async () => {
    render(<RedistrictingMap {...defaultProps} activeLayers={{ ...defaultProps.activeLayers, proposedDistricts: true, voteMargin: true }} />);

    await waitFor(() => {
      // Check proposed districts layer style
      const proposedGeoJSONCall = (L.geoJSON as jest.Mock).mock.calls.find(call => call[0] === mockProposedDistrictsGeoJson);
      expect(proposedGeoJSONCall).toBeDefined();
      const styleFunction = proposedGeoJSONCall[1].style;
      const style = styleFunction(mockProposedDistrictsGeoJson.features[0]);
      expect(style.fillColor).toBe('#F08080'); // Light Coral for Lean R (CD-CA-P1 margin 0.15)
    });
  });

  it('applies compactness colors when compactness is active', async () => {
    render(<RedistrictingMap {...defaultProps} activeLayers={{ ...defaultProps.activeLayers, proposedDistricts: true, compactness: true }} />);

    await waitFor(() => {
      // Check proposed districts layer style
      const proposedGeoJSONCall = (L.geoJSON as jest.Mock).mock.calls.find(call => call[0] === mockProposedDistrictsGeoJson);
      expect(proposedGeoJSONCall).toBeDefined();
      const styleFunction = proposedGeoJSONCall[1].style;
      const style = styleFunction(mockProposedDistrictsGeoJson.features[0]);
      expect(style.fillColor).toBe('#3CB371'); // Medium Sea Green for compactness 0.72 (CD-CA-P1)
    });
  });

  it('prioritizes vote margin over compactness if both are active', async () => {
    render(<RedistrictingMap {...defaultProps} activeLayers={{ ...defaultProps.activeLayers, proposedDistricts: true, voteMargin: true, compactness: true }} />);

    await waitFor(() => {
      const proposedGeoJSONCall = (L.geoJSON as jest.Mock).mock.calls.find(call => call[0] === mockProposedDistrictsGeoJson);
      const styleFunction = proposedGeoJSONCall[1].style;
      const style = styleFunction(mockProposedDistrictsGeoJson.features[0]);
      expect(style.fillColor).toBe('#F08080'); // Should still be vote margin color
    });
  });

  it('calls onDistrictClick with correct data when a proposed district is clicked', async () => {
    const mockOnDistrictClick = jest.fn();
    render(<RedistrictingMap {...defaultProps} activeLayers={{ ...defaultProps.activeLayers, proposedDistricts: true }} onDistrictClick={mockOnDistrictClick} />);

    await waitFor(() => {
      const proposedGeoJSONCall = (L.geoJSON as jest.Mock).mock.calls.find(call => call[0] === mockProposedDistrictsGeoJson);
      const onEachFeatureFn = proposedGeoJSONCall[1].onEachFeature;

      // Simulate the layer object that onEachFeature expects
      const mockLayer = {
        bindTooltip: jest.fn(),
        on: jest.fn(),
        setStyle: jest.fn(),
        bringToFront: jest.fn(),
      };

      // Call onEachFeature to set up the click listener
      onEachFeatureFn(mockProposedDistrictsGeoJson.features[0], mockLayer);

      // Simulate a click on the layer
      const clickHandler = mockLayer.on.mock.calls.find(call => call[0] === 'click')[1];
      clickHandler();

      expect(mockOnDistrictClick).toHaveBeenCalledTimes(1);
      expect(mockOnDistrictClick).toHaveBeenCalledWith(
        {
          id: 'CD-CA-P1',
          name: 'Proposed District P1',
          population: 755000,
          population_deviation: 0.005,
          edges_score: 0.8,
          partisan_lean: 'R+10',
          packing_cracking_flag: 'Packed',
        },
        { margin: 0.15, winner: 'R' }
      );
    });
  });

  it('updates map view and fits bounds when layers change', async () => {
    const { rerender } = render(<RedistrictingMap {...defaultProps} activeLayers={{ ...defaultProps.activeLayers, currentDistricts: true }} />);
    await waitFor(() => expect(mockMapInstance.fitBounds).toHaveBeenCalledTimes(1));

    rerender(<RedistrictingMap {...defaultProps} activeLayers={{ ...defaultProps.activeLayers, proposedDistricts: true, currentDistricts: false }} />);
    await waitFor(() => {
      expect(mockMapInstance.removeLayer).toHaveBeenCalledTimes(1); // Remove current
      expect(mockMapInstance.fitBounds).toHaveBeenCalledTimes(2); // Fit to proposed
    });
  });
});