/**
 * Performance Benchmark Tests
 * 
 * Validates that the Political Messaging Testbed meets performance requirements:
 * - Vote batch processing: p95 < 150ms
 * - Results analytics: p95 < 120ms
 * - Concurrent request handling
 * - Database query optimization
 */

import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import { createTestFixtures, createMockSession, resetFixtures, TEST_USERS } from '../fixtures/testData';
import type { TestFixtures } from '../fixtures/testData';

// Import API handlers for performance testing
import voteBatchHandler from '@/pages/api/messages/vote-batch';
import resultsHandler from '@/pages/api/admin/messages/results';
import messagesHandler from '@/pages/api/messages';

// Mock dependencies for consistent testing
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

// Performance measurement utilities
function measureLatency<T>(fn: () => Promise<T>): Promise<{ result: T; latency: number }> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    resolve({ result, latency: end - start });
  });
}

function calculatePercentile(latencies: number[], percentile: number): number {
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

describe('Performance Benchmark Tests', () => {
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

  describe('Vote Batch Processing Performance', () => {
    it('should process vote batches within p95 < 150ms', async () => {
      mockGetSession.mockResolvedValue(null);
      
      // Get available messages
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      const latencies: number[] = [];
      const iterations = 100; // Sample size for statistical significance
      
      console.log(`Running ${iterations} vote batch operations for performance measurement...`);
      
      for (let i = 0; i < iterations; i++) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              {
                messageId: messages[i % messages.length].id,
                choice: (i % 4) + 1,
                votedAtClient: new Date().toISOString(),
              },
            ],
            userContext: {
              geoBucket: 'US_CA',
              partyBucket: 'D', 
              demoBucket: 'age_25_34',
            },
            idempotencyKey: `perf-test-${i}`,
          },
        });

        const { result, latency } = await measureLatency(async () => {
          await voteBatchHandler(req, res);
          return res._getStatusCode();
        });

        latencies.push(latency);
        
        // Log progress every 20 iterations
        if ((i + 1) % 20 === 0) {
          console.log(`Completed ${i + 1}/${iterations} iterations`);
        }
      }
      
      const p50 = calculatePercentile(latencies, 50);
      const p95 = calculatePercentile(latencies, 95);
      const p99 = calculatePercentile(latencies, 99);
      const avg = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      
      console.log(`Vote Batch Performance Results:
        - Average: ${avg.toFixed(2)}ms
        - p50: ${p50.toFixed(2)}ms
        - p95: ${p95.toFixed(2)}ms
        - p99: ${p99.toFixed(2)}ms
      `);
      
      // Performance requirements
      expect(p95).toBeLessThan(150); // p95 < 150ms requirement
      expect(avg).toBeLessThan(100); // Additional constraint for good performance
    });

    it('should handle concurrent vote batches efficiently', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      const concurrentRequests = 20;
      console.log(`Testing concurrent processing of ${concurrentRequests} vote batches...`);
      
      const { result, latency } = await measureLatency(async () => {
        const promises = Array.from({ length: concurrentRequests }, (_, i) => {
          const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
            method: 'POST',
            body: {
              votes: [
                {
                  messageId: messages[i % messages.length].id,
                  choice: (i % 4) + 1,
                  votedAtClient: new Date().toISOString(),
                },
              ],
              idempotencyKey: `concurrent-${i}`,
            },
          });
          
          return voteBatchHandler(req, res).then(() => res._getStatusCode());
        });
        
        const results = await Promise.all(promises);
        return results;
      });
      
      console.log(`Concurrent batch processing completed in ${latency.toFixed(2)}ms`);
      
      // All requests should succeed
      result.forEach(statusCode => {
        expect(statusCode).toBe(200);
      });
      
      // Concurrent processing should be reasonably fast
      expect(latency).toBeLessThan(500); // 500ms for 20 concurrent requests
    });
  });

  describe('Results Analytics Performance', () => {
    it('should retrieve analytics within p95 < 120ms', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      
      const latencies: number[] = [];
      const iterations = 50; // Smaller sample for more complex queries
      
      console.log(`Running ${iterations} analytics queries for performance measurement...`);
      
      const queryTypes = [
        { groupBy: 'message', rollup: 'false' },
        { groupBy: 'day', rollup: 'false' },
        { groupBy: 'geo', rollup: 'false' },
        { groupBy: 'party', rollup: 'false' },
        { groupBy: 'demo', rollup: 'false' },
      ];
      
      for (let i = 0; i < iterations; i++) {
        const queryConfig = queryTypes[i % queryTypes.length];
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          query: queryConfig,
        });

        const { result, latency } = await measureLatency(async () => {
          await resultsHandler(req, res);
          return res._getStatusCode();
        });

        latencies.push(latency);
        
        if ((i + 1) % 10 === 0) {
          console.log(`Completed ${i + 1}/${iterations} analytics queries`);
        }
      }
      
      const p50 = calculatePercentile(latencies, 50);
      const p95 = calculatePercentile(latencies, 95);
      const p99 = calculatePercentile(latencies, 99);
      const avg = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      
      console.log(`Analytics Performance Results:
        - Average: ${avg.toFixed(2)}ms
        - p50: ${p50.toFixed(2)}ms
        - p95: ${p95.toFixed(2)}ms
        - p99: ${p99.toFixed(2)}ms
      `);
      
      // Performance requirements
      expect(p95).toBeLessThan(120); // p95 < 120ms requirement
      expect(avg).toBeLessThan(80);  // Additional constraint for good performance
    });

    it('should handle complex filtered queries efficiently', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      
      const complexQueries = [
        { groupBy: 'message', party: 'D', geo: 'US_CA' },
        { groupBy: 'day', from: '2024-01-01', to: '2024-12-31' },
        { groupBy: 'geo', demo: 'age_25_34', limit: '100' },
        { groupBy: 'party', rollup: 'true', messageId: fixtures.messages.M1.id },
      ];
      
      console.log(`Testing complex filtered analytics queries...`);
      
      for (let i = 0; i < complexQueries.length; i++) {
        const query = complexQueries[i];
        
        const { result, latency } = await measureLatency(async () => {
          const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
            method: 'GET',
            query,
          });
          
          await resultsHandler(req, res);
          return res._getStatusCode();
        });
        
        console.log(`Query ${i + 1}: ${JSON.stringify(query)} - ${latency.toFixed(2)}ms`);
        
        expect(result).toBe(200);
        expect(latency).toBeLessThan(200); // Complex queries should still be fast
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle large result sets efficiently', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      
      // Test large result set handling
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { groupBy: 'message', limit: '1000' },
      });
      
      const { result, latency } = await measureLatency(async () => {
        await resultsHandler(req, res);
        return {
          statusCode: res._getStatusCode(),
          dataSize: JSON.stringify(res._getData()).length,
        };
      });
      
      console.log(`Large result set: ${result.dataSize} bytes in ${latency.toFixed(2)}ms`);
      
      expect(result.statusCode).toBe(200);
      expect(latency).toBeLessThan(300); // Large queries should complete within 300ms
    });

    it('should maintain performance under memory pressure', async () => {
      // Simulate memory pressure by running multiple operations
      const operations = Array.from({ length: 10 }, (_, i) => ({
        type: i % 2 === 0 ? 'vote' : 'analytics',
        index: i,
      }));
      
      const results = [];
      
      for (const op of operations) {
        if (op.type === 'vote') {
          mockGetSession.mockResolvedValue(null);
          const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
          await messagesHandler(getReq, getRes);
          const messages = JSON.parse(getRes._getData());
          
          const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
            method: 'POST',
            body: {
              votes: [{ messageId: messages[0].id, choice: 1, votedAtClient: new Date().toISOString() }],
              idempotencyKey: `memory-test-${op.index}`,
            },
          });
          
          const { latency } = await measureLatency(() => voteBatchHandler(req, res));
          results.push({ type: 'vote', latency });
        } else {
          mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
          const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
            method: 'GET',
            query: { groupBy: 'message' },
          });
          
          const { latency } = await measureLatency(() => resultsHandler(req, res));
          results.push({ type: 'analytics', latency });
        }
      }
      
      const avgVoteLatency = results
        .filter(r => r.type === 'vote')
        .reduce((sum, r) => sum + r.latency, 0) / 5;
        
      const avgAnalyticsLatency = results
        .filter(r => r.type === 'analytics')
        .reduce((sum, r) => sum + r.latency, 0) / 5;
      
      console.log(`Memory pressure test:
        - Average vote latency: ${avgVoteLatency.toFixed(2)}ms
        - Average analytics latency: ${avgAnalyticsLatency.toFixed(2)}ms
      `);
      
      // Performance should not degrade significantly under memory pressure
      expect(avgVoteLatency).toBeLessThan(200);
      expect(avgAnalyticsLatency).toBeLessThan(150);
    });
  });

  describe('Database Query Optimization', () => {
    it('should minimize database calls for vote aggregation', async () => {
      mockGetSession.mockResolvedValue(null);
      
      let datastoreCallCount = 0;
      const originalPut = fixtures.datastore.put;
      const originalGet = fixtures.datastore.get;
      
      fixtures.datastore.put = jest.fn((...args) => {
        datastoreCallCount++;
        return originalPut.apply(fixtures.datastore, args);
      });
      
      fixtures.datastore.get = jest.fn((...args) => {
        datastoreCallCount++;
        return originalGet.apply(fixtures.datastore, args);
      });
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      // Reset call count after initial setup
      datastoreCallCount = 0;
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            { messageId: messages[0].id, choice: 1, votedAtClient: new Date().toISOString() },
            { messageId: messages[1].id, choice: 2, votedAtClient: new Date().toISOString() },
          ],
          idempotencyKey: 'db-optimization-test',
        },
      });
      
      await voteBatchHandler(req, res);
      
      console.log(`Database calls for 2-vote batch: ${datastoreCallCount}`);
      
      // Should minimize database calls (ideally batched operations)
      expect(datastoreCallCount).toBeLessThan(10); // Reasonable upper bound
      
      // Restore original methods
      fixtures.datastore.put = originalPut;
      fixtures.datastore.get = originalGet;
    });
  });
});