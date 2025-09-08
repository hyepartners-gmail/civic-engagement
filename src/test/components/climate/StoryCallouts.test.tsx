import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StoryCallouts from '@/components/climate/StoryCallouts';

describe('StoryCallouts', () => {
  it('should render callout items', () => {
    render(<StoryCallouts activeYear={null} />);

    expect(screen.getByText('Dust Bowl Begins')).toBeInTheDocument();
    expect(screen.getByText('Hurricane Katrina')).toBeInTheDocument();
    expect(screen.getByText('Western Wildfires')).toBeInTheDocument();
  });

  it('should highlight active year', () => {
    render(<StoryCallouts activeYear={1930} />);

    const dustBowlCallout = screen.getByText('Dust Bowl Begins').closest('div');
    expect(dustBowlCallout).toHaveClass('ring-2');
  });

  it('should call onYearSelect when a callout is clicked', () => {
    const mockOnYearSelect = jest.fn();
    render(<StoryCallouts activeYear={null} onYearSelect={mockOnYearSelect} />);

    const dustBowlCallout = screen.getByText('Dust Bowl Begins');
    fireEvent.click(dustBowlCallout);

    expect(mockOnYearSelect).toHaveBeenCalledWith(1930);
  });
});