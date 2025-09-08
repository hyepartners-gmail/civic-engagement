import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClimateProvider } from '@/contexts/ClimateContext';
import DisasterTypeLegend from '@/components/controls/DisasterTypeLegend';

// Mock the useClimateState hook
jest.mock('@/hooks/useClimateState', () => ({
  useClimateState: () => ({
    disasterTypes: ['flood', 'drought'],
    setState: jest.fn(),
  }),
}));

describe('DisasterTypeLegend', () => {
  it('should render disaster type badges', () => {
    render(
      <ClimateProvider>
        <DisasterTypeLegend />
      </ClimateProvider>
    );

    expect(screen.getByText('Flood')).toBeInTheDocument();
    expect(screen.getByText('Drought')).toBeInTheDocument();
    expect(screen.getByText('Wildfire')).toBeInTheDocument();
    expect(screen.getByText('Hurricane')).toBeInTheDocument();
  });

  it('should show selected disaster types with different styling', () => {
    render(
      <ClimateProvider>
        <DisasterTypeLegend />
      </ClimateProvider>
    );

    const floodBadge = screen.getByText('Flood');
    const wildfireBadge = screen.getByText('Wildfire');
    
    // Selected types should have different styling
    expect(floodBadge).toHaveClass('bg-blue-500');
    
    // Unselected types should have default styling
    expect(wildfireBadge).toHaveClass('bg-platform-contrast');
  });

  it('should call setState when a badge is clicked', () => {
    const mockSetState = jest.fn();
    
    jest.spyOn(require('@/hooks/useClimateState'), 'useClimateState').mockImplementation(() => ({
      disasterTypes: ['flood', 'drought'],
      setState: mockSetState,
    }));

    render(
      <ClimateProvider>
        <DisasterTypeLegend />
      </ClimateProvider>
    );

    const wildfireBadge = screen.getByText('Wildfire');
    fireEvent.click(wildfireBadge);
    
    expect(mockSetState).toHaveBeenCalledWith({ disasterTypes: ['flood', 'drought', 'wildfire'] });
  });
});