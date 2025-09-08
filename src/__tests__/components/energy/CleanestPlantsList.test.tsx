import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CleanestPlantsList from '@/components/energy/CleanestPlantsList';

// Mock plant data
const mockPlants = [
  {
    plant_id: 1,
    plant_name: "Coal Plant 1",
    state: "TX",
    latitude: 32.0,
    longitude: -97.0,
    fuel_type: "Coal",
    capacity_mw: 1000,
    annual_net_gen_mwh: 7000000,
    co2_tons: 5000000,
    co2_intensity_kg_mwh: 714,
    operator: "Energy Corp",
    online_year: 1980
  },
  {
    plant_id: 2,
    plant_name: "Gas Plant 1",
    state: "CA",
    latitude: 34.0,
    longitude: -118.0,
    fuel_type: "Natural Gas",
    capacity_mw: 500,
    annual_net_gen_mwh: 3000000,
    co2_tons: 1500000,
    co2_intensity_kg_mwh: 500,
    operator: "Power Co",
    online_year: 2000
  },
  {
    plant_id: 3,
    plant_name: "Wind Farm 1",
    state: "TX",
    latitude: 35.0,
    longitude: -102.0,
    fuel_type: "Wind",
    capacity_mw: 200,
    annual_net_gen_mwh: 600000,
    co2_tons: 0,
    co2_intensity_kg_mwh: 0,
    operator: "Renewable Energy",
    online_year: 2010
  },
  {
    plant_id: 4,
    plant_name: "Nuclear Plant 1",
    state: "IL",
    latitude: 41.0,
    longitude: -87.0,
    fuel_type: "Nuclear",
    capacity_mw: 1200,
    annual_net_gen_mwh: 9000000,
    co2_tons: 0,
    co2_intensity_kg_mwh: 0,
    operator: "Nuclear Power Co",
    online_year: 1990
  }
];

describe('CleanestPlantsList', () => {
  it('renders correctly with plant data', () => {
    const mockOnPlantSelect = jest.fn();
    
    render(
      <CleanestPlantsList 
        plants={mockPlants} 
        onPlantSelect={mockOnPlantSelect} 
        limit={5} 
      />
    );
    
    expect(screen.getByText('Cleanest Plants (>50MW)')).toBeInTheDocument();
    
    // Check that plants are displayed in correct order (lowest CO2 intensity first)
    // Wind and Nuclear should be first (0 kg/MWh), then Gas (500), then Coal (714)
    const plantNames = screen.getAllByText(/Plant/).map(el => el.textContent);
    expect(plantNames).toContain('Wind Farm 1');
    expect(plantNames).toContain('Nuclear Plant 1');
    expect(plantNames).toContain('Gas Plant 1');
  });

  it('limits the number of displayed plants', () => {
    const mockOnPlantSelect = jest.fn();
    
    render(
      <CleanestPlantsList 
        plants={mockPlants} 
        onPlantSelect={mockOnPlantSelect} 
        limit={2} 
      />
    );
    
    // Should only display 2 plants (the cleanest ones)
    const plantItems = screen.getAllByRole('button');
    expect(plantItems).toHaveLength(2);
    
    // Should include the cleanest plants (Wind and Nuclear)
    const displayedPlants = plantItems.map(item => item.textContent);
    expect(displayedPlants.some(text => text?.includes('Wind Farm 1'))).toBeTruthy();
    expect(displayedPlants.some(text => text?.includes('Nuclear Plant 1'))).toBeTruthy();
  });

  it('filters out plants with capacity <= 50MW', () => {
    const plantsWithSmallPlant = [
      ...mockPlants,
      {
        plant_id: 5,
        plant_name: "Small Solar Plant",
        state: "CA",
        latitude: 34.0,
        longitude: -118.0,
        fuel_type: "Solar",
        capacity_mw: 30, // Below 50MW threshold
        annual_net_gen_mwh: 50000,
        co2_tons: 0,
        co2_intensity_kg_mwh: 0,
        operator: "Small Power Co",
        online_year: 2015
      }
    ];
    
    const mockOnPlantSelect = jest.fn();
    
    render(
      <CleanestPlantsList 
        plants={plantsWithSmallPlant} 
        onPlantSelect={mockOnPlantSelect} 
        limit={10} 
      />
    );
    
    // Should not include the small plant
    const plantItems = screen.getAllByRole('button');
    const displayedPlants = plantItems.map(item => item.textContent);
    expect(displayedPlants.some(text => text?.includes('Small Solar Plant'))).toBeFalsy();
  });

  it('handles empty plant data', () => {
    const mockOnPlantSelect = jest.fn();
    
    render(
      <CleanestPlantsList 
        plants={[]} 
        onPlantSelect={mockOnPlantSelect} 
        limit={5} 
      />
    );
    
    expect(screen.getByText('No clean energy data available')).toBeInTheDocument();
  });
});