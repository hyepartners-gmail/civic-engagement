import {
  processVoteBatch,
  aggregateVoteResults,
  getMessageVoteStats,
  compareMessageStats,
} from '@/lib/vote-aggregation-service';
import { PendingVote, UserContext, VoteAggregateShard } from '@/lib/messaging-schemas';

// Mock the messaging-datastore module
jest.mock('@/lib/messaging-datastore', () => ({
  incrementVoteShard: jest.fn(),
  createVoteDedupeRecord: jest.fn(),
  checkVoteDedupe: jest.fn(),
  getAggregatedVoteData: jest.fn(),
  getShardsForCompositeKey: jest.fn(),
  aggregateShardCounts: jest.fn(),
  getVoteDayBucket: jest.fn(() => '2024-01-15'),
  createOrUpdateRollup: jest.fn(),
}));

const mockDatastore = {
  incrementVoteShard: require('@/lib/messaging-datastore').incrementVoteShard,
  createVoteDedupeRecord: require('@/lib/messaging-datastore').createVoteDedupeRecord,
  checkVoteDedupe: require('@/lib/messaging-datastore').checkVoteDedupe,
  getAggregatedVoteData: require('@/lib/messaging-datastore').getAggregatedVoteData,
  getShardsForCompositeKey: require('@/lib/messaging-datastore').getShardsForCompositeKey,
  aggregateShardCounts: require('@/lib/messaging-datastore').aggregateShardCounts,
  getVoteDayBucket: require('@/lib/messaging-datastore').getVoteDayBucket,
  createOrUpdateRollup: require('@/lib/messaging-datastore').createOrUpdateRollup,
};

// Mock data for tests
const mockAggregateShards: VoteAggregateShard[] = [
  {
    id: 'shard1',
    messageId: '123e4567-e89b-12d3-a456-426614174000',
    compositeKey: 'msg123_ALL_ALL_ALL_2024-01-15',
    geoBucket: undefined,
    partyBucket: undefined,
    demoBucket: undefined,
    day: '2024-01-15',
    counts: { love: 5, like: 3, dislike: 1, hate: 0 },
    updatedAt: new Date('2024-01-15T12:00:00Z'),
  },
  {
    id: 'shard2',
    messageId: '123e4567-e89b-12d3-a456-426614174000',
    compositeKey: 'msg123_US_CA_democrat_age_25_34_2024-01-15',
    geoBucket: 'US_CA',
    partyBucket: 'democrat',
    demoBucket: 'age_25_34',
    day: '2024-01-15',
    counts: { love: 2, like: 1, dislike: 0, hate: 0 },
    updatedAt: new Date('2024-01-15T12:00:00Z'),
  },
];

describe('Vote Aggregation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processVoteBatch', () => {
    const mockVotes: PendingVote[] = [
      { messageId: '123e4567-e89b-12d3-a456-426614174000', choice: 1 },
      { messageId: '456e7890-e89b-12d3-a456-426614174001', choice: 2 },
    ];

    const mockUserContext: UserContext = {
      geoBucket: 'US_CA',
      partyBucket: 'democrat',
      demoBucket: 'age_25_34',
    };

    beforeEach(() => {
      mockDatastore.checkVoteDedupe.mockResolvedValue(false);
      mockDatastore.createVoteDedupeRecord.mockResolvedValue(undefined);
      mockDatastore.incrementVoteShard.mockResolvedValue(undefined);
      mockDatastore.createOrUpdateRollup.mockResolvedValue(undefined);
    });

    it('should process valid vote batch successfully', async () => {
      const result = await processVoteBatch(
        mockVotes,
        mockUserContext,
        'user123',
        undefined
      );

      expect(result.accepted).toBe(2);
      expect(result.dropped).toBe(0);
      expect(result.errors).toHaveLength(0);
      
      // Should check dedupe for each vote
      expect(mockDatastore.checkVoteDedupe).toHaveBeenCalledTimes(2);
      
      // Should increment shards (2 calls per vote: current day + all-time)
      expect(mockDatastore.incrementVoteShard).toHaveBeenCalledTimes(4);
      
      // Should create dedupe records
      expect(mockDatastore.createVoteDedupeRecord).toHaveBeenCalledTimes(2);
    });

    it('should handle empty vote batch', async () => {
      const result = await processVoteBatch(
        [],
        mockUserContext,
        'user123',
        undefined
      );

      expect(result.accepted).toBe(0);
      expect(result.dropped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockDatastore.incrementVoteShard).not.toHaveBeenCalled();
    });

    it('should handle duplicate votes (deduplication)', async () => {
      mockDatastore.checkVoteDedupe
        .mockResolvedValueOnce(true) // First vote is duplicate
        .mockResolvedValueOnce(false); // Second vote is new

      const result = await processVoteBatch(
        mockVotes,
        mockUserContext,
        'user123',
        undefined
      );

      expect(result.accepted).toBe(1);
      expect(result.dropped).toBe(1);
      expect(result.errors).toHaveLength(0);
      
      // Should only increment shards for the non-duplicate vote
      expect(mockDatastore.incrementVoteShard).toHaveBeenCalledTimes(2);
      expect(mockDatastore.createVoteDedupeRecord).toHaveBeenCalledTimes(1);
    });

    it('should handle processing errors gracefully', async () => {
      mockDatastore.incrementVoteShard
        .mockRejectedValueOnce(new Error('Datastore error'))
        .mockRejectedValueOnce(new Error('Datastore error'))
        .mockResolvedValue(undefined);

      const result = await processVoteBatch(
        mockVotes,
        mockUserContext,
        'user123',
        undefined
      );

      expect(result.accepted).toBe(1);
      expect(result.dropped).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Datastore error');
    });

    it('should process votes with anonymous session', async () => {
      const result = await processVoteBatch(
        mockVotes,
        mockUserContext,
        undefined,
        'anon-session-123'
      );

      expect(result.accepted).toBe(2);
      expect(result.dropped).toBe(0);
      expect(mockDatastore.incrementVoteShard).toHaveBeenCalledTimes(4);
    });

    it('should process votes with minimal user context', async () => {
      const result = await processVoteBatch(
        mockVotes,
        {}, // Empty user context
        'user123',
        undefined
      );

      expect(result.accepted).toBe(2);
      expect(result.dropped).toBe(0);
      
      // Should still process with fallback values
      expect(mockDatastore.incrementVoteShard).toHaveBeenCalledWith(
        expect.any(String),
        '-', // fallback geoBucket
        '-', // fallback partyBucket
        '-', // fallback demoBucket
        expect.any(String),
        expect.any(String),
        'user123'
      );
    });

    it('should generate unique user identifier when none provided', async () => {
      const result = await processVoteBatch(
        [mockVotes[0]],
        mockUserContext,
        undefined,
        undefined
      );

      expect(result.accepted).toBe(1);
      expect(mockDatastore.incrementVoteShard).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String) // Should generate a UUID
      );
    });
  });

  describe('aggregateVoteResults', () => {
    beforeEach(() => {
      mockDatastore.getAggregatedVoteData.mockResolvedValue(mockAggregateShards);
      mockDatastore.aggregateShardCounts.mockReturnValue({ love: 7, like: 4, dislike: 1, hate: 0 });
    });

    it('should aggregate vote counts correctly', async () => {
      const result = await aggregateVoteResults({
        groupBy: 'message',
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].key).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.totals.n).toBeGreaterThan(0);
      expect(mockDatastore.getAggregatedVoteData).toHaveBeenCalled();
    });

    it('should filter by message ID', async () => {
      await aggregateVoteResults({
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        groupBy: 'message',
        limit: 10,
      });

      expect(mockDatastore.getAggregatedVoteData).toHaveBeenCalledWith({
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        geoBucket: undefined,
        partyBucket: undefined,
        demoBucket: undefined,
        fromDate: undefined,
        toDate: undefined,
      });
    });

    it('should handle filtering by demographic bucket', async () => {
      await aggregateVoteResults({
        demo: 'youth',
        groupBy: 'demo',
        limit: 10,
      });

      expect(mockDatastore.getAggregatedVoteData).toHaveBeenCalledWith({
        messageId: undefined,
        geoBucket: undefined,
        partyBucket: undefined,
        demoBucket: 'youth',
        fromDate: undefined,
        toDate: undefined,
      });
    });

    it('should handle date range filtering', async () => {
      await aggregateVoteResults({
        from: '2024-01-01',
        to: '2024-01-31',
        groupBy: 'day',
        limit: 10,
      });

      expect(mockDatastore.getAggregatedVoteData).toHaveBeenCalledWith({
        messageId: undefined,
        geoBucket: undefined,
        partyBucket: undefined,
        demoBucket: undefined,
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });
    });

    it('should handle empty results', async () => {
      mockDatastore.getAggregatedVoteData.mockResolvedValue([]);

      const result = await aggregateVoteResults({
        groupBy: 'message',
        limit: 10,
      });

      expect(result.items).toHaveLength(0);
      expect(result.totals.n).toBe(0);
    });

    it('should handle multiple messages', async () => {
      const multiMessageShards = [
        ...mockAggregateShards,
        {
          id: 'shard3',
          messageId: '456e7890-e89b-12d3-a456-426614174001',
          compositeKey: 'msg456_ALL_ALL_ALL_2024-01-15',
          geoBucket: undefined,
          partyBucket: undefined,
          demoBucket: undefined,
          day: '2024-01-15',
          counts: { love: 2, like: 1, dislike: 0, hate: 0 },
          updatedAt: new Date('2024-01-15T12:00:00Z'),
        },
      ];
      mockDatastore.getAggregatedVoteData.mockResolvedValue(multiMessageShards);

      const result = await aggregateVoteResults({
        groupBy: 'message',
        limit: 10,
      });

      expect(result.items).toHaveLength(2);
    });

    it('should handle errors in datastore query', async () => {
      mockDatastore.getAggregatedVoteData.mockRejectedValue(new Error('Datastore query failed'));

      await expect(aggregateVoteResults({
        groupBy: 'message',
        limit: 10,
      })).rejects.toThrow('Datastore query failed');
    });

    it('should respect limit parameter', async () => {
      const manyShards = Array.from({ length: 20 }, (_, i) => ({
        ...mockAggregateShards[0],
        id: `shard${i}`,
        messageId: `message${i}`,
      }));
      mockDatastore.getAggregatedVoteData.mockResolvedValue(manyShards);

      const result = await aggregateVoteResults({
        groupBy: 'message',
        limit: 5,
      });

      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should group by different dimensions', async () => {
      const result = await aggregateVoteResults({
        groupBy: 'day',
        limit: 10,
      });

      expect(result.groupBy).toBe('day');
      expect(result.items[0].key).toBe('2024-01-15');
    });
  });

  describe('getMessageVoteStats', () => {
    beforeEach(() => {
      mockDatastore.getShardsForCompositeKey.mockResolvedValue([mockAggregateShards[0]]);
      mockDatastore.getAggregatedVoteData.mockResolvedValue([mockAggregateShards[1]]);
      mockDatastore.aggregateShardCounts.mockReturnValue({ love: 5, like: 3, dislike: 1, hate: 0 });
    });

    it('should get stats for a message', async () => {
      const stats = await getMessageVoteStats('123e4567-e89b-12d3-a456-426614174000');

      expect(stats.allTime).toBeDefined();
      expect(stats.recent).toBeDefined();
      expect(stats.allTime.rates).toBeDefined();
      expect(stats.recent.rates).toBeDefined();
      expect(mockDatastore.getShardsForCompositeKey).toHaveBeenCalled();
      expect(mockDatastore.getAggregatedVoteData).toHaveBeenCalled();
    });
  });

  describe('compareMessageStats', () => {
    beforeEach(() => {
      mockDatastore.getShardsForCompositeKey.mockResolvedValue([mockAggregateShards[0]]);
      mockDatastore.getAggregatedVoteData.mockResolvedValue([mockAggregateShards[1]]);
      mockDatastore.aggregateShardCounts.mockReturnValue({ love: 5, like: 3, dislike: 1, hate: 0 });
    });

    it('should compare stats between two messages', async () => {
      const comparison = await compareMessageStats(
        '123e4567-e89b-12d3-a456-426614174000',
        '456e7890-e89b-12d3-a456-426614174001'
      );

      expect(comparison.messageA).toBeDefined();
      expect(comparison.messageB).toBeDefined();
      expect(comparison.comparison).toBeDefined();
      expect(comparison.comparison.winner).toMatch(/^[AB]$/);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed vote data', async () => {
      const malformedVotes = [
        { messageId: '123e4567-e89b-12d3-a456-426614174000', choice: 1 },
        { messageId: '', choice: 5 }, // Invalid message ID and choice
      ];

      mockDatastore.checkVoteDedupe.mockResolvedValue(false);
      mockDatastore.createVoteDedupeRecord.mockResolvedValue(undefined);
      mockDatastore.incrementVoteShard.mockRejectedValue(new Error('Invalid data'));

      const result = await processVoteBatch(
        malformedVotes as PendingVote[],
        {},
        'user123',
        undefined
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      mockDatastore.incrementVoteShard.mockRejectedValue(timeoutError);

      const result = await processVoteBatch(
        [{ messageId: '123e4567-e89b-12d3-a456-426614174000', choice: 1 }],
        {},
        'user123',
        undefined
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Request timeout');
    });

    it('should maintain consistency under high load', async () => {
      const manyVotes = Array.from({ length: 50 }, (_, i) => ({
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        choice: (i % 4) + 1,
      }));

      mockDatastore.checkVoteDedupe.mockResolvedValue(false);
      mockDatastore.createVoteDedupeRecord.mockResolvedValue(undefined);
      mockDatastore.incrementVoteShard.mockResolvedValue(undefined);

      const result = await processVoteBatch(
        manyVotes as PendingVote[],
        {},
        'user123',
        undefined
      );

      expect(result.accepted).toBe(50);
      expect(result.dropped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});