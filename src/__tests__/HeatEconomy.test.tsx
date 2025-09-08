import { render } from '@testing-library/react';
import HeatEconomyScatter from '@/components/charts/HeatEconomyScatter';
import QuadrantLegend from '@/components/charts/QuadrantLegend';
import MetricPicker from '@/components/controls/MetricPicker';
import FitToggle from '@/components/controls/FitToggle';

// Mock data for testing
const mockPoints: [number, number, number][] = [
  [2000, 0.5, 85],
  [2001, 0.6, 87],
  [2002, 0.7, 86],
  [2003, 0.8, 84],
  [2004, 0.9, 82]
];

const mockFitLinePoints: [number, number][] = [
  [0.5, 85],
  [0.9, 82]
];

describe('Heat Economy Components', () => {
  describe('HeatEconomyScatter', () => {
    it('should render correctly with data points', () => {
      const { container } = render(
        <HeatEconomyScatter 
          points={mockPoints} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly with color by year', () => {
      const { container } = render(
        <HeatEconomyScatter 
          points={mockPoints} 
          colorByYear={true}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly with fit line', () => {
      const { container } = render(
        <HeatEconomyScatter 
          points={mockPoints} 
          showFitLine={true}
          fitLinePoints={mockFitLinePoints}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render no data message when no points', () => {
      const { container } = render(
        <HeatEconomyScatter 
          points={[]} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });

  describe('QuadrantLegend', () => {
    it('should render correctly with default labels', () => {
      const { container } = render(
        <QuadrantLegend 
          xThreshold={0}
          yThreshold={85}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly with custom labels', () => {
      const { container } = render(
        <QuadrantLegend 
          xThreshold={0}
          yThreshold={85}
          xAxisLabel="Temp Anomaly"
          yAxisLabel="Construction Hours"
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });

  describe('MetricPicker', () => {
    it('should render correctly with construction metric', () => {
      const { container } = render(
        <MetricPicker 
          metric="construction" 
          onMetricChange={jest.fn()} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly with agriculture metric', () => {
      const { container } = render(
        <MetricPicker 
          metric="agriculture" 
          onMetricChange={jest.fn()} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });

  describe('FitToggle', () => {
    it('should render correctly when disabled', () => {
      const { container } = render(
        <FitToggle 
          enabled={false} 
          onToggle={jest.fn()} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly when enabled without R²', () => {
      const { container } = render(
        <FitToggle 
          enabled={true} 
          onToggle={jest.fn()} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly when enabled with R²', () => {
      const { container } = render(
        <FitToggle 
          enabled={true} 
          onToggle={jest.fn()} 
          r2={0.85}
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });
});