import { render } from '@testing-library/react';
import CitySmallMultiples from '@/components/charts/CitySmallMultiples';
import TileTempAnomaly from '@/components/charts/TileTempAnomaly';
import TileHotDays from '@/components/charts/TileHotDays';
import CompareControls from '@/components/controls/CompareControls';

// Mock data for testing
const mockCityData = {
  seattle: {
    tempAnomaly: [
      [2000, 0.5],
      [2001, 0.6],
      [2002, 0.7]
    ],
    hotDays: [
      [2000, 5],
      [2001, 7],
      [2002, 6]
    ]
  },
  'los-angeles': {
    tempAnomaly: [
      [2000, 1.2],
      [2001, 1.3],
      [2002, 1.4]
    ],
    hotDays: [
      [2000, 25],
      [2001, 30],
      [2002, 28]
    ]
  }
};

const mockCityNames = {
  seattle: 'Seattle',
  'los-angeles': 'Los Angeles'
};

const mockAllCities = {
  seattle: 'Seattle',
  'los-angeles': 'Los Angeles',
  chicago: 'Chicago',
  houston: 'Houston'
};

describe('City Comparison Components', () => {
  describe('CitySmallMultiples', () => {
    it('should render correctly with syncY enabled', () => {
      const { container } = render(
        <CitySmallMultiples
          cityData={mockCityData}
          cityNames={mockCityNames}
          syncY={true}
          yearRange={null}
          threshold={90}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly with syncY disabled', () => {
      const { container } = render(
        <CitySmallMultiples
          cityData={mockCityData}
          cityNames={mockCityNames}
          syncY={false}
          yearRange={null}
          threshold={90}
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });

  describe('TileTempAnomaly', () => {
    it('should render correctly with data', () => {
      const { container } = render(
        <TileTempAnomaly 
          series={mockCityData.seattle.tempAnomaly} 
          syncedDomain={null}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly with synced domain', () => {
      const { container } = render(
        <TileTempAnomaly 
          series={mockCityData.seattle.tempAnomaly} 
          syncedDomain={[-1, 2]}
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });

  describe('TileHotDays', () => {
    it('should render correctly with data', () => {
      const { container } = render(
        <TileHotDays 
          series={mockCityData.seattle.hotDays} 
          syncedDomain={null}
          threshold={90}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it('should render correctly with synced domain', () => {
      const { container } = render(
        <TileHotDays 
          series={mockCityData.seattle.hotDays} 
          syncedDomain={[0, 50]}
          threshold={90}
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });

  describe('CompareControls', () => {
    it('should render correctly', () => {
      const { container } = render(
        <CompareControls
          cities={['seattle', 'los-angeles']}
          onCitiesChange={jest.fn()}
          syncY={true}
          onSyncYChange={jest.fn()}
          threshold={90}
          onThresholdChange={jest.fn()}
          allCities={mockAllCities}
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });
});