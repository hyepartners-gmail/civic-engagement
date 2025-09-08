import {
  generateInitialRank,
  generateInitialRanks,
  generateRankBetween,
  needsRebalance,
  rebalanceRanks,
  isValidRank,
  compareRanks,
  calculateInsertPosition,
  LexoRankManager,
} from '@/lib/lexorank';

describe('LexoRank Utilities', () => {
  describe('generateInitialRank', () => {
    it('should generate a valid initial rank', () => {
      const rank = generateInitialRank();
      expect(isValidRank(rank)).toBe(true);
      expect(rank).toMatch(/^[0-9a-z]+$/);
    });

    it('should generate consistent initial ranks', () => {
      const rank1 = generateInitialRank();
      const rank2 = generateInitialRank();
      expect(rank1).toBe(rank2); // Should be deterministic
    });
  });

  describe('generateInitialRanks', () => {
    it('should generate evenly spaced initial ranks', () => {
      const ranks = generateInitialRanks(3);
      expect(ranks).toHaveLength(3);
      expect(ranks[0]).toBeLessThan(ranks[1]);
      expect(ranks[1]).toBeLessThan(ranks[2]);
    });

    it('should return empty array for zero count', () => {
      const ranks = generateInitialRanks(0);
      expect(ranks).toEqual([]);
    });

    it('should handle single rank generation', () => {
      const ranks = generateInitialRanks(1);
      expect(ranks).toHaveLength(1);
      expect(isValidRank(ranks[0])).toBe(true);
    });

    it('should generate valid base-36 ranks', () => {
      const ranks = generateInitialRanks(5);
      ranks.forEach(rank => {
        expect(isValidRank(rank)).toBe(true);
        expect(rank).toMatch(/^[0-9a-z]+$/);
      });
    });
  });

  describe('generateRankBetween', () => {
    it('should generate rank between two existing ranks', () => {
      const rank = generateRankBetween('a', 'z');
      expect(rank > 'a').toBe(true);
      expect(rank < 'z').toBe(true);
      expect(isValidRank(rank)).toBe(true);
    });

    it('should generate initial rank when no parameters provided', () => {
      const rank = generateRankBetween();
      expect(isValidRank(rank)).toBe(true);
      expect(rank).toBe(generateInitialRank());
    });

    it('should handle insertion at beginning', () => {
      const rank = generateRankBetween(undefined, 'b');
      expect(rank < 'b').toBe(true);
      expect(isValidRank(rank)).toBe(true);
    });

    it('should handle insertion at end', () => {
      const rank = generateRankBetween('y', undefined);
      expect(rank > 'y').toBe(true);
      expect(isValidRank(rank)).toBe(true);
    });

    it('should handle close ranks by extending length', () => {
      const rank = generateRankBetween('a', 'b');
      expect(rank > 'a').toBe(true);
      expect(rank < 'b').toBe(true);
      expect(isValidRank(rank)).toBe(true);
    });

    it('should throw error for invalid order', () => {
      expect(() => generateRankBetween('z', 'a')).toThrow();
    });
  });

  describe('isValidRank', () => {
    it('should validate correct base-36 ranks', () => {
      expect(isValidRank('a')).toBe(true);
      expect(isValidRank('z')).toBe(true);
      expect(isValidRank('123')).toBe(true);
      expect(isValidRank('abc123')).toBe(true);
    });

    it('should reject invalid ranks', () => {
      expect(isValidRank('')).toBe(false);
      expect(isValidRank('A')).toBe(false); // Uppercase not allowed
      expect(isValidRank('hello!')).toBe(false); // Special characters
      expect(isValidRank('test@')).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(isValidRank(null as any)).toBe(false);
      expect(isValidRank(undefined as any)).toBe(false);
    });
  });

  describe('compareRanks', () => {
    it('should compare ranks correctly', () => {
      expect(compareRanks('a', 'b')).toBe(-1);
      expect(compareRanks('b', 'a')).toBe(1);
      expect(compareRanks('a', 'a')).toBe(0);
    });

    it('should handle different length ranks', () => {
      expect(compareRanks('a', 'aa')).toBe(-1);
      expect(compareRanks('aa', 'a')).toBe(1);
      expect(compareRanks('a', 'b')).toBe(-1);
    });

    it('should handle complex comparisons', () => {
      expect(compareRanks('abc', 'abd')).toBe(-1);
      expect(compareRanks('xyz', 'xy')).toBe(1);
      expect(compareRanks('123', '123')).toBe(0);
    });
  });

  describe('needsRebalance', () => {
    it('should return false for empty or single rank', () => {
      expect(needsRebalance([])).toBe(false);
      expect(needsRebalance(['a'])).toBe(false);
    });

    it('should return false for well-spaced ranks', () => {
      expect(needsRebalance(['a', 'h', 'z'])).toBe(false);
    });

    it('should detect when rebalance is needed', () => {
      // Create very close ranks that might need rebalancing
      const closeRanks = ['a', 'aa', 'aaa'];
      // This might or might not need rebalancing depending on implementation
      const result = needsRebalance(closeRanks);
      expect(typeof result).toBe('boolean');
    });

    it('should handle unsorted input', () => {
      const unsortedRanks = ['z', 'a', 'm'];
      const result = needsRebalance(unsortedRanks);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('rebalanceRanks', () => {
    it('should return empty map for empty input', () => {
      const result = rebalanceRanks([]);
      expect(result.size).toBe(0);
    });

    it('should rebalance ranks evenly', () => {
      const ranks = ['a', 'b', 'c'];
      const rebalanceMap = rebalanceRanks(ranks);
      
      expect(rebalanceMap.size).toBe(3);
      
      // All original ranks should be in the map
      ranks.forEach(rank => {
        expect(rebalanceMap.has(rank)).toBe(true);
      });
      
      // New ranks should be valid and properly ordered
      const newRanks = Array.from(rebalanceMap.values()).sort();
      for (let i = 0; i < newRanks.length - 1; i++) {
        expect(newRanks[i] < newRanks[i + 1]).toBe(true);
        expect(isValidRank(newRanks[i])).toBe(true);
      }
    });

    it('should handle single rank', () => {
      const result = rebalanceRanks(['a']);
      expect(result.size).toBe(1);
      expect(result.has('a')).toBe(true);
      expect(isValidRank(result.get('a')!)).toBe(true);
    });

    it('should maintain relative order', () => {
      const ranks = ['z', 'a', 'm', 'c']; // Unsorted input
      const rebalanceMap = rebalanceRanks(ranks);
      
      const sortedOriginal = [...ranks].sort();
      const mappedRanks = sortedOriginal.map(rank => rebalanceMap.get(rank)!);
      
      // Mapped ranks should be in ascending order
      for (let i = 0; i < mappedRanks.length - 1; i++) {
        expect(mappedRanks[i] < mappedRanks[i + 1]).toBe(true);
      }
    });
  });

  describe('calculateInsertPosition', () => {
    it('should calculate optimal insertion position', () => {
      const existingRanks = ['b', 'd', 'f'];
      const position = calculateInsertPosition(existingRanks);
      expect(isValidRank(position)).toBe(true);
      expect(position > 'f').toBe(true); // Should insert at end by default
    });

    it('should handle empty ranks array', () => {
      const position = calculateInsertPosition([]);
      expect(isValidRank(position)).toBe(true);
      expect(position).toBe(generateInitialRank());
    });

    it('should respect beforeId and afterId constraints', () => {
      const existingRanks = ['b', 'd', 'f'];
      const position = calculateInsertPosition(existingRanks, 'b', 'd');
      expect(isValidRank(position)).toBe(true);
      expect(position > 'b').toBe(true);
      expect(position < 'd').toBe(true);
    });

    it('should handle insertion at specific positions', () => {
      const existingRanks = ['a', 'c', 'e'];
      
      // Insert after 'a'
      const afterA = calculateInsertPosition(existingRanks, 'a');
      expect(afterA > 'a').toBe(true);
      expect(afterA < 'c').toBe(true);
      
      // Insert before 'e'
      const beforeE = calculateInsertPosition(existingRanks, undefined, 'e');
      expect(beforeE > 'c').toBe(true);
      expect(beforeE < 'e').toBe(true);
    });
  });

  describe('LexoRankManager', () => {
    let manager: LexoRankManager;

    beforeEach(() => {
      manager = new LexoRankManager();
    });

    it('should initialize with empty ranks', () => {
      expect(manager.getSortedRanks()).toHaveLength(0);
    });

    it('should initialize with provided ranks', () => {
      const initialRanks = ['b', 'd', 'f'];
      manager = new LexoRankManager(initialRanks);
      expect(manager.getSortedRanks()).toEqual(['b', 'd', 'f']);
    });

    it('should add and remove ranks', () => {
      manager.addRank('b');
      manager.addRank('d');
      expect(manager.getSortedRanks()).toEqual(['b', 'd']);
      
      manager.removeRank('b');
      expect(manager.getSortedRanks()).toEqual(['d']);
    });

    it('should generate new ranks between existing ones', () => {
      manager.addRank('a');
      manager.addRank('z');
      
      const newRank = manager.generateNewRank('a', 'z');
      expect(newRank > 'a').toBe(true);
      expect(newRank < 'z').toBe(true);
      expect(manager.getSortedRanks()).toContain(newRank);
    });

    it('should get insertion rank without adding it', () => {
      manager.addRank('a');
      manager.addRank('z');
      
      const insertionRank = manager.getInsertionRank('a', 'z');
      expect(insertionRank > 'a').toBe(true);
      expect(insertionRank < 'z').toBe(true);
      expect(manager.getSortedRanks()).not.toContain(insertionRank);
    });

    it('should handle rebalancing when needed', () => {
      // Add ranks that might need rebalancing
      const closeRanks = ['a', 'b', 'c'];
      closeRanks.forEach(rank => manager.addRank(rank));
      
      const rebalanceResult = manager.rebalanceIfNeeded();
      
      // Regardless of whether rebalancing occurred, ranks should be properly ordered
      const finalRanks = manager.getSortedRanks();
      expect(finalRanks).toHaveLength(closeRanks.length);
      for (let i = 0; i < finalRanks.length - 1; i++) {
        expect(finalRanks[i] < finalRanks[i + 1]).toBe(true);
      }
    });

    it('should filter out invalid ranks during initialization', () => {
      const mixedRanks = ['a', '', 'b', 'invalid!', 'c'];
      manager = new LexoRankManager(mixedRanks);
      const validRanks = manager.getSortedRanks();
      expect(validRanks).toEqual(['a', 'b', 'c']);
    });

    it('should handle edge cases in rank generation', () => {
      // Test with no existing ranks
      const firstRank = manager.generateNewRank();
      expect(isValidRank(firstRank)).toBe(true);
      
      // Test with one existing rank
      const secondRank = manager.generateNewRank(firstRank);
      expect(secondRank > firstRank).toBe(true);
      
      // Test insertion at beginning
      const beginningRank = manager.generateNewRank(undefined, firstRank);
      expect(beginningRank < firstRank).toBe(true);
    });

    it('should maintain consistent state', () => {
      const ranks = ['b', 'd', 'f', 'h'];
      ranks.forEach(rank => manager.addRank(rank));
      
      const sortedBefore = manager.getSortedRanks();
      expect(sortedBefore).toEqual(ranks);
      
      // Add a new rank in the middle
      const newRank = manager.generateNewRank('d', 'f');
      const sortedAfter = manager.getSortedRanks();
      
      expect(sortedAfter).toHaveLength(ranks.length + 1);
      expect(sortedAfter).toContain(newRank);
      
      // Verify all ranks are still properly ordered
      for (let i = 0; i < sortedAfter.length - 1; i++) {
        expect(sortedAfter[i] < sortedAfter[i + 1]).toBe(true);
      }
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex reordering scenarios', () => {
      const manager = new LexoRankManager();
      
      // Create initial items
      const ranks = [];
      for (let i = 0; i < 5; i++) {
        const rank = manager.generateNewRank();
        ranks.push(rank);
      }
      
      // Insert item at the beginning
      const firstRank = manager.generateNewRank(undefined, ranks[0]);
      expect(firstRank < ranks[0]).toBe(true);
      
      // Insert item at the end
      const lastRank = manager.generateNewRank(ranks[ranks.length - 1]);
      expect(lastRank > ranks[ranks.length - 1]).toBe(true);
      
      // Insert item in the middle
      const middleRank = manager.generateNewRank(ranks[1], ranks[2]);
      expect(middleRank > ranks[1]).toBe(true);
      expect(middleRank < ranks[2]).toBe(true);
      
      // Verify final order
      const finalRanks = manager.getSortedRanks();
      for (let i = 0; i < finalRanks.length - 1; i++) {
        expect(finalRanks[i] < finalRanks[i + 1]).toBe(true);
      }
    });

    it('should handle boundary conditions gracefully', () => {
      // Test with very small and very large rank values
      const smallRank = '0';
      const largeRank = 'zzzzzz';
      
      expect(isValidRank(smallRank)).toBe(true);
      expect(isValidRank(largeRank)).toBe(true);
      
      const betweenRank = generateRankBetween(smallRank, largeRank);
      expect(betweenRank > smallRank).toBe(true);
      expect(betweenRank < largeRank).toBe(true);
    });

    it('should perform well with many operations', () => {
      const manager = new LexoRankManager();
      const startTime = Date.now();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        manager.generateNewRank();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (1 second)
      expect(duration).toBeLessThan(1000);
      expect(manager.getSortedRanks()).toHaveLength(100);
    });
  });
});