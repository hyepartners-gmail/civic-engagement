import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AmendmentsPage from '../../pages/amendments';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock the toast hook
jest.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('AmendmentsPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      query: {},
      pathname: '/amendments',
    } as any);

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow admin access without voting on all topics', async () => {
    // Mock admin session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'admin-user-id',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    // Mock API responses
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', status: 'approved', title: 'Topic 1' },
          { id: '2', status: 'approved', title: 'Topic 2' },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [], // User hasn't voted on any topics
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'amendment-1',
            status: 'approved',
            changeType: 'amendment',
            amendmentNumber: 1,
            title: 'Test Amendment',
            amendmentText: 'This is a test amendment',
          },
        ],
      });

    render(<AmendmentsPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading amendments...')).not.toBeInTheDocument();
    });

    // Should show the amendments page content, not access denied
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    expect(screen.getByText('Proposed Amendments')).toBeInTheDocument();
  });

  it('should show access denied for non-admin user who hasnt voted on all topics', async () => {
    // Mock regular user session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'regular-user-id',
          role: 'user',
        },
      },
      status: 'authenticated',
    });

    // Mock API responses - user hasn't voted on all topics
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', status: 'approved', title: 'Topic 1' },
          { id: '2', status: 'approved', title: 'Topic 2' },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', title: 'Topic 1' }, // Only voted on 1 out of 2 topics
        ],
      });

    render(<AmendmentsPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading amendments...')).not.toBeInTheDocument();
    });

    // Should show access denied
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/You must vote on all available topics to unlock the Constitutional Convention/)).toBeInTheDocument();
    expect(screen.getByText('Return to Voting')).toBeInTheDocument();
  });

  it('should allow regular user access when they have voted on all topics', async () => {
    // Mock regular user session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'regular-user-id',
          role: 'user',
        },
      },
      status: 'authenticated',
    });

    // Mock API responses - user has voted on all topics
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', status: 'approved', title: 'Topic 1' },
          { id: '2', status: 'approved', title: 'Topic 2' },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', title: 'Topic 1' },
          { id: '2', title: 'Topic 2' }, // Voted on all topics
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'amendment-1',
            status: 'approved',
            changeType: 'amendment',
            amendmentNumber: 1,
            title: 'Test Amendment',
            amendmentText: 'This is a test amendment',
          },
        ],
      });

    render(<AmendmentsPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading amendments...')).not.toBeInTheDocument();
    });

    // Should show the amendments page content, not access denied
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    expect(screen.getByText('Proposed Amendments')).toBeInTheDocument();
  });
});