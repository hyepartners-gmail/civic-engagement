import React from 'react';
import { render } from '@testing-library/react';
import { CrosshairProvider } from '@/contexts/CrosshairContext';
import WarmingStripes from '@/components/charts/WarmingStripes';
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
          tempAnomaly: [
            [2000, -0.5],
            [2001, -0.2],
            [2002, 0.1],
            [2003, 0.3],
            [2004, 0.6],
          ],
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
        tempAnomaly: [
          [2000, -0.3],
          [2001, -0.1],
          [2002, 0.0],
          [2003, 0.2],
          [2004, 0.5],
        ],
      },
    },
    metadata: {
      sources: ['NOAA'],
    },
  },
};

describe('WarmingStripes', () => {
  it('should render city warming stripes', () => {
    const { container } = render(
      <CrosshairProvider>
        <WarmingStripes scope="city" cityId="seattle" artifact={mockArtifact} />
      </CrosshairProvider>
    );

    expect(container).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('should render national warming stripes', () => {
    const { container } = render(
      <CrosshairProvider>
        <WarmingStripes scope="national" artifact={mockArtifact} />
      </CrosshairProvider>
    );

    expect(container).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('should have accessible labels', () => {
    const { container } = render(
      <CrosshairProvider>
        <WarmingStripes scope="city" cityId="seattle" artifact={mockArtifact} />
      </CrosshairProvider>
    );

    const wrapper = container.querySelector('[role="img"]');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveAttribute('aria-label', expect.stringContaining('Warming stripes'));
  });
});