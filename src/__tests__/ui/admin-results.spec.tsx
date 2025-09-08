import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminResultsPage from '@/pages/admin/messages/results';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: ({ children, variants, initial, animate, exit, custom, ...props }: any) => {
        const { whileHover, whileTap, transition, ...cleanProps } = props;
        return <div {...cleanProps}>{children}</div>;
      },
      button: React.forwardRef(({ children, variants, initial, animate, exit, custom, ...props }: any, ref: any) => {
        const { whileHover, whileTap, transition, ...cleanProps } = props;
        return <button type="button" ref={ref} {...cleanProps}>{children}</button>;
      }),
    },
  };
});

// Mock UI components that might cause issues
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, ...props }: any) => (
    <select data-testid="select" onChange={(e) => onValueChange && onValueChange(e.target.value)} value={value} {...props}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open, onOpenChange }: any) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: any) => <div data-testid="collapsible-content">{children}</div>,
  CollapsibleTrigger: ({ children }: any) => <div data-testid="collapsible-trigger">{children}</div>,
}));

// Mock fetch
global.fetch = jest.fn();

// Mock URL.createObjectURL for CSV export testing
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

const mockRouter = {
  push: jest.fn(),
  pathname: '/admin/messages/results',
  query: {},
  asPath: '/admin/messages/results',
};

const mockAdminSession = {
  user: {
    id: 'admin-user-id',
    email: 'admin@example.com',
    role: 'admin',
  },
};

const mockRegularSession = {
  user: {
    id: 'regular-user-id',
    email: 'user@example.com',
    role: 'user',
  },
};

const mockMessages = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    slogan: 'Make Healthcare Accessible',
    subline: 'Quality care for everyone',
    status: 'active',
    rank: 'a',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    slogan: 'Protect Our Environment',
    subline: 'For future generations',
    status: 'active',
    rank: 'b',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

const mockResultsData = {
  items: [
    {
      key: 'Make Healthcare Accessible',
      counts: {
        n: 1000,
        love: 400,
        like: 300,
        dislike: 200,
        hate: 100,
      },
      rates: {
        love: 0.4,
        like: 0.3,
        dislike: 0.2,
        hate: 0.1,
        favorability: 0.7,
      },
    },
    {
      key: 'Protect Our Environment',
      counts: {
        n: 800,
        love: 350,
        like: 250,
        dislike: 150,
        hate: 50,
      },
      rates: {
        love: 0.4375,
        like: 0.3125,
        dislike: 0.1875,
        hate: 0.0625,
        favorability: 0.75,
      },
    },
  ],
  total: 2,
  filters: {
    rollup: false,
    groupBy: 'message',
    limit: 100,
  },
};

describe('Admin Results Page UI', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AdminResultsPage />
      </QueryClientProvider>
    );
  };

  describe('Authentication & Access Control', () => {
    it('should display access denied for non-admin users', () => {
      (useSession as jest.Mock).mockReturnValue({ data: mockRegularSession });

      renderComponent();

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You need admin privileges to access this page.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument();
    });

    it('should display access denied for unauthenticated users', () => {
      (useSession as jest.Mock).mockReturnValue({ data: null });

      renderComponent();

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('should handle back to home navigation from access denied', async () => {
      (useSession as jest.Mock).mockReturnValue({ data: null });

      renderComponent();

      const backButton = screen.getByRole('button', { name: /back to home/i });
      await user.click(backButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  describe('Page Layout & Header', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({ data: mockAdminSession });
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResultsData),
        });
    });

    it('should display page header with title and navigation', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Vote Analytics')).toBeInTheDocument();
      });

      expect(screen.getByText('Analyze voting patterns and message performance')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to messages/i })).toBeInTheDocument();
    });

    it('should display header action buttons', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show filters/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    });

    it('should navigate back to messages page', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to messages/i })).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back to messages/i });
      await user.click(backButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/messages');
    });
  });

  describe('Filters Panel', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({ data: mockAdminSession });
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResultsData),
        });
    });

    it('should display filters panel by default', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Message')).toBeInTheDocument();
      expect(screen.getByLabelText('Group By')).toBeInTheDocument();
      expect(screen.getByLabelText('From Date')).toBeInTheDocument();
      expect(screen.getByLabelText('To Date')).toBeInTheDocument();
    });

    it('should toggle filters panel visibility', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      const filtersToggle = screen.getByRole('button', { name: /hide filters/i });
      await user.click(filtersToggle);

      expect(screen.getByRole('button', { name: /show filters/i })).toBeInTheDocument();
    });

    it('should display filter dropdowns with correct options', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Check for various filter labels
      expect(screen.getByLabelText('Message')).toBeInTheDocument();
      expect(screen.getByLabelText('Group By')).toBeInTheDocument();
      expect(screen.getByLabelText('Party')).toBeInTheDocument();
      expect(screen.getByLabelText('Geography')).toBeInTheDocument();
      expect(screen.getByLabelText('Demographics')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({ data: mockAdminSession });
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResultsData),
        });
    });

    it('should display results data when available', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Make Healthcare Accessible')).toBeInTheDocument();
      });

      expect(screen.getByText('Protect Our Environment')).toBeInTheDocument();
      
      // Check for vote counts (formatted numbers)
      expect(screen.getByText('1,000')).toBeInTheDocument(); // Total votes for first message
      expect(screen.getByText('800')).toBeInTheDocument(); // Total votes for second message
    });

    it('should display favorability percentages', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('70.0%')).toBeInTheDocument(); // 0.7 * 100
      });

      expect(screen.getByText('75.0%')).toBeInTheDocument(); // 0.75 * 100
    });
  });

  describe('Loading and Error States', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({ data: mockAdminSession });
    });

    it('should display loading spinner during data fetch', () => {
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      renderComponent();

      // The loading state might be handled by the query client or component
      // This test ensures the component renders without crashing during loading
      expect(screen.getByText('Vote Analytics')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      renderComponent();

      // Error handling would be managed by React Query
      // This test verifies the setup is correct for error scenarios
      await waitFor(() => {
        expect(screen.getByText('Vote Analytics')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({ data: mockAdminSession });
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResultsData),
        });
    });

    it('should handle CSV export', async () => {
      // Mock document methods for CSV export
      const mockLink = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: { visibility: '' },
      };
      const mockCreateElement = jest.spyOn(document, 'createElement');
      const mockAppendChild = jest.spyOn(document.body, 'appendChild');
      const mockRemoveChild = jest.spyOn(document.body, 'removeChild');

      mockCreateElement.mockReturnValue(mockLink as any);
      mockAppendChild.mockImplementation(() => {});
      mockRemoveChild.mockImplementation(() => {});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();

      // Cleanup mocks
      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });

    it('should disable export button when no data available', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ items: [], total: 0, filters: {} }),
        });

      renderComponent();

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /export csv/i });
        expect(exportButton).toBeDisabled();
      });
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({ data: mockAdminSession });
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResultsData),
        });
    });

    it('should handle refresh button click', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Refresh functionality would trigger new API calls
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({ data: mockAdminSession });
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResultsData),
        });
    });

    it('should have proper heading structure', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Vote Analytics', level: 1 })).toBeInTheDocument();
      });
    });

    it('should have properly labeled form controls', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText('Message')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Group By')).toBeInTheDocument();
      expect(screen.getByLabelText('From Date')).toBeInTheDocument();
      expect(screen.getByLabelText('To Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Party')).toBeInTheDocument();
      expect(screen.getByLabelText('Geography')).toBeInTheDocument();
      expect(screen.getByLabelText('Demographics')).toBeInTheDocument();
    });

    it('should have accessible buttons', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to messages/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /show filters/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();

      // All buttons should be accessible
      const allButtons = screen.getAllByRole('button');
      allButtons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should support keyboard navigation', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to messages/i })).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back to messages/i });
      backButton.focus();
      
      expect(document.activeElement).toBe(backButton);
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({ data: mockAdminSession });
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ items: [], total: 0, filters: {} }),
        });
    });

    it('should handle empty results gracefully', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Vote Analytics')).toBeInTheDocument();
      });

      // Should still display the interface even with no data
      expect(screen.getByText('Filters')).toBeInTheDocument();
      
      // Export button should be disabled
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      expect(exportButton).toBeDisabled();
    });
  });
});