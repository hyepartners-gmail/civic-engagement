import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from './index';
import { datastore } from '@/lib/datastoreServer';
import { getServerSession } from 'next-auth';

// Mock next-auth
jest.mock('next-auth');
const mockGetServerSession = getServerSession as jest.Mock;

// Mock datastore
jest.mock('@/lib/datastoreServer');
const mockDatastore = datastore as jest.Mocked<typeof datastore>;

describe('/api/common-ground/groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the transaction object
    const mockTransaction = {
      run: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
    };
    (mockDatastore.transaction as jest.Mock).mockReturnValue(mockTransaction);
    (mockDatastore.key as jest.Mock).mockImplementation((...args: any[]) => ({
      path: args.flat(),
      id: 'new-group-id', // Simulate ID generation
    }));
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { nickname: 'Test Group' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({ message: 'You must be logged in.' });
  });

  it('should create a group and a group member in a transaction', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-123', name: 'Test Owner' } });
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { nickname: 'My New Group', version: 'v1' },
    });

    await handler(req, res);

    const mockTransaction = (mockDatastore.transaction as jest.Mock).mock.results[0].value;
    expect(mockTransaction.run).toHaveBeenCalledTimes(1);
    expect(mockTransaction.save).toHaveBeenCalledTimes(2);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();

    expect(res._getStatusCode()).toBe(201);
    expect(res._getJSONData()).toHaveProperty('groupId');
    expect(res._getJSONData()).toHaveProperty('groupCode');
  });

  it('should roll back the transaction on failure', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
    const mockTransaction = (mockDatastore.transaction as jest.Mock).mock.results[0].value;
    (mockTransaction.commit as jest.Mock).mockRejectedValueOnce(new Error('Commit failed'));

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: { nickname: 'Failing Group' },
    });

    await handler(req, res);

    expect(mockTransaction.run).toHaveBeenCalledTimes(1);
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ message: 'Failed to create group.' });
  });
});