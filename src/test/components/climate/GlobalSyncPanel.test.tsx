import React from 'react';
import { render } from '@testing-library/react';
import { CrosshairProvider } from '@/contexts/CrosshairContext';
import GlobalSyncPanel from '@/components/climate/GlobalSyncPanel';
import { ClimateArtifact } from '@/lib/climateSchema';

// Mock canvas API for testing
HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation(() => {
  return {
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    scale: jest.fn(),
  };
});

const mockArtifact: ClimateArtifact = {
  meta: {
    version: 1,
    updated: '2023-01-01',
    basePeriod: '1991 to 2020',
    units: {
      temp: '°C',
    },
  },
  cities: {},
  national: {
    series: {
      annual: {
        tempAnomaly: [[2020, 1.0], [2021, 1.3]],
      },
    },
    metadata: {
      sources: ['NOAA'],
    },
  },
};

describe('GlobalSyncPanel', () => {
  it('should render national and global stripes', () => {
    const { container } = render(
      <CrosshairProvider>
        <GlobalSyncPanel artifact={mockArtifact} />
      </CrosshairProvider>
    );

    expect(container).toBeInTheDocument();
    
    // Check that the panel title is rendered
    expect(container.querySelector('h3')).toHaveTextContent('National & Global Context');
    
    // Check that both national and global sections are rendered
    const sections = container.querySelectorAll('div > div');
    expect(sections).toHaveLength(2);
    
    // Check that section titles are rendered
    const sectionTitles = container.querySelectorAll('p.text-center');
    expect(sectionTitles).toHaveLength(2);
    expect(sectionTitles[0]).toHaveTextContent('National Average');
    expect(sectionTitles[1]).toHaveTextContent('Global Average (Placeholder)');
    
    // Check that canvases are rendered
    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(2);
  });
});