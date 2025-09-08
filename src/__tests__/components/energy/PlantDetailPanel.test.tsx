import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlantDetailPanel from '@/components/energy/PlantDetailPanel';

// Mock the dynamic imports for charts
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    return function MockDynamicComponent() {
      return <div data-testid="mock-chart">Chart Placeholder</div>;
    };
  }
}));

// Mock the useEnergyData hook
jest.mock('@/hooks/useEnergyData', () => ({
  useEnergyData: () => ({
    data: [
      {
        plant_id: 1,
        plant_name: "Test Power Plant",
        state: "CA",
        latitude: 34.0522,
        longitude: -118.2437,
        fuel_type: "Natural Gas",
        capacity_mw: 1200,
        annual_net_gen_mwh: 7500000,
        co2_tons: 2100000,
        co2_intensity_kg_mwh: 280,
        operator: "Test Energy Company",
        online_year: 2005
      }
    ]
  })
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

describe('PlantDetailPanel', () => {
  it('renders correctly when closed', () => {
    render(<PlantDetailPanel plantId={null} onClose={jest.fn()} />);
    
    // When closed, it should show the "Select a plant" message
    expect(screen.getByText('Select a plant to view detailed information')).toBeInTheDocument();
  });

  it('renders correctly when plant is selected', () => {
    render(<PlantDetailPanel plantId={1} onClose={jest.fn()} />);
    
    // Check that plant details are displayed
    expect(screen.getByText('Test Power Plant')).toBeInTheDocument();
    expect(screen.getByText('Test Energy Company')).toBeInTheDocument();
    expect(screen.getByText('CA')).toBeInTheDocument();
    
    // Check that specifications are displayed
    expect(screen.getByText('Plant Specifications')).toBeInTheDocument();
    expect(screen.getByText('Natural Gas')).toBeInTheDocument();
    expect(screen.getByText('1,200 MW')).toBeInTheDocument();
    expect(screen.getByText('2005')).toBeInTheDocument();
    expect(screen.getByText('7,500,000 MWh')).toBeInTheDocument();
    expect(screen.getByText('2,100,000 tons')).toBeInTheDocument();
    expect(screen.getByText('280 kg/MWh')).toBeInTheDocument();
    
    // Check that historical performance section is displayed
    expect(screen.getByText('Historical Performance')).toBeInTheDocument();
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
    
    // Check that units section is displayed
    expect(screen.getByText('Units & Turbines')).toBeInTheDocument();
    expect(screen.getByText('Unit details would be displayed here')).toBeInTheDocument();
  });
});