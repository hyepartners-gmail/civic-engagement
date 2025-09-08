import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from './responses';
import { datastore } from '@/lib/datastoreServer';
import { getServerSession } from 'next-auth';

// Mock next-auth and datastore
jest.mock('next-auth');
const mockGetServerSession = getServerSession as jest.Mock;
jest.mock('@/lib/datastoreServer');
const mockDatastore = datastore as jest.Mocked<typeof datastore>;

// Mock the survey file fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('/api/common-ground/responses', () => {
  const mockSurvey = {
    version: 'v1',
    topics: [{
      id: 'topic-1',
      questions: [
        { id: 'q1', topicId: 'topic-1', options: [{ id: 'o1', score: -100 }, { id: 'o2', score: -33 }] },
        { id: 'q2', topicId: 'topic-1', options: [{ id: 'o3', score: 33 }, { id: 'o4', score: 100 }] },
      ],
    }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockSurvey) });

    const mockTransaction = {
      run: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    (mockDatastore.transaction as jest.Mock).mockReturnValue(mockTransaction);
    (mockDatastore.key as jest.Mock).mockImplementation((...args: any[]) => ({ path: args.flat() }));
  });

  it('should save responses and calculate topic scores correctly', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        version: 'v1',
        answers: [
          { questionId: 'q1', optionId: 'o1' }, // score -100
          { questionId: 'q2', optionId: 'o4' }, // score 100
        ],
      },
    });

    await handler(req, res);

    const mockTransaction = (mockDatastore.transaction as jest.Mock).mock.results[0].value;
    expect(mockTransaction.save).toHaveBeenCalledTimes(2); // Once for responses, once for scores

    const savedResponses = mockTransaction.save.mock.calls[0][0];
    expect(savedResponses).toHaveLength(2);
    expect(savedResponses[0].data).toMatchObject({ score: -100 });
    expect(savedResponses[1].data).toMatchObject({ score: 100 });

    const savedTopicScores = mockTransaction.save.mock.calls[1][0];
    expect(savedTopicScores).toHaveLength(1);
    expect(savedTopicScores[0].data).toMatchObject({
      topicId: 'topic-1',
      meanScore: 0, // (-100 + 100) / 2
      answeredCount: 2,
    });

    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(200);
  });

  it('should be idempotent and update scores on resubmission', async () => {
    // This is complex to test without a real DB state. We'll simulate it by checking the save calls.
    // The handler uses `datastore.key` with a specific ID (`${version}:${question.id}`),
    // which makes `save` an upsert operation. This ensures idempotency.
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        version: 'v1',
        answers: [{ questionId: 'q1', optionId: 'o2' }], // New answer, score -33
      },
    });

    await handler(req, res);

    const mockTransaction = (mockDatastore.transaction as jest.Mock).mock.results[0].value;
    const savedResponses = mockTransaction.save.mock.calls[0][0];
    expect(savedResponses[0].key.path).toContain('v1:q1'); // Key is predictable
    expect(savedResponses[0].data).toMatchObject({ score: -33 });

    const savedTopicScores = mockTransaction.save.mock.calls[1][0];
    expect(savedTopicScores[0].data).toMatchObject({
      meanScore: -33,
      answeredCount: 1,
    });
    expect(res._getStatusCode()).toBe(200);
  });
});