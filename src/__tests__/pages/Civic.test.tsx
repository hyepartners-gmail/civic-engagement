import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CivicPage from '../../pages/Civic';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock global fetch
global.fetch = jest.fn();

// Import mocked modules
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('CivicPage', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    isVerified: true,
    zipCode: '94105',
    city: 'San Francisco',
    state: 'CA',
    viewedCivicPage: false,
  };

  const mockCivicInfoResponse = {
    summary: {
      election: { id: '1', name: 'Mock Election', date: '2024-11-05' },
      polling: { location: '123 Main St, San Francisco, CA 94105', hours: '7:00 AM - 8:00 PM' },
      earlyVoteSites: [],
      dropOffLocations: [],
      contests: [
        {
          level: 'Federal',
          title: 'President of the United States',
          type: 'candidate',
          candidates: [
            { name: 'John Doe', party: 'Democratic' },
            { name: 'Jane Smith', party: 'Republican' }
          ]
        }
      ],
      officials: [
        { name: 'Election Office', phone: '555-1234', email: 'elections@sf.gov' }
      ]
    },
    raw: {}
  };

  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();

    mockUseSession.mockReturnValue({ data: null, status: 'loading' });
    mockUseRouter.mockReturnValue({ push: mockPush, query: {} });

    // Default mock for civic-info API
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/civic-info')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCivicInfoResponse),
        });
      }
      if (url.includes('/api/user-actions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Action recorded' }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    });
  });

  it('shows loading state initially', () => {
    render(<CivicPage />);
    expect(screen.getByText('Loading civic information...')).toBeInTheDocument();
  });

  it('redirects to /auth if user is not authenticated', async () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<CivicPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth');
    });
  });

  it('shows address form if user has no cached address or profile data', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { ...mockUser, zipCode: undefined, city: undefined, state: undefined } },
      status: 'authenticated',
    });
    localStorageMock.getItem.mockReturnValue(null);

    render(<CivicPage />);

    await waitFor(() => {
      expect(screen.getByText('Enter Your Address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Street Address')).toBeInTheDocument();
    });
  });

  it('fetches and displays civic data for an authenticated user with profile data', async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      status: 'authenticated',
    });

    render(<CivicPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/civic-info?address=San%20Francisco%2C%20CA%2094105')
      );
      expect(screen.getByText('Mock Election')).toBeInTheDocument();
    });
  });

  it('awards "Civic Explorer" badge on first visit', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { ...mockUser, viewedCivicPage: false } },
      status: 'authenticated',
    });

    render(<CivicPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user-actions', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ actionType: 'view_civic_page' }),
      }));
    });
  });

  it('does NOT award "Civic Explorer" badge on subsequent visits', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { ...mockUser, viewedCivicPage: true } },
      status: 'authenticated',
    });

    render(<CivicPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/civic-info?address=')
      );
    });
    expect(global.fetch).not.toHaveBeenCalledWith('/api/user-actions', expect.any(Object));
  });

  it('refreshes civic data when refresh button is clicked', async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      status: 'authenticated',
    });

    render(<CivicPage />);

    await waitFor(() => {
      expect(screen.getByText('Mock Election')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh civic info/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/civic-info\?address=.*&_t=\d+/)
      );
    });
  });

  it('displays error message if civic info fetch fails', async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      status: 'authenticated',
    });
    
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/civic-info')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Failed to get civic data' }),
        });
      }
      if (url.includes('/api/user-actions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Action recorded' }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    });

    render(<CivicPage />);

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Civic Information')).toBeInTheDocument();
      expect(screen.getByText('Failed to get civic data')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('navigates back to topics when "Back to Topics" button is clicked', async () => {
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      status: 'authenticated',
    });

    render(<CivicPage />);

    await waitFor(() => {
      expect(screen.getByText('Civic Information')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /back to topics/i }));
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});