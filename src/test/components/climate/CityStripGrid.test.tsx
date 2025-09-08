import React from 'react';
import { render } from '@testing-library/react';
import { CrosshairProvider } from '@/contexts/CrosshairContext';
import CityStripGrid from '@/components/climate/CityStripGrid';
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
  cities: {
    seattle: {
      series: {
        annual: {
          tempAnomaly: [[2020, 1.2], [2021, 1.5]],
        },
      },
      metadata: {
        sources: ['Berkeley Earth'],
      },
    },
    'los-angeles': {
      series: {
        annual: {
          tempAnomaly: [[2020, 1.8], [2021, 2.1]],
        },
      },
      metadata: {
        sources: ['Berkeley Earth'],
      },
    },
    chicago: {
      series: {
        annual: {
          tempAnomaly: [[2020, 0.8], [2021, 1.1]],
        },
      },
      metadata: {
        sources: ['Berkeley Earth'],
      },
    },
    houston: {
      series: {
        annual: {
          tempAnomaly: [[2020, 1.5], [2021, 1.8]],
        },
      },
      metadata: {
        sources: ['Berkeley Earth'],
      },
    },
    atlanta: {
      series: {
        annual: {
          tempAnomaly: [[2020, 1.3], [2021, 1.6]],
        },
      },
      metadata: {
        sources: ['Berkeley Earth'],
      },
    },
    'new-york': {
      series: {
        annual: {
          tempAnomaly: [[2020, 1.0], [2021, 1.3]],
        },
      },
      metadata: {
        sources: ['Berkeley Earth'],
      },
    },
  },
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

describe('CityStripGrid', () => {
  it('should render all city stripes', () => {
    const { container } = render(
      <CrosshairProvider>
        <CityStripGrid artifact={mockArtifact} />
      </CrosshairProvider>
    );

    expect(container).toBeInTheDocument();
    
    // Check that all 6 cities are rendered
    const cityNames = container.querySelectorAll('p.text-center');
    expect(cityNames).toHaveLength(6);
    
    // Check that all 6 canvases are rendered
    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(6);
  });

  it('should display correct city names', () => {
    const { container } = render(
      <CrosshairProvider>
        <CityStripGrid artifact={mockArtifact} />
      </CrosshairProvider>
    );

    const cityNames = Array.from(container.querySelectorAll('p.text-center')).map(el => el.textContent);
    expect(cityNames).toEqual([
      'Seattle, WA',
      'Los Angeles, CA',
      'Chicago, IL',
      'Houston, TX',
      'Atlanta, GA',
      'New York, NY'
    ]);
  });
});