import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoryDegreeDays from '@/components/stories/StoryDegreeDays';

// Mock the hooks
jest.mock('@/hooks/useClimateArtifact', () => ({
  useClimateArtifact: () => ({
    data: {
      states: {
        tx: {
          series: {
            annual: {
              degreeDays: {
                hdd: [[2020, 5000], [2021, 4800]],
                cdd: [[2020, 1200], [2021, 1300]]
              }
            }
          }
        }
      }
    },
    isLoading: false,
    isError: false,
    error: null
  })
}));

jest.mock('@/hooks/useClimateState', () => ({
  useClimateState: () => ({
    state: 'tx',
    setState: jest.fn()
  })
}));

jest.mock('@/hooks/useUrlState', () => ({
  useUrlState: () => ['both', jest.fn()]
}));

// Mock the ChartContainer to avoid complex chart rendering
jest.mock('@/components/shared/ChartContainer', () => {
  return function MockChartContainer({ children }: { children: React.ReactNode }) {
    return <div data-testid="chart-container">{children}</div>;
  };
});

// Mock other components
jest.mock('@/components/climate/StoryHeader', () => {
  return function MockStoryHeader() {
    return <div data-testid="story-header">Story Header</div>;
  };
});

jest.mock('@/components/controls/StatePicker', () => {
  return function MockStatePicker() {
    return <div>State Picker</div>;
  };
});

jest.mock('@/components/controls/LegendChips', () => {
  return function MockLegendChips() {
    return <div>Legend Chips</div>;
  };
});

jest.mock('@/components/charts/DegreeDaysChart', () => {
  return function MockDegreeDaysChart() {
    return <div>Degree Days Chart</div>;
  };
});

jest.mock('@/components/climate/YearReadout', () => {
  return function MockYearReadout() {
    return <div>Year Readout</div>;
  };
});

describe('StoryDegreeDays', () => {
  it('should render without crashing', () => {
    render(<StoryDegreeDays />);
    
    // Check that key components are rendered
    expect(screen.getByTestId('story-header')).toBeInTheDocument();
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByText('State Picker')).toBeInTheDocument();
    expect(screen.getByText('Legend Chips')).toBeInTheDocument();
    expect(screen.getByText('Degree Days Chart')).toBeInTheDocument();
    expect(screen.getByText('Year Readout')).toBeInTheDocument();
  });
});