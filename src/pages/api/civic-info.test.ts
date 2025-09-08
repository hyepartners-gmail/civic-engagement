import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from './civic-info';
import { createHash } from 'crypto';

// Mock global fetch
global.fetch = jest.fn();

// Helper to create normalized cache key
const generateCacheKey = (address: string, electionId?: string): string => {
  const normalized = address.trim().toUpperCase().replace(/\s+/g, ' ');
  const keyString = `${normalized}${electionId || ''}`;
  return createHash('sha256').update(keyString).digest('hex');
};

describe('/api/civic-info - Comprehensive Test Suite', () => {
  const mockElectionsResponse = {
    elections: [
      { id: '2024-11-05', name: 'General Election 2024', electionDay: '2024-11-05' },
      { id: '2024-03-05', name: 'Primary Election 2024', electionDay: '2024-03-05' }
    ]
  };

  const mockVoterInfoResponse = {
    election: { id: '2024-11-05', name: 'General Election 2024', electionDay: '2024-11-05' },
    pollingLocations: [{ 
      address: { line1: '123 Main St', city: 'San Francisco', state: 'CA', zip: '94105' },
      pollingHours: '7:00 AM - 8:00 PM'
    }],
    earlyVoteSites: [],
    dropOffLocations: [],
    contests: [
      { 
        office: 'Mayor', 
        candidates: [
          { name: 'John Doe', party: 'Democratic' },
          { name: 'Jane Smith', party: 'Republican' }
        ]
      }
    ],
    state: [{
      electionAdministrationBody: {
        name: 'San Francisco Department of Elections',
        phone: '(415) 554-4375',
        email: 'elections@sfgov.org'
      }
    }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CIVIC_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_CIVIC_API_KEY;
  });

  describe('Unit Tests - Core Functions', () => {
    it('should generate consistent SHA-256 cache keys', () => {
      const address1 = '123 Main St, San Francisco, CA 94105';
      const address2 = '  123 main st, san francisco, ca 94105  '; // Different case/spacing
      
      const key1 = generateCacheKey(address1);
      const key2 = generateCacheKey(address2);
      
      expect(key1).toBe(key2); // Should normalize to same key
      expect(key1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA-256 hex
    });

    it('should include electionId in cache key', () => {
      const address = '123 Main St, San Francisco, CA 94105';
      const keyWithoutElection = generateCacheKey(address);
      const keyWithElection = generateCacheKey(address, '2024-11-05');
      
      expect(keyWithoutElection).not.toBe(keyWithElection);
    });
  });

  describe('API Contract Tests', () => {
    it('should return 200 with valid address and mock Google responses', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { address: '123 Main St, San Francisco, CA 94105' },
      });

      // Mock Google API responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockElectionsResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockVoterInfoResponse),
        });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('raw');
      expect(data.summary).toHaveProperty('election');
      expect(data.summary).toHaveProperty('polling');
      expect(data.summary).toHaveProperty('contests');
      expect(data.summary).toHaveProperty('officials');
    });

    it('should return 400 on missing address parameter', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {}, // No address
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('Invalid query parameters');
    });

    it('should return 405 for non-GET methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { address: '123 Main St' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should return 500 when API key is missing', async () => {
      delete process.env.GOOGLE_CIVIC_API_KEY;
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { address: '123 Main St, San Francisco, CA 94105' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('Google Civic API key is missing');
    });
  });

  describe('Caching Tests - Cache Hit vs Cache Miss Timing', () => {
    it('should serve from cache on second request (cache hit)', async () => {
      const address = '123 Main St, San Francisco, CA 94105';
      
      // First request - cache miss
      const { req: req1, res: res1 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { address },
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockElectionsResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockVoterInfoResponse),
        });

      const start1 = Date.now();
      await handler(req1, res1);
      const duration1 = Date.now() - start1;
      
      expect(res1._getStatusCode()).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Elections + VoterInfo

      // Second request - cache hit (should be much faster)
      jest.clearAllMocks();
      const { req: req2, res: res2 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { address },
      });

      const start2 = Date.now();
      await handler(req2, res2);
      const duration2 = Date.now() - start2;
      
      expect(res2._getStatusCode()).toBe(200);
      expect(global.fetch).not.toHaveBeenCalled(); // Should not call Google API
      expect(duration2).toBeLessThan(duration1); // Cache hit should be faster
      
      const data = JSON.parse(res2._getData());
      expect(data.summary.election.name).toBe('General Election 2024');
    });

    it('should bypass cache with different electionId', async () => {
      const address = '123 Main St, San Francisco, CA 94105';
      
      // First request
      const { req: req1, res: res1 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { address, electionId: '2024-11-05' },
      });

      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockElectionsResponse),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockVoterInfoResponse),
        });

      await handler(req1, res1);
      expect(global.fetch).toHaveBeenCalled();

      // Second request with different electionId
      jest.clearAllMocks();
      const { req: req2, res: res2 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { address, electionId: '2024-03-05' },
      });

      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockElectionsResponse),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockVoterInfoResponse),
        });

      await handler(req2, res2);
      expect(global.fetch).toHaveBeenCalled(); // Should call API again
    });
  });

  describe('Error Handling Tests', () => {
    it('should return 503 on Google API quota exceeded', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { address: '123 Main St, San Francisco, CA 94105' },
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockElectionsResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: () => Promise.resolve('{"error": {"message": "Quota exceeded"}}'),
        });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(503);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('API quota limits');
      expect(data.message).toContain('10 minutes');
    });

    it('should handle Google API 404 gracefully', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { address: 'Invalid Address' },
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockElectionsResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve('{"error": {"errors": [{"reason": "notFound"}]}}'),
        });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200); // Should still return 200 with empty data
      const data = JSON.parse(res._getData());
      expect(data.summary.election).toBeNull();
    });
  });

  describe('Response Mapping Tests - Raw to Summary', () => {
    it('should correctly map raw Google response to summary format', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { address: '123 Main St, San Francisco, CA 94105' },
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockElectionsResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockVoterInfoResponse),
        });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      
      // Check summary structure
      expect(data.summary.election).toEqual({
        id: '2024-11-05',
        name: 'General Election 2024',
        date: '2024-11-05',
        ocdDivisionId: undefined
      });

      expect(data.summary.polling).toEqual({
        location: '123 Main St, San Francisco, CA, 94105',
        hours: '7:00 AM - 8:00 PM',
        notes: undefined
      });

      expect(data.summary.contests).toHaveLength(1);
      expect(data.summary.contests[0]).toMatchObject({
        level: 'Local',
        title: 'Mayor',
        type: 'candidate',
        candidates: [
          { name: 'John Doe', party: 'Democratic' },
          { name: 'Jane Smith', party: 'Republican' }
        ]
      });

      expect(data.summary.officials).toHaveLength(1);
      expect(data.summary.officials[0]).toMatchObject({
        name: 'San Francisco Department of Elections',
        email: 'elections@sfgov.org'
      });

      // Check raw data is preserved
      expect(data.raw.voterInfo).toEqual(mockVoterInfoResponse);
      expect(data.raw.elections).toEqual(mockElectionsResponse.elections);
    });
  });
});