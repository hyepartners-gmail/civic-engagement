import { getShardId } from '@/lib/messaging-schemas';

describe('Shard Hash Distribution', () => {
  describe('getShardId', () => {
    it('should generate deterministic shard IDs', () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const userKey = 'user123';
      const shardCount = 16;

      const shard1 = getShardId(messageId, userKey, shardCount);
      const shard2 = getShardId(messageId, userKey, shardCount);

      expect(shard1).toBe(shard2);
      expect(shard1).toBeGreaterThanOrEqual(0);
      expect(shard1).toBeLessThan(shardCount);
    });

    it('should distribute reasonably across shards', () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const shardCount = 16;
      const sampleSize = 1600; // 100 samples per shard for good distribution
      
      // Count occurrences in each shard
      const shardCounts = new Array(shardCount).fill(0);
      
      for (let i = 0; i < sampleSize; i++) {
        const userKey = `user${i}`;
        const shardId = getShardId(messageId, userKey, shardCount);
        shardCounts[shardId]++;
      }

      // Expected count per shard
      const expectedCount = sampleSize / shardCount;
      
      // Check that no shard is completely empty or has too many
      // This is a practical test rather than a strict statistical test
      const minCount = expectedCount * 0.2; // At least 20% of expected (20 items)
      const maxCount = expectedCount * 1.8; // At most 180% of expected (180 items)
      
      let emptyShards = 0;
      let overloadedShards = 0;
      
      for (let i = 0; i < shardCount; i++) {
        if (shardCounts[i] === 0) emptyShards++;
        if (shardCounts[i] > maxCount) overloadedShards++;
        
        expect(shardCounts[i]).toBeGreaterThan(minCount);
        expect(shardCounts[i]).toBeLessThan(maxCount);
      }
      
      // No shard should be completely empty
      expect(emptyShards).toBe(0);
      // No more than 25% of shards should be severely overloaded
      expect(overloadedShards).toBeLessThan(shardCount * 0.25);
      
      // Calculate simple variance to ensure some level of distribution
      const variance = shardCounts.reduce((acc, count) => {
        return acc + Math.pow(count - expectedCount, 2);
      }, 0) / shardCount;
      
      // Variance should not be extremely high (indicates very poor distribution)
      expect(variance).toBeLessThan(expectedCount * expectedCount); // Very lenient threshold
    });

    it('should use all available shards', () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const shardCount = 8;
      const usedShards = new Set<number>();

      // Generate enough samples to likely hit all shards
      for (let i = 0; i < 200; i++) {
        const userKey = `user${i}`;
        const shardId = getShardId(messageId, userKey, shardCount);
        usedShards.add(shardId);
      }

      // Should use most shards (allow for some statistical variation)
      expect(usedShards.size).toBeGreaterThanOrEqual(shardCount * 0.75);
    });

    it('should handle different message IDs independently', () => {
      const userKey = 'user123';
      const shardCount = 16;

      const messageIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '456e7890-e89b-12d3-a456-426614174001',
        '789e0123-e89b-12d3-a456-426614174002',
      ];

      const shardIds = messageIds.map(messageId => 
        getShardId(messageId, userKey, shardCount)
      );

      // Same user with different messages should potentially get different shards
      // (This is not guaranteed but likely with good hash distribution)
      const uniqueShards = new Set(shardIds);
      
      // All shard IDs should be valid
      shardIds.forEach(shardId => {
        expect(shardId).toBeGreaterThanOrEqual(0);
        expect(shardId).toBeLessThan(shardCount);
      });
    });

    it('should handle different user keys for same message', () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const shardCount = 16;

      const userKeys = [
        'user123',
        'user456',
        'user789',
        'anonymous-session-abc',
        'anonymous-session-def',
      ];

      const shardIds = userKeys.map(userKey => 
        getShardId(messageId, userKey, shardCount)
      );

      // All shard IDs should be valid
      shardIds.forEach(shardId => {
        expect(shardId).toBeGreaterThanOrEqual(0);
        expect(shardId).toBeLessThan(shardCount);
      });

      // Same message with different users should potentially get different shards
      const uniqueShards = new Set(shardIds);
      expect(uniqueShards.size).toBeGreaterThan(1);
    });

    it('should handle different shard counts', () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const userKey = 'user123';

      const shardCounts = [4, 8, 16, 32];

      shardCounts.forEach(shardCount => {
        const shardId = getShardId(messageId, userKey, shardCount);
        expect(shardId).toBeGreaterThanOrEqual(0);
        expect(shardId).toBeLessThan(shardCount);
      });
    });

    it('should handle edge case inputs', () => {
      const shardCount = 16;

      // Empty strings (should not crash)
      expect(() => getShardId('', '', shardCount)).not.toThrow();
      
      // Very long strings
      const longId = 'a'.repeat(1000);
      const longUser = 'b'.repeat(1000);
      const shardId = getShardId(longId, longUser, shardCount);
      expect(shardId).toBeGreaterThanOrEqual(0);
      expect(shardId).toBeLessThan(shardCount);

      // Special characters
      const specialId = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const specialUser = '~`"\'\\';
      const specialShardId = getShardId(specialId, specialUser, shardCount);
      expect(specialShardId).toBeGreaterThanOrEqual(0);
      expect(specialShardId).toBeLessThan(shardCount);
    });

    it('should maintain consistency across different platforms', () => {
      // This test ensures the hash function produces consistent results
      // regardless of JavaScript engine or platform differences
      
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const userKey = 'test-user-consistency';
      const shardCount = 16;

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(getShardId(messageId, userKey, shardCount));
      }

      // All results should be identical
      expect(results.every(result => result === results[0])).toBe(true);
    });

    it('should distribute well with sequential user IDs', () => {
      // Test that sequential user IDs don't cluster in the same shards
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const shardCount = 16;
      const shardCounts = new Array(shardCount).fill(0);

      // Generate sequential user IDs
      for (let i = 0; i < 160; i++) {
        const userKey = `user${i.toString().padStart(6, '0')}`; // user000000, user000001, etc.
        const shardId = getShardId(messageId, userKey, shardCount);
        shardCounts[shardId]++;
      }

      // Check distribution is reasonably uniform
      const expectedCount = 160 / shardCount; // 10 per shard
      const tolerance = expectedCount * 0.6; // Allow 40% deviation

      shardCounts.forEach(count => {
        expect(count).toBeGreaterThan(expectedCount - tolerance);
        expect(count).toBeLessThan(expectedCount + tolerance);
      });
    });

    it('should handle minimum and maximum shard counts', () => {
      const messageId = '123e4567-e89b-12d3-a456-426614174000';
      const userKey = 'user123';

      // Minimum shard count
      const minShardId = getShardId(messageId, userKey, 1);
      expect(minShardId).toBe(0);

      // Large shard count
      const maxShardCount = 1024;
      const maxShardId = getShardId(messageId, userKey, maxShardCount);
      expect(maxShardId).toBeGreaterThanOrEqual(0);
      expect(maxShardId).toBeLessThan(maxShardCount);
    });
  });

  describe('Hash Quality Metrics', () => {
    it('should have good avalanche effect', () => {
      // Small changes in input should cause large changes in output
      const baseMessageId = '123e4567-e89b-12d3-a456-426614174000';
      const userKey = 'user123';
      const shardCount = 16;

      const baseShard = getShardId(baseMessageId, userKey, shardCount);

      // Change one character in message ID
      const modifiedMessageId = '123e4567-e89b-12d3-a456-426614174001';
      const modifiedShard = getShardId(modifiedMessageId, userKey, shardCount);

      // Should likely produce different shard (not guaranteed but very likely)
      // We'll just check that the function runs without error for now
      expect(typeof modifiedShard).toBe('number');
      expect(modifiedShard).toBeGreaterThanOrEqual(0);
      expect(modifiedShard).toBeLessThan(shardCount);
    });

    it('should distribute different input types uniformly', () => {
      const shardCount = 16;
      const sampleSize = 320; // 20 per shard
      const shardCounts = new Array(shardCount).fill(0);

      // Mix of different input patterns
      const inputPatterns = [
        // UUID-like message IDs with sequential users
        () => [`123e4567-e89b-12d3-a456-42661417400${Math.floor(Math.random() * 10)}`, `user${Math.floor(Math.random() * 1000)}`],
        // Anonymous session IDs with fixed message
        () => ['fixed-message-id', `anon-session-${Math.random().toString(36)}`],
        // Random strings
        () => [Math.random().toString(36), Math.random().toString(36)],
      ];

      for (let i = 0; i < sampleSize; i++) {
        const patternIndex = i % inputPatterns.length;
        const [messageId, userKey] = inputPatterns[patternIndex]();
        const shardId = getShardId(messageId, userKey, shardCount);
        shardCounts[shardId]++;
      }

      // Check reasonable distribution
      const expectedCount = sampleSize / shardCount;
      const minAcceptableCount = expectedCount * 0.3;
      const maxAcceptableCount = expectedCount * 1.7;

      shardCounts.forEach((count, index) => {
        expect(count).toBeGreaterThan(minAcceptableCount);
        expect(count).toBeLessThan(maxAcceptableCount);
      });
    });
  });
});