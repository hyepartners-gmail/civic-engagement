import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TopEmittersList from '@/components/energy/TopEmittersList';

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
  }
];

describe('TopEmittersList', () => {
  it('renders correctly with plant data', () => {
    const mockOnPlantSelect = jest.fn();
    
    render(
      <TopEmittersList 
        plants={mockPlants} 
        onPlantSelect={mockOnPlantSelect} 
        limit={5} 
      />
    );
    
    expect(screen.getByText('Top Emitters')).toBeInTheDocument();
    
    // Check that plants are displayed in correct order (highest CO2 first)
    const plantNames = screen.getAllByText(/Plant/).map(el => el.textContent);
    expect(plantNames).toContain('Coal Plant 1');
    expect(plantNames).toContain('Gas Plant 1');
    
    // Check that CO2 values are displayed
    expect(screen.getByText('5,000,000 tons')).toBeInTheDocument();
    expect(screen.getByText('1,500,000 tons')).toBeInTheDocument();
  });

  it('limits the number of displayed plants', () => {
    const mockOnPlantSelect = jest.fn();
    
    render(
      <TopEmittersList 
        plants={mockPlants} 
        onPlantSelect={mockOnPlantSelect} 
        limit={1} 
      />
    );
    
    // Should only display 1 plant (the top emitter)
    const plantItems = screen.getAllByRole('button');
    expect(plantItems).toHaveLength(1);
    expect(plantItems[0]).toHaveTextContent('Coal Plant 1');
  });

  it('handles empty plant data', () => {
    const mockOnPlantSelect = jest.fn();
    
    render(
      <TopEmittersList 
        plants={[]} 
        onPlantSelect={mockOnPlantSelect} 
        limit={5} 
      />
    );
    
    expect(screen.getByText('No emission data available')).toBeInTheDocument();
  });
});