import { render } from '@testing-library/react';
import DisasterCostBars from '@/components/charts/DisasterCostBars';
import EmissionsOverlayLine from '@/components/charts/EmissionsOverlayLine';
import TypeFilterChips from '@/components/controls/TypeFilterChips';
import ModeTabs from '@/components/controls/ModeTabs';
import InflationToggle from '@/components/controls/InflationToggle';

// Mock data for testing
const mockFemaCosts = {
  hurricane: [
    [2000, 1000000],
    [2001, 1200000],
    [2002, 1100000]
  ],
  flood: [
    [2000, 800000],
    [2001, 900000],
    [2002, 850000]
  ]
};

const mockEmissions = [
  [2000, 5500],
  [2001, 5400],
  [2002, 5300]
];

const mockAllTypes = ['hurricane', 'flood', 'wildfire', 'drought', 'severeStorm'];

describe('Climate Costs Components', () => {
  describe('DisasterCostBars', () => {
    it('should render stacked bars correctly', () => {
      const { container } = render(
        <DisasterCostBars 
          series={mockFemaCosts} 
          stacked={true}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render grouped bars correctly', () => {
      const { container } = render(
        <DisasterCostBars 
          series={mockFemaCosts} 
          stacked={false}
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });

  describe('EmissionsOverlayLine', () => {
    it('should render correctly with data', () => {
      const { container } = render(
        <EmissionsOverlayLine 
          series={mockEmissions} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render nothing when no data', () => {
      const { container } = render(
        <EmissionsOverlayLine 
          series={[]} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });

  describe('TypeFilterChips', () => {
    it('should render correctly with all types selected', () => {
      const { container } = render(
        <TypeFilterChips 
          types={mockAllTypes} 
          allTypes={mockAllTypes} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly with some types selected', () => {
      const { container } = render(
        <TypeFilterChips 
          types={['hurricane', 'flood']} 
          allTypes={mockAllTypes} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });

  describe('ModeTabs', () => {
    it('should render correctly in total mode', () => {
      const { container } = render(
        <ModeTabs 
          mode="total" 
          onModeChange={jest.fn()} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly in percap mode', () => {
      const { container } = render(
        <ModeTabs 
          mode="percap" 
          onModeChange={jest.fn()} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });

  describe('InflationToggle', () => {
    it('should render correctly when enabled', () => {
      const { container } = render(
        <InflationToggle 
          enabled={true} 
          onToggle={jest.fn()} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly when disabled', () => {
      const { container } = render(
        <InflationToggle 
          enabled={false} 
          onToggle={jest.fn()} 
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });
});