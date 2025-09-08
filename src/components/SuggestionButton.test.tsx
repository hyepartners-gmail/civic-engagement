import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SuggestionButton from './SuggestionButton';

describe('SuggestionButton', () => {
  it('renders the Suggest Solution button', () => {
    render(<SuggestionButton />);
    expect(screen.getByRole('button', { name: /suggest solution/i })).toBeInTheDocument();
  });

  it('calls the onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<SuggestionButton onClick={handleClick} />);
    const button = screen.getByRole('button', { name: /suggest solution/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not throw an error if onClick is not provided and button is clicked', () => {
    render(<SuggestionButton />);
    const button = screen.getByRole('button', { name: /suggest solution/i });
    // This test ensures that if onClick is optional and not provided, clicking doesn't break
    expect(() => fireEvent.click(button)).not.toThrow();
  });
});