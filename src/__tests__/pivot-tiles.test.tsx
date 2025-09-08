import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PivotTiles from '@/components/climate/PivotTiles';

// Mock the hooks
jest.mock('@/hooks/useClimateArtifact', () => ({
  useClimateArtifact: () => ({
    data: {
      cities: {
        'seattle': {
          series: {
            annual: {
              tempAnomaly: [[2000, 1.5], [2001, 2.0], [2002, 1.8]],
              precipTotal: [[2000, 40], [2001, 45], [2002, 38]],
            }
          }
        }
      }
    }
  })
}));

jest.mock('@/hooks/useClimateState', () => ({
  useClimateState: () => ({
    city: 'seattle',
    state: 'wa'
  })
}));

jest.mock('@/hooks/useUrlState', () => ({
  useUrlState: () => ['city', jest.fn()]
}));

// Mock the Card component
jest.mock('@/components/shared/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={className || 'p-4'} data-testid="card">{children}</div>
  )
}));

// Mock the DiffBar component
jest.mock('@/components/charts/DiffBar', () => {
  return function MockDiffBar() {
    return <div data-testid="diff-bar">Diff Bar</div>;
  };
});

describe('PivotTiles', () => {
  it('should render without crashing', () => {
    render(<PivotTiles />);
    
    // Check that the component renders
    expect(screen.getAllByTestId('card')).toHaveLength(9); // We have 9 metrics in our filtered list
  });

  it('should display metric information', () => {
    render(<PivotTiles />);
    
    // Check that some metric names are displayed
    expect(screen.getByText('Avg Temp Anomaly')).toBeInTheDocument();
    expect(screen.getByText('Total Precipitation')).toBeInTheDocument();
  });
});