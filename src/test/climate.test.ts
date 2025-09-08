import { climateSchema } from '@/lib/climateSchema';

describe('Climate Data Schema', () => {
  it('should validate a minimal climate artifact', () => {
    const minimalArtifact = {
      meta: {
        version: 1,
        updated: '2025-01-01',
        basePeriod: '1991 to 2020',
        units: {
          temp: '°C',
          precip: 'mm'
        }
      },
      cities: {},
      national: {
        series: {
          annual: {}
        },
        metadata: {}
      }
    };

    expect(() => climateSchema.parse(minimalArtifact)).not.toThrow();
  });

  it('should validate a climate artifact with city data', () => {
    const artifactWithCityData = {
      meta: {
        version: 1,
        updated: '2025-01-01',
        basePeriod: '1991 to 2020',
        units: {
          temp: '°C',
          precip: 'mm'
        }
      },
      cities: {
        seattle: {
          series: {
            annual: {
              tempAnomaly: [[2020, 1.2], [2021, 1.5]],
              precipTotal: [[2020, 800], [2021, 850]]
            }
          },
          metadata: {
            sources: ['Berkeley Earth']
          }
        }
      },
      national: {
        series: {
          annual: {}
        },
        metadata: {}
      }
    };

    expect(() => climateSchema.parse(artifactWithCityData)).not.toThrow();
  });

  it('should validate a climate artifact with national data', () => {
    const artifactWithNationalData = {
      meta: {
        version: 1,
        updated: '2025-01-01',
        basePeriod: '1991 to 2020',
        units: {
          temp: '°C',
          precip: 'mm',
          acres: 'acres',
          fires: 'count'
        }
      },
      cities: {},
      national: {
        series: {
          annual: {
            disasters: {
              hurricane: [[2020, 5], [2021, 3]],
              wildfire: [[2020, 20], [2021, 25]],
              total: [[2020, 25], [2021, 28]]
            },
            wildfire: {
              acresBurned: [[2020, 1000000], [2021, 1200000]],
              fires: [[2020, 50], [2021, 55]]
            }
          }
        },
        metadata: {
          sources: ['NIFC', 'FEMA']
        }
      }
    };

    expect(() => climateSchema.parse(artifactWithNationalData)).not.toThrow();
  });
});