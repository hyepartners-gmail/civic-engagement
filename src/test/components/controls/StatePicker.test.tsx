import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClimateProvider } from '@/contexts/ClimateContext';
import StatePicker from '@/components/controls/StatePicker';

// Mock the useClimateState hook
jest.mock('@/hooks/useClimateState', () => ({
  useClimateState: () => ({
    city: 'seattle',
    stateId: 'wa',
    setState: jest.fn(),
  }),
}));

describe('StatePicker', () => {
  it('should render state options', () => {
    render(
      <ClimateProvider>
        <StatePicker />
      </ClimateProvider>
    );

    expect(screen.getByText('Washington')).toBeInTheDocument();
    expect(screen.getByText('California')).toBeInTheDocument();
    expect(screen.getByText('Texas')).toBeInTheDocument();
  });

  it('should default to city state when no state is selected', () => {
    jest.spyOn(require('@/hooks/useClimateState'), 'useClimateState').mockImplementation(() => ({
      city: 'houston',
      stateId: '',
      setState: jest.fn(),
    }));

    render(
      <ClimateProvider>
        <StatePicker />
      </ClimateProvider>
    );

    // Houston is in Texas, so TX should be selected
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toHaveTextContent('Texas');
  });
});