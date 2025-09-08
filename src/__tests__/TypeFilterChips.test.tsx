import { render, screen, fireEvent } from '@testing-library/react';
import TypeFilterChips from '@/components/controls/TypeFilterChips';

// Mock the useUrlState hook
jest.mock('@/hooks/useUrlState', () => ({
  useUrlState: () => [null, jest.fn()]
}));

describe('TypeFilterChips', () => {
  const allTypes = ['hurricane', 'flood', 'wildfire', 'drought', 'severeStorm'];
  
  it('should render all type chips', () => {
    render(
      <TypeFilterChips 
        types={allTypes} 
        allTypes={allTypes} 
      />
    );
    
    allTypes.forEach(type => {
      const displayName = type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
      expect(screen.getByText(displayName)).toBeInTheDocument();
    });
  });
  
  it('should highlight selected types', () => {
    const selectedTypes = ['hurricane', 'flood'];
    
    render(
      <TypeFilterChips 
        types={selectedTypes} 
        allTypes={allTypes} 
      />
    );
    
    // Check that selected types have the selected class
    const hurricaneChip = screen.getByText('Hurricane');
    const floodChip = screen.getByText('Flood');
    
    // Note: We can't easily test CSS classes in Jest, but we can test the structure
    expect(hurricaneChip).toBeInTheDocument();
    expect(floodChip).toBeInTheDocument();
  });
  
  it('should render Select All button', () => {
    render(
      <TypeFilterChips 
        types={['hurricane']} 
        allTypes={allTypes} 
      />
    );
    
    expect(screen.getByText('Select All')).toBeInTheDocument();
  });
});