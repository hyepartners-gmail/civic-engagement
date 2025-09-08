import { render, screen, fireEvent } from '@testing-library/react';
import MetricPicker from '@/components/controls/MetricPicker';

// Mock the useUrlState hook
jest.mock('@/hooks/useUrlState', () => ({
  useUrlState: () => ['construction', jest.fn()]
}));

describe('MetricPicker', () => {
  it('should render with default value', () => {
    render(
      <MetricPicker 
        metric="construction" 
        onMetricChange={jest.fn()} 
      />
    );
    
    expect(screen.getByText('Construction Hours')).toBeInTheDocument();
  });
  
  it('should display all metric options', () => {
    render(
      <MetricPicker 
        metric="construction" 
        onMetricChange={jest.fn()} 
      />
    );
    
    // Click to open dropdown
    fireEvent.click(screen.getByRole('combobox'));
    
    expect(screen.getByText('Construction Hours')).toBeInTheDocument();
    expect(screen.getByText('Agriculture Yield Proxy')).toBeInTheDocument();
    expect(screen.getByText('Electric Load Proxy')).toBeInTheDocument();
  });
  
  it('should call onMetricChange when selection changes', () => {
    const mockOnChange = jest.fn();
    
    render(
      <MetricPicker 
        metric="construction" 
        onMetricChange={mockOnChange} 
      />
    );
    
    // Click to open dropdown
    fireEvent.click(screen.getByRole('combobox'));
    
    // Click on a different option
    fireEvent.click(screen.getByText('Agriculture Yield Proxy'));
    
    expect(mockOnChange).toHaveBeenCalledWith('agriculture');
  });
  
  it('should display placeholder text', () => {
    render(
      <MetricPicker 
        metric="" 
        onMetricChange={jest.fn()} 
      />
    );
    
    expect(screen.getByText('Select a metric')).toBeInTheDocument();
  });
});