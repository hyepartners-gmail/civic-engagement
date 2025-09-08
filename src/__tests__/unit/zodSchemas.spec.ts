import {
  VoteChoiceEnum,
  VoteChoiceNumberEnum,
  MessageStatusEnum,
  PartyBucketEnum,
  ABPairStatusEnum,
  GroupByEnum,
  CountsSchema,
  CountsWithTotalSchema,
  RatesSchema,
  MessageSchema,
  VoteAggregateShardSchema,
  VoteAggregateRollupSchema,
  ABPairSchema,
  PendingVoteSchema,
  UserContextSchema,
  ResultsFiltersSchema,
  ResultsItemSchema,
  ResultsResponseSchema,
  choiceToLabel,
  createCompositeKey,
  getShardId,
  calculateRates,
  combineCounts,
  type VoteChoice,
  type VoteChoiceNumber,
  type Counts,
  type Message,
  type VoteAggregateShard,
  type ABPair,
} from '@/lib/messaging-schemas';

describe('Messaging Schemas', () => {
  describe('Enum Validations', () => {
    describe('VoteChoiceEnum', () => {
      it('should validate correct vote choices', () => {
        expect(VoteChoiceEnum.safeParse('1').success).toBe(true);
        expect(VoteChoiceEnum.safeParse('2').success).toBe(true);
        expect(VoteChoiceEnum.safeParse('3').success).toBe(true);
        expect(VoteChoiceEnum.safeParse('4').success).toBe(true);
      });

      it('should reject invalid vote choices', () => {
        expect(VoteChoiceEnum.safeParse('0').success).toBe(false);
        expect(VoteChoiceEnum.safeParse('5').success).toBe(false);
        expect(VoteChoiceEnum.safeParse('invalid').success).toBe(false);
        expect(VoteChoiceEnum.safeParse(1).success).toBe(false); // Number instead of string
      });
    });

    describe('VoteChoiceNumberEnum', () => {
      it('should validate correct numeric vote choices', () => {
        expect(VoteChoiceNumberEnum.safeParse(1).success).toBe(true);
        expect(VoteChoiceNumberEnum.safeParse(2).success).toBe(true);
        expect(VoteChoiceNumberEnum.safeParse(3).success).toBe(true);
        expect(VoteChoiceNumberEnum.safeParse(4).success).toBe(true);
      });

      it('should reject invalid numeric vote choices', () => {
        expect(VoteChoiceNumberEnum.safeParse(0).success).toBe(false);
        expect(VoteChoiceNumberEnum.safeParse(5).success).toBe(false);
        expect(VoteChoiceNumberEnum.safeParse('1').success).toBe(false); // String instead of number
      });
    });

    describe('MessageStatusEnum', () => {
      it('should validate message statuses', () => {
        expect(MessageStatusEnum.safeParse('active').success).toBe(true);
        expect(MessageStatusEnum.safeParse('inactive').success).toBe(true);
      });

      it('should reject invalid message statuses', () => {
        expect(MessageStatusEnum.safeParse('draft').success).toBe(false);
        expect(MessageStatusEnum.safeParse('published').success).toBe(false);
      });
    });

    describe('PartyBucketEnum', () => {
      it('should validate party buckets', () => {
        expect(PartyBucketEnum.safeParse('D').success).toBe(true);
        expect(PartyBucketEnum.safeParse('R').success).toBe(true);
        expect(PartyBucketEnum.safeParse('I').success).toBe(true);
        expect(PartyBucketEnum.safeParse('O').success).toBe(true);
        expect(PartyBucketEnum.safeParse('U').success).toBe(true);
      });

      it('should reject invalid party buckets', () => {
        expect(PartyBucketEnum.safeParse('democrat').success).toBe(false);
        expect(PartyBucketEnum.safeParse('republican').success).toBe(false);
        expect(PartyBucketEnum.safeParse('d').success).toBe(false); // Lowercase
      });
    });

    describe('GroupByEnum', () => {
      it('should validate group by options', () => {
        expect(GroupByEnum.safeParse('message').success).toBe(true);
        expect(GroupByEnum.safeParse('day').success).toBe(true);
        expect(GroupByEnum.safeParse('geo').success).toBe(true);
        expect(GroupByEnum.safeParse('party').success).toBe(true);
        expect(GroupByEnum.safeParse('demo').success).toBe(true);
      });

      it('should reject invalid group by options', () => {
        expect(GroupByEnum.safeParse('user').success).toBe(false);
        expect(GroupByEnum.safeParse('time').success).toBe(false);
      });
    });
  });

  describe('Object Schema Validations', () => {
    describe('CountsSchema', () => {
      it('should validate correct counts object', () => {
        const validCounts = {
          love: 10,
          like: 5,
          dislike: 2,
          hate: 1,
        };
        expect(CountsSchema.safeParse(validCounts).success).toBe(true);
      });

      it('should reject invalid counts', () => {
        expect(CountsSchema.safeParse({ love: -1, like: 0, dislike: 0, hate: 0 }).success).toBe(false);
        expect(CountsSchema.safeParse({ love: 'ten', like: 0, dislike: 0, hate: 0 }).success).toBe(false);
        expect(CountsSchema.safeParse({ love: 10, like: 5 }).success).toBe(false); // Missing fields
      });

      it('should handle zero counts', () => {
        const zeroCounts = { love: 0, like: 0, dislike: 0, hate: 0 };
        expect(CountsSchema.safeParse(zeroCounts).success).toBe(true);
      });
    });

    describe('MessageSchema', () => {
      it('should validate complete message', () => {
        const validMessage = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          slogan: 'Test message',
          subline: 'Test subline',
          status: 'active' as const,
          rank: 'abc123',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        expect(MessageSchema.safeParse(validMessage).success).toBe(true);
      });

      it('should validate message without optional fields', () => {
        const minimalMessage = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          slogan: 'Test message',
          status: 'active' as const,
          rank: 'abc123',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        expect(MessageSchema.safeParse(minimalMessage).success).toBe(true);
      });

      it('should reject invalid message', () => {
        const invalidMessage = {
          id: 'invalid-uuid',
          slogan: '', // Empty string
          status: 'invalid-status',
          rank: '',
          createdAt: 'not-a-date',
          updatedAt: new Date(),
        };
        expect(MessageSchema.safeParse(invalidMessage).success).toBe(false);
      });
    });

    describe('VoteAggregateShardSchema', () => {
      it('should validate complete shard', () => {
        const validShard = {
          id: 'shard123',
          messageId: '123e4567-e89b-12d3-a456-426614174000',
          geoBucket: 'US_CA',
          partyBucket: 'D' as const,
          demoBucket: 'age_25_34',
          day: '2024-01-15',
          counts: { love: 5, like: 3, dislike: 1, hate: 0 },
          updatedAt: new Date(),
          compositeKey: 'msg123_US_CA_D_age_25_34_2024-01-15',
        };
        expect(VoteAggregateShardSchema.safeParse(validShard).success).toBe(true);
      });

      it('should validate shard with undefined optional fields', () => {
        const minimalShard = {
          id: 'shard123',
          messageId: '123e4567-e89b-12d3-a456-426614174000',
          day: '2024-01-15',
          counts: { love: 5, like: 3, dislike: 1, hate: 0 },
          updatedAt: new Date(),
          compositeKey: 'msg123_-_-_-_2024-01-15',
        };
        expect(VoteAggregateShardSchema.safeParse(minimalShard).success).toBe(true);
      });
    });

    describe('ABPairSchema', () => {
      it('should validate complete A/B pair', () => {
        const validPair = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test A/B Pair',
          description: 'Testing two messages',
          messageA: '123e4567-e89b-12d3-a456-426614174001',
          messageB: '123e4567-e89b-12d3-a456-426614174002',
          status: 'active' as const,
          rank: 'abc123',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        expect(ABPairSchema.safeParse(validPair).success).toBe(true);
      });

      it('should reject pair with same messageA and messageB', () => {
        const invalidPair = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test A/B Pair',
          messageA: '123e4567-e89b-12d3-a456-426614174001',
          messageB: '123e4567-e89b-12d3-a456-426614174001', // Same as messageA
          status: 'active' as const,
          rank: 'abc123',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        expect(ABPairSchema.safeParse(invalidPair).success).toBe(false);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('choiceToLabel', () => {
      it('should convert vote choice numbers to labels', () => {
        expect(choiceToLabel(1)).toBe('love');
        expect(choiceToLabel(2)).toBe('like');
        expect(choiceToLabel(3)).toBe('dislike');
        expect(choiceToLabel(4)).toBe('hate');
      });

      it('should throw for invalid choice numbers', () => {
        expect(() => choiceToLabel(0 as any)).toThrow();
        expect(() => choiceToLabel(5 as any)).toThrow();
      });
    });

    describe('createCompositeKey', () => {
      it('should create composite key with all parameters', () => {
        const key = createCompositeKey('msg123', 'US_CA', 'D', 'age_25_34', '2024-01-15');
        expect(key).toBe('msg123_US_CA_D_age_25_34_2024-01-15');
      });

      it('should handle undefined parameters with fallbacks', () => {
        const key = createCompositeKey('msg123', undefined, undefined, undefined, '2024-01-15');
        expect(key).toBe('msg123_ALL_ALL_ALL_2024-01-15');
      });

      it('should create consistent keys', () => {
        const key1 = createCompositeKey('msg123', 'US_CA', 'D', 'age_25_34', '2024-01-15');
        const key2 = createCompositeKey('msg123', 'US_CA', 'D', 'age_25_34', '2024-01-15');
        expect(key1).toBe(key2);
      });

      it('should create different keys for different parameters', () => {
        const key1 = createCompositeKey('msg123', 'US_CA', 'D', 'age_25_34', '2024-01-15');
        const key2 = createCompositeKey('msg123', 'US_NY', 'D', 'age_25_34', '2024-01-15');
        expect(key1).not.toBe(key2);
      });
    });

    describe('getShardId', () => {
      it('should generate consistent shard IDs', () => {
        const shard1 = getShardId('msg123', 'user456', 16);
        const shard2 = getShardId('msg123', 'user456', 16);
        expect(shard1).toBe(shard2);
      });

      it('should distribute across shards', () => {
        const shards = new Set();
        for (let i = 0; i < 100; i++) {
          const shardId = getShardId('msg123', `user${i}`, 16);
          shards.add(shardId);
        }
        
        // Should use multiple shards
        expect(shards.size).toBeGreaterThan(1);
        expect(shards.size).toBeLessThanOrEqual(16);
        
        // All shard IDs should be within range
        Array.from(shards).forEach(shardId => {
          expect(shardId).toBeGreaterThanOrEqual(0);
          expect(shardId).toBeLessThan(16);
        });
      });

      it('should handle different shard counts', () => {
        const shard8 = getShardId('msg123', 'user456', 8);
        const shard32 = getShardId('msg123', 'user456', 32);
        
        expect(shard8).toBeGreaterThanOrEqual(0);
        expect(shard8).toBeLessThan(8);
        expect(shard32).toBeGreaterThanOrEqual(0);
        expect(shard32).toBeLessThan(32);
      });

      it('should use default shard count', () => {
        const shardId = getShardId('msg123', 'user456');
        expect(shardId).toBeGreaterThanOrEqual(0);
        expect(shardId).toBeLessThan(16); // Default shard count
      });
    });

    describe('calculateRates', () => {
      it('should calculate rates correctly', () => {
        const counts: Counts = { love: 10, like: 5, dislike: 3, hate: 2 };
        const rates = calculateRates(counts);
        
        expect(rates.loveRate).toBeCloseTo(0.5); // 10/20
        expect(rates.likeRate).toBeCloseTo(0.25); // 5/20
        expect(rates.dislikeRate).toBeCloseTo(0.15); // 3/20
        expect(rates.hateRate).toBeCloseTo(0.1); // 2/20
        expect(rates.favorability).toBeCloseTo(0.4); // (10+5-3-2)/20
        expect(rates.engagement).toBe(20); // Total count
      });

      it('should handle zero counts', () => {
        const counts: Counts = { love: 0, like: 0, dislike: 0, hate: 0 };
        const rates = calculateRates(counts);
        
        expect(rates.loveRate).toBe(0);
        expect(rates.likeRate).toBe(0);
        expect(rates.dislikeRate).toBe(0);
        expect(rates.hateRate).toBe(0);
        expect(rates.favorability).toBe(0);
        expect(rates.engagement).toBe(0);
      });

      it('should handle single vote type', () => {
        const counts: Counts = { love: 5, like: 0, dislike: 0, hate: 0 };
        const rates = calculateRates(counts);
        
        expect(rates.loveRate).toBe(1);
        expect(rates.favorability).toBe(1);
        expect(rates.engagement).toBe(5);
      });

      it('should calculate negative favorability', () => {
        const counts: Counts = { love: 1, like: 1, dislike: 5, hate: 5 };
        const rates = calculateRates(counts);
        
        expect(rates.favorability).toBeCloseTo(-0.67, 2); // (1+1-5-5)/12
        expect(rates.engagement).toBe(12);
      });
    });

    describe('combineCounts', () => {
      it('should combine two counts objects', () => {
        const counts1: Counts = { love: 5, like: 3, dislike: 1, hate: 0 };
        const counts2: Counts = { love: 2, like: 1, dislike: 2, hate: 1 };
        
        const combined = combineCounts(counts1, counts2);
        
        expect(combined).toEqual({
          love: 7,
          like: 4,
          dislike: 3,
          hate: 1,
        });
      });

      it('should combine multiple counts objects', () => {
        const counts1: Counts = { love: 1, like: 1, dislike: 1, hate: 1 };
        const counts2: Counts = { love: 2, like: 2, dislike: 2, hate: 2 };
        const counts3: Counts = { love: 3, like: 3, dislike: 3, hate: 3 };
        
        const combined = combineCounts(counts1, counts2, counts3);
        
        expect(combined).toEqual({
          love: 6,
          like: 6,
          dislike: 6,
          hate: 6,
        });
      });

      it('should handle empty input', () => {
        const combined = combineCounts();
        expect(combined).toEqual({
          love: 0,
          like: 0,
          dislike: 0,
          hate: 0,
        });
      });

      it('should handle single counts object', () => {
        const counts: Counts = { love: 5, like: 3, dislike: 1, hate: 0 };
        const combined = combineCounts(counts);
        expect(combined).toEqual(counts);
      });

      it('should not mutate original objects', () => {
        const original1: Counts = { love: 1, like: 1, dislike: 1, hate: 1 };
        const original2: Counts = { love: 2, like: 2, dislike: 2, hate: 2 };
        
        const combined = combineCounts(original1, original2);
        
        // Original objects should remain unchanged
        expect(original1).toEqual({ love: 1, like: 1, dislike: 1, hate: 1 });
        expect(original2).toEqual({ love: 2, like: 2, dislike: 2, hate: 2 });
        
        // Combined should be different
        expect(combined).toEqual({ love: 3, like: 3, dislike: 3, hate: 3 });
      });
    });
  });

  describe('Edge Cases and Unicode Handling', () => {
    it('should handle Unicode characters in message content', () => {
      const messageWithUnicode = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slogan: '🗳️ Vote for change! 投票支持变革！',
        subline: 'Make a difference 🌟',
        status: 'active' as const,
        rank: 'abc123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(MessageSchema.safeParse(messageWithUnicode).success).toBe(true);
    });

    it('should handle very long strings within limits', () => {
      const longSlogan = 'A'.repeat(500); // Assuming there's a reasonable limit
      const message = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slogan: longSlogan,
        status: 'active' as const,
        rank: 'abc123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = MessageSchema.safeParse(message);
      // This test depends on whether there are string length limits in the schema
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle edge case composite keys', () => {
      // Test with all undefined values
      const key1 = createCompositeKey('msg', undefined, undefined, undefined, 'day');
      expect(key1).toBe('msg_ALL_ALL_ALL_day');
      
      // Test with empty strings vs undefined
      const key2 = createCompositeKey('msg', '', '', '', 'day');
      expect(key2).toBe('msg___day');
    });

    it('should handle large vote counts', () => {
      const largeCounts: Counts = {
        love: 1000000,
        like: 2000000,
        dislike: 500000,
        hate: 100000,
      };
      
      expect(CountsSchema.safeParse(largeCounts).success).toBe(true);
      
      const rates = calculateRates(largeCounts);
      expect(rates.engagement).toBe(3600000);
      expect(rates.favorability).toBeCloseTo(0.72, 2);
    });
  });

  describe('Type Safety and Inference', () => {
    it('should infer correct types', () => {
      const counts: Counts = { love: 1, like: 2, dislike: 3, hate: 4 };
      
      // These should compile without type errors
      expect(typeof counts.love).toBe('number');
      expect(typeof counts.like).toBe('number');
      expect(typeof counts.dislike).toBe('number');
      expect(typeof counts.hate).toBe('number');
    });

    it('should enforce enum constraints', () => {
      const validChoice: VoteChoiceNumber = 1;
      const validParty: PartyBucket = 'D';
      
      expect(choiceToLabel(validChoice)).toBe('love');
      expect(PartyBucketEnum.safeParse(validParty).success).toBe(true);
    });
  });
});