import React from 'react';
import { render, screen } from '@testing-library/react';
import EnergyPage from '@/pages/climate/energy';

// Mock the dynamic imports
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (fn: any) => {
    const component = fn();
    if (component.then) {
      // For dynamic imports that return promises
      return React.lazy(() => component);
    }
    return component;
  }
}));

// Mock the hooks
jest.mock('@/hooks/useEnergyData', () => ({
  useEnergyData: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null
  })
}));

jest.mock('@/hooks/useEnergyState', () => ({
  useEnergyState: () => ({
    fuelTypes: ['Coal', 'Natural Gas', 'Nuclear', 'Hydro', 'Wind', 'Solar', 'Other'],
    co2Max: 1200,
    capacityMin: 100,
    regionalMetric: 'none',
    showRpsOverlay: false,
    setState: jest.fn(),
    resetFilters: jest.fn()
  }),
  ALL_FUEL_TYPES: ['Coal', 'Natural Gas', 'Nuclear', 'Hydro', 'Wind', 'Solar', 'Other'],
  RegionalMetric: {
    none: 'none',
    capacity: 'capacity',
    emissions: 'emissions',
    generation: 'generation'
  }
}));

// Mock the selectors
jest.mock('@/lib/selectors/energy', () => ({
  filterPlants: jest.fn(() => []),
  selectRegionalSummary: jest.fn(() => ({})),
  selectPlantById: jest.fn(() => undefined)
}));

// Mock the shared components
jest.mock('@/components/shared/ChartContainer', () => {
  return function MockChartContainer({ children }: { children: React.ReactNode }) {
    return <div data-testid="chart-container">{children}</div>;
  };
});

jest.mock('@/components/shared/Card', () => {
  return function MockCard({ children }: { children: React.ReactNode }) {
    return <div data-testid="card">{children}</div>;
  };
});

// Mock the UI components
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-trigger">{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-content">{children}</div>
}));

// Mock the energy components
jest.mock('@/components/energy/EnergyFilters', () => {
  return function MockEnergyFilters() {
    return <div data-testid="energy-filters">Filters</div>;
  };
});

jest.mock('@/components/energy/MapLegend', () => {
  return function MockMapLegend() {
    return <div data-testid="map-legend">Map Legend</div>;
  };
});

jest.mock('@/components/energy/InsightsPanel', () => {
  return function MockInsightsPanel() {
    return <div data-testid="insights-panel">Insights Panel</div>;
  };
});

jest.mock('@/components/energy/RenewableBuildChart', () => {
  return function MockRenewableBuildChart() {
    return <div data-testid="renewable-build-chart">Renewable Build Chart</div>;
  };
});

jest.mock('@/components/energy/PlantDetailPanel', () => {
  return function MockPlantDetailPanel() {
    return <div data-testid="plant-detail-panel">Plant Detail Panel</div>;
  };
});

describe('EnergyPage', () => {
  it('should render the page with correct structure', () => {
    render(<EnergyPage />);
    
    // Check header
    expect(screen.getByText('U.S. Power Plant Explorer')).toBeInTheDocument();
    expect(screen.getByText('Explore capacity, generation, and emissions data for major power plants across the United States.')).toBeInTheDocument();
    
    // Check main components
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByTestId('energy-filters')).toBeInTheDocument();
    expect(screen.getByTestId('map-legend')).toBeInTheDocument();
    expect(screen.getByTestId('insights-panel')).toBeInTheDocument();
    expect(screen.getByTestId('renewable-build-chart')).toBeInTheDocument();
    expect(screen.getByTestId('plant-detail-panel')).toBeInTheDocument();
    
    // Check tabs
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Data Table')).toBeInTheDocument();
    expect(screen.getByText('Renewable Growth')).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = render(<EnergyPage />);
    expect(container).toMatchSnapshot();
  });
});