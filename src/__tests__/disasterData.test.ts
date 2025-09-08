import { selectDisasterCounts } from '@/lib/selectors/rawClimateSelectors';

// Mock disaster data
const mockDisasterData = [
  { year: 2000, hurricanes: 10, wildfires: 5, total: 15 },
  { year: 2001, hurricanes: 15, wildfires: 8, total: 23 },
  { year: 2002, hurricanes: 5, wildfires: 12, total: 17 }
];

describe('Disaster Data Processing', () => {
  it('should correctly select disaster counts using the total field', () => {
    const result = selectDisasterCounts(mockDisasterData);
    
    // Should return series with year and total count
    expect(result).toEqual([
      [2000, 15],
      [2001, 23],
      [2002, 17]
    ]);
  });

  it('should sort disaster data by year', () => {
    const unsortedData = [
      { year: 2002, hurricanes: 5, wildfires: 12, total: 17 },
      { year: 2000, hurricanes: 10, wildfires: 5, total: 15 },
      { year: 2001, hurricanes: 15, wildfires: 8, total: 23 }
    ];
    
    const result = selectDisasterCounts(unsortedData);
    
    // Should be sorted by year
    expect(result).toEqual([
      [2000, 15],
      [2001, 23],
      [2002, 17]
    ]);
  });
});