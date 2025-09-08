/**
 * Concurrency Handling Tests
 * 
 * Validates that the Political Messaging Testbed handles concurrent operations safely:
 * - Race condition prevention in vote aggregation
 * - Transaction rollback and data consistency
 * - Vote counter accuracy under concurrent access
 * - Idempotency enforcement under concurrency
 */

import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import { createTestFixtures, createMockSession, resetFixtures, TEST_USERS } from '../fixtures/testData';
import type { TestFixtures } from '../fixtures/testData';

// Import API handlers for concurrency testing
import voteBatchHandler from '@/pages/api/messages/vote-batch';
import resultsHandler from '@/pages/api/admin/messages/results';
import messagesHandler from '@/pages/api/messages';
import adminMessagesHandler from '@/pages/api/admin/messages';
import reorderHandler from '@/pages/api/admin/messages/reorder';

// Mock dependencies
jest.mock('@/lib/datastoreServer', () => {
  let mockDatastore: any = null;
  return {
    get datastore() { return mockDatastore; },
    set datastore(ds: any) { mockDatastore = ds; },
    fromDatastore: jest.fn((entity: any) => {
      const { [Symbol.for('KEY')]: key, ...data } = entity;
      return { ...data, id: key?.id || key?.name };
    }),
    DATASTORE_NAMESPACE: 'test',
  };
});

jest.mock('next-auth/react', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/vote-aggregation-service', () => ({ processVoteBatch: jest.fn() }));
jest.mock('@/lib/rate-limiting', () => ({ withRateLimit: jest.fn((limiter, handler) => handler) }));
jest.mock('@/lib/bucket-derivation', () => ({ deriveAllBuckets: jest.fn(() => ({ geoBucket: 'US_CA', partyBucket: 'D', demoBucket: 'age_25_34' })) }));
jest.mock('@/lib/admin-auth-middleware', () => ({
  withAdminAuth: jest.fn((handler) => async (req: any, res: any) => {
    const session = await require('next-auth/react').getSession({ req });
    if (!session) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    if (session.user.role !== 'admin') return res.status(403).json({ error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Admin access required' } });
    req.user = session.user;
    return handler(req, res);
  }),
  validateMethod: jest.fn((req, res, methods) => methods.includes(req.method)),
  setStandardHeaders: jest.fn(),
  setCacheHeaders: jest.fn(),
}));

const mockGetSession = require('next-auth/react').getSession;
const mockProcessVoteBatch = require('@/lib/vote-aggregation-service').processVoteBatch;

describe('Concurrency Handling Tests', () => {
  let fixtures: TestFixtures;

  beforeEach(async () => {
    fixtures = await createTestFixtures();
    const datastoreModule = require('@/lib/datastoreServer');
    datastoreModule.datastore = fixtures.datastore;
    jest.clearAllMocks();
    mockProcessVoteBatch.mockImplementation(async (votes: any[]) => ({ accepted: votes.length, dropped: 0 }));
  });

  afterEach(async () => {
    await resetFixtures(fixtures);
  });

  describe('Vote Aggregation Race Conditions', () => {
    it('should maintain vote count accuracy under concurrent voting', async () => {
      mockGetSession.mockResolvedValue(null);
      
      // Get available messages
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      const targetMessageId = messages[0].id;
      
      const concurrentVotes = 50;
      console.log(`Testing concurrent vote aggregation with ${concurrentVotes} votes...`);
      
      // Create concurrent vote requests for the same message
      const votePromises = Array.from({ length: concurrentVotes }, (_, i) => {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              {
                messageId: targetMessageId,
                choice: (i % 4) + 1, // Distribute across all vote choices
                votedAtClient: new Date().toISOString(),
              },
            ],
            userContext: {
              geoBucket: 'US_CA',
              partyBucket: 'D',
              demoBucket: 'age_25_34',
            },
            idempotencyKey: `concurrent-vote-${i}`,
          },
        });
        
        return voteBatchHandler(req, res).then(() => ({
          statusCode: res._getStatusCode(),
          data: JSON.parse(res._getData()),
        }));
      });
      
      // Execute all votes concurrently
      const results = await Promise.all(votePromises);
      
      // All votes should succeed
      const successfulVotes = results.filter(r => r.statusCode === 200);
      expect(successfulVotes).toHaveLength(concurrentVotes);
      
      // Verify total accepted votes
      const totalAccepted = successfulVotes.reduce((sum, r) => sum + r.data.accepted, 0);
      expect(totalAccepted).toBe(concurrentVotes);
      
      console.log(`Successfully processed ${totalAccepted} concurrent votes`);
      
      // Verify vote aggregation consistency by checking shard totals
      const shardKeys = Array.from({ length: 10 }, (_, i) =>
        fixtures.datastore.key(['VoteAggregateShard', `${targetMessageId}|ALL|ALL|ALL|${i}`])
      );
      
      const [shardEntities] = await fixtures.datastore.get(shardKeys);
      const aggregatedTotals = shardEntities.reduce((totals: any, shard: any) => {
        if (!shard) return totals;
        return {
          love: totals.love + (shard.love || 0),
          like: totals.like + (shard.like || 0),
          dislike: totals.dislike + (shard.dislike || 0),
          hate: totals.hate + (shard.hate || 0),
        };
      }, { love: 0, like: 0, dislike: 0, hate: 0 });
      
      const totalVotesInShards = aggregatedTotals.love + aggregatedTotals.like + 
                               aggregatedTotals.dislike + aggregatedTotals.hate;
      
      console.log(`Vote distribution: ${JSON.stringify(aggregatedTotals)}`);
      expect(totalVotesInShards).toBe(concurrentVotes);
    });

    it('should handle concurrent votes with duplicate idempotency keys correctly', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      const duplicateRequests = 20;
      const sharedIdempotencyKey = 'duplicate-key-test';
      
      console.log(`Testing ${duplicateRequests} concurrent requests with same idempotency key...`);
      
      // Create multiple concurrent requests with the same idempotency key
      const duplicatePromises = Array.from({ length: duplicateRequests }, () => {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              {
                messageId: messages[0].id,
                choice: 1,
                votedAtClient: new Date().toISOString(),
              },
            ],
            idempotencyKey: sharedIdempotencyKey,
          },
        });
        
        return voteBatchHandler(req, res).then(() => ({
          statusCode: res._getStatusCode(),
          data: JSON.parse(res._getData()),
        }));
      });
      
      const results = await Promise.all(duplicatePromises);
      
      // All requests should return 200 (processed successfully)
      const allSuccessful = results.every(r => r.statusCode === 200);
      expect(allSuccessful).toBe(true);
      
      // Only one should be accepted, others should be dropped due to idempotency
      const totalAccepted = results.reduce((sum, r) => sum + r.data.accepted, 0);
      const totalDropped = results.reduce((sum, r) => sum + r.data.dropped, 0);
      
      console.log(`Idempotency results: ${totalAccepted} accepted, ${totalDropped} dropped`);
      expect(totalAccepted).toBe(1);
      expect(totalDropped).toBe(duplicateRequests - 1);
    });

    it('should prevent race conditions in shard selection', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      // Test concurrent votes that should map to different shards
      const votePromises = Array.from({ length: 30 }, (_, i) => {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              {
                messageId: messages[i % messages.length].id,
                choice: 1,
                votedAtClient: new Date().toISOString(),
              },
            ],
            userContext: {
              geoBucket: `US_${String.fromCharCode(65 + (i % 26))}`, // Generate different geo buckets
              partyBucket: ['D', 'R', 'I'][i % 3],
              demoBucket: `age_${25 + (i % 5) * 10}_${35 + (i % 5) * 10}`,
            },
            idempotencyKey: `shard-test-${i}`,
          },
        });
        
        return voteBatchHandler(req, res).then(() => res._getStatusCode());
      });
      
      const results = await Promise.all(votePromises);
      
      // All should succeed
      expect(results.every(code => code === 200)).toBe(true);
      
      console.log('Concurrent shard selection test completed successfully');
    });
  });

  describe('Transaction Rollback and Data Consistency', () => {
    it('should maintain data consistency when concurrent operations conflict', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      
      // Test concurrent message creation and reordering
      const messageCreationPromises = Array.from({ length: 5 }, (_, i) => {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            slogan: `Concurrent Message ${i}`,
            subline: `Test message ${i}`,
            status: 'active',
          },
        });
        
        return adminMessagesHandler(req, res).then(() => ({
          statusCode: res._getStatusCode(),
          data: res._getData() ? JSON.parse(res._getData()) : null,
        }));
      });
      
      const creationResults = await Promise.all(messageCreationPromises);
      
      // Filter successful creations
      const successfulCreations = creationResults.filter(r => r.statusCode === 201);
      console.log(`Created ${successfulCreations.length} messages concurrently`);
      
      // Verify message list consistency
      const { req: listReq, res: listRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(listReq, listRes);
      const finalMessages = JSON.parse(listRes._getData());
      
      // Should have original messages plus successfully created ones
      expect(finalMessages.length).toBeGreaterThanOrEqual(3); // At least the original fixtures
    });

    it('should handle concurrent reordering operations safely', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      
      // Get current messages
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      if (messages.length < 2) {
        // Skip test if not enough messages
        console.log('Skipping reorder test - insufficient messages');
        return;
      }
      
      // Attempt concurrent reordering of the same message
      const reorderPromises = Array.from({ length: 3 }, (_, i) => {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            id: messages[0].id,
            afterId: messages[1].id,
          },
        });
        
        return reorderHandler(req, res).then(() => ({
          statusCode: res._getStatusCode(),
          data: res._getData() ? JSON.parse(res._getData()) : null,
        }));
      });
      
      const reorderResults = await Promise.all(reorderPromises);
      
      // At least one should succeed
      const successfulReorders = reorderResults.filter(r => r.statusCode === 200);
      expect(successfulReorders.length).toBeGreaterThanOrEqual(1);
      
      // Verify final order is consistent
      const { req: finalReq, res: finalRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(finalReq, finalRes);
      const finalOrder = JSON.parse(finalRes._getData());
      
      // Messages should still be in valid rank order
      const ranks = finalOrder.map((m: any) => m.rank);
      const sortedRanks = [...ranks].sort();
      expect(ranks).toEqual(sortedRanks);
      
      console.log('Concurrent reordering test completed with consistent final order');
    });
  });

  describe('Read-Write Consistency', () => {
    it('should provide consistent read results during concurrent writes', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      // Start concurrent voting
      const votingPromise = Promise.all(Array.from({ length: 10 }, (_, i) => {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              {
                messageId: messages[0].id,
                choice: 1,
                votedAtClient: new Date().toISOString(),
              },
            ],
            idempotencyKey: `read-write-test-${i}`,
          },
        });
        
        return voteBatchHandler(req, res);
      }));
      
      // Concurrent analytics reads
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      const readingPromise = Promise.all(Array.from({ length: 5 }, async () => {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          query: { groupBy: 'message' },
        });
        
        await resultsHandler(req, res);
        return {
          statusCode: res._getStatusCode(),
          data: res._getData() ? JSON.parse(res._getData()) : null,
        };
      }));
      
      // Wait for both concurrent operations
      const [voteResults, readResults] = await Promise.all([votingPromise, readingPromise]);
      
      // All reads should succeed and return consistent data structure
      const successfulReads = readResults.filter(r => r.statusCode === 200);
      expect(successfulReads.length).toBe(5);
      
      // All reads should have the same data structure
      const firstReadStructure = JSON.stringify(Object.keys(successfulReads[0].data));
      successfulReads.forEach(read => {
        const readStructure = JSON.stringify(Object.keys(read.data));
        expect(readStructure).toBe(firstReadStructure);
      });
      
      console.log('Read-write consistency test completed successfully');
    });

    it('should handle high-frequency mixed operations', async () => {
      // Simulate high-frequency mixed read/write operations
      const operations = Array.from({ length: 30 }, (_, i) => ({
        type: ['vote', 'read', 'admin'][i % 3],
        index: i,
      }));
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      const operationPromises = operations.map(async (op) => {
        try {
          if (op.type === 'vote') {
            mockGetSession.mockResolvedValue(null);
            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
              method: 'POST',
              body: {
                votes: [{ messageId: messages[op.index % messages.length].id, choice: 1, votedAtClient: new Date().toISOString() }],
                idempotencyKey: `mixed-op-${op.index}`,
              },
            });
            
            await voteBatchHandler(req, res);
            return { type: 'vote', success: res._getStatusCode() === 200 };
            
          } else if (op.type === 'read') {
            mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
              method: 'GET',
              query: { groupBy: 'message', limit: '10' },
            });
            
            await resultsHandler(req, res);
            return { type: 'read', success: res._getStatusCode() === 200 };
            
          } else {
            // Admin operation
            mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
            const { req, res } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
            await messagesHandler(req, res);
            return { type: 'admin', success: res._getStatusCode() === 200 };
          }
        } catch (error) {
          return { type: op.type, success: false, error: error.message };
        }
      });
      
      const results = await Promise.all(operationPromises);
      
      // Analyze results by type
      const resultsByType = results.reduce((acc: any, result: any) => {
        if (!acc[result.type]) acc[result.type] = { total: 0, successful: 0 };
        acc[result.type].total++;
        if (result.success) acc[result.type].successful++;
        return acc;
      }, {});
      
      console.log('Mixed operations results:', JSON.stringify(resultsByType, null, 2));
      
      // Most operations should succeed
      Object.values(resultsByType).forEach((typeResults: any) => {
        const successRate = typeResults.successful / typeResults.total;
        expect(successRate).toBeGreaterThan(0.8); // At least 80% success rate
      });
    });
  });
});