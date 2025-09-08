import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RegionalSummary from '@/components/energy/RegionalSummary';

// Mock the dynamic imports for charts
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    return function MockDynamicComponent() {
      return <div data-testid="mock-chart">Chart Placeholder</div>;
    };
  }
}));

// Mock data
const mockData = {
  CA: {
    capacity: 15000,
    generation: 8000000,
    emissions: 2500000,
    renewable_generation: 3200000,
    renewable_share: 40.0
  },
  TX: {
    capacity: 18000,
    generation: 9500000,
    emissions: 4200000,
    renewable_generation: 1900000,
    renewable_share: 20.0
  }
};

describe('RegionalSummary', () => {
  it('renders correctly with default props', () => {
    render(
      <RegionalSummary 
        data={mockData}
        selectedRegion="CA"
        onRegionChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('Regional Summary')).toBeInTheDocument();
    expect(screen.getByText('Energy metrics for CA')).toBeInTheDocument();
    
    // Check that all metric cards are rendered
    expect(screen.getByText('Total Capacity')).toBeInTheDocument();
    expect(screen.getByText('Annual Generation')).toBeInTheDocument();
    expect(screen.getByText('CO₂ Emissions')).toBeInTheDocument();
    expect(screen.getByText('Renewable Share')).toBeInTheDocument();
    
    // Check specific values
    expect(screen.getByText('15T')).toBeInTheDocument(); // Capacity
    expect(screen.getByText('8T')).toBeInTheDocument(); // Generation
    expect(screen.getByText('2.5T')).toBeInTheDocument(); // Emissions
    expect(screen.getByText('40.0')).toBeInTheDocument(); // Renewable Share
    
    // Check that the chart placeholder is rendered
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
  });

  it('renders correctly with different region', () => {
    render(
      <RegionalSummary 
        data={mockData}
        selectedRegion="TX"
        onRegionChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('Energy metrics for TX')).toBeInTheDocument();
    
    // Check specific values for TX
    expect(screen.getByText('18T')).toBeInTheDocument(); // Capacity
    expect(screen.getByText('9.5T')).toBeInTheDocument(); // Generation
    expect(screen.getByText('4.2T')).toBeInTheDocument(); // Emissions
    expect(screen.getByText('20.0')).toBeInTheDocument(); // Renewable Share
  });

  it('handles empty data gracefully', () => {
    render(
      <RegionalSummary 
        data={{}}
        selectedRegion="NY"
        onRegionChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('Energy metrics for NY')).toBeInTheDocument();
    
    // Check that zero values are displayed
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});