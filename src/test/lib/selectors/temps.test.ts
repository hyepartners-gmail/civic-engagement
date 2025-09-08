import { selectAnnualTempAnomaly } from '@/lib/selectors/temps';
import { toFiscalYears } from '@/lib/time/fy';
import { ClimateArtifact } from '@/lib/climateSchema';

describe('Temperature Selectors', () => {
  const mockArtifact: ClimateArtifact = {
    meta: {
      version: 1,
      updated: '2023-01-01',
      basePeriod: '1991 to 2020',
      units: {
        temp: '°C',
      },
    },
    cities: {
      seattle: {
        series: {
          annual: {
            tempAnomaly: [[2020, 1.2], [2021, 1.5], [2022, 1.8]],
          },
        },
        metadata: {
          sources: ['Berkeley Earth'],
        },
      },
    },
    national: {
      series: {
        annual: {
          tempAnomaly: [[2020, 1.0], [2021, 1.3], [2022, 1.6]],
        },
      },
      metadata: {
        sources: ['NOAA'],
      },
    },
  };

  describe('selectAnnualTempAnomaly', () => {
    it('should select city temperature anomaly data', () => {
      const result = selectAnnualTempAnomaly(mockArtifact, {
        scope: 'city',
        cityId: 'seattle',
        basePeriod: '1991-2020',
        cadence: 'annual',
      });

      expect(result).toEqual([[2020, 1.2], [2021, 1.5], [2022, 1.8]]);
    });

    it('should select national temperature anomaly data', () => {
      const result = selectAnnualTempAnomaly(mockArtifact, {
        scope: 'national',
        basePeriod: '1991-2020',
        cadence: 'annual',
      });

      expect(result).toEqual([[2020, 1.0], [2021, 1.3], [2022, 1.6]]);
    });

    it('should return empty array for non-existent city', () => {
      const result = selectAnnualTempAnomaly(mockArtifact, {
        scope: 'city',
        cityId: 'non-existent',
        basePeriod: '1991-2020',
        cadence: 'annual',
      });

      expect(result).toEqual([]);
    });
  });
});

describe('Fiscal Year Mapping', () => {
  describe('toFiscalYears', () => {
    it('should map calendar years to fiscal years', () => {
      const series: [number, number | null][] = [
        [2020, 1.0],
        [2021, 1.5],
        [2022, 2.0],
      ];

      const result = toFiscalYears(series);

      // For now, we're just returning the same series since we're using annual data
      expect(result).toEqual([
        [2020, 1.0],
        [2021, 1.5],
        [2022, 2.0],
      ]);
    });

    it('should handle empty series', () => {
      const series: [number, number | null][] = [];
      const result = toFiscalYears(series);
      expect(result).toEqual([]);
    });
  });
});