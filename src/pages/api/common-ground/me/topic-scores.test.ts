import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from './topic-scores';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { getServerSession } from 'next-auth';

// Mocks
jest.mock('next-auth');
const mockGetServerSession = getServerSession as jest.Mock;
jest.mock('@/lib/datastoreServer');
const mockDatastore = datastore as jest.Mocked<typeof datastore>;
const mockFromDatastore = fromDatastore as jest.Mock;

describe('/api/common-ground/me/topic-scores', () => {
  const mockScores = [
    { id: 'v1:topic-1', version: 'v1', topicId: 'topic-1', meanScore: 50, answeredCount: 2, updatedAt: '2023-01-01T00:00:00Z' },
    { id: 'v1:topic-2', version: 'v1', topicId: 'topic-2', meanScore: -25, answeredCount: 1, updatedAt: '2023-01-01T00:00:00Z' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
    
    const mockQuery = {
      hasAncestor: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
    };
    (mockDatastore.createQuery as jest.Mock).mockReturnValue(mockQuery);
    (mockDatastore.runQuery as jest.Mock).mockResolvedValue([mockScores]);
    mockFromDatastore.mockImplementation(entity => entity);
  });

  it('should return the user\'s topic scores', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { version: 'v1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = res._getJSONData();
    expect(responseData).toHaveLength(2);
    expect(responseData[0]).toEqual(expect.objectContaining({
      topicId: 'topic-1',
      meanScore: 50,
    }));
    expect(mockDatastore.createQuery).toHaveBeenCalledWith('TopicScoreUser');
  });

  it('should return 401 if not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { version: 'v1' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });
});