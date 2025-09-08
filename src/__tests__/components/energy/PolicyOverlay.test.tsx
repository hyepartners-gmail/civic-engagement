import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PolicyOverlay from '@/components/energy/PolicyOverlay';

// Mock GeoJSON data
const mockGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "California",
        abbr: "CA"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
      }
    }
  ]
};

// Mock RPS data
const mockRpsData = {
  CA: {
    target: 100,
    year: 2045,
    notes: "100% clean electricity by 2045"
  },
  TX: {
    target: null,
    year: null,
    notes: "No mandatory RPS target"
  }
};

describe('PolicyOverlay', () => {
  it('renders correctly with RPS data', () => {
    render(
      <PolicyOverlay 
        usStatesGeoJson={mockGeoJson as any}
        rpsData={mockRpsData}
        onRegionSelect={jest.fn()}
      />
    );
    
    expect(screen.getByText('Renewable Portfolio Standards')).toBeInTheDocument();
    expect(screen.getByText('RPS targets by state. Darker green indicates higher renewable energy targets.')).toBeInTheDocument();
    
    // Check that legend items are displayed
    expect(screen.getByText('No target')).toBeInTheDocument();
    expect(screen.getByText('Low target')).toBeInTheDocument();
    expect(screen.getByText('High target')).toBeInTheDocument();
  });

  it('handles empty RPS data', () => {
    render(
      <PolicyOverlay 
        usStatesGeoJson={mockGeoJson as any}
        rpsData={{}}
        onRegionSelect={jest.fn()}
      />
    );
    
    expect(screen.getByText('Renewable Portfolio Standards')).toBeInTheDocument();
  });
});