import React from 'react';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import MessagesPage from '@/pages/messages';
import { useVoteBuffer } from '@/hooks/useVoteBuffer';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock the vote buffer hook
jest.mock('@/hooks/useVoteBuffer', () => ({
  useVoteBuffer: jest.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, variants, initial, animate, exit, custom, ...props }: any, ref: any) => {
      // Strip out framer-motion specific props
      const { whileHover, whileTap, transition, ...cleanProps } = props;
      return <div ref={ref} {...cleanProps}>{children}</div>;
    }),
    button: React.forwardRef(({ children, variants, initial, animate, exit, custom, ...props }: any, ref: any) => {
      // Strip out framer-motion specific props  
      const { whileHover, whileTap, transition, ...cleanProps } = props;
      return <button ref={ref} type="button" {...cleanProps}>{children}</button>;
    }),
    h1: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { whileHover, whileTap, transition, variants, initial, animate, exit, custom, ...cleanProps } = props;
      return <h1 ref={ref} {...cleanProps}>{children}</h1>;
    }),
    p: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { whileHover, whileTap, transition, variants, initial, animate, exit, custom, ...cleanProps } = props;
      return <p ref={ref} {...cleanProps}>{children}</p>;
    }),
    span: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { whileHover, whileTap, transition, variants, initial, animate, exit, custom, ...cleanProps } = props;
      return <span ref={ref} {...cleanProps}>{children}</span>;
    }),
    form: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { whileHover, whileTap, transition, variants, initial, animate, exit, custom, ...cleanProps } = props;
      return <form ref={ref} {...cleanProps}>{children}</form>;
    }),
    select: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { whileHover, whileTap, transition, variants, initial, animate, exit, custom, ...cleanProps } = props;
      return <select ref={ref} {...cleanProps}>{children}</select>;
    }),
  },
  AnimatePresence: ({ children }: any) => children,
  Reorder: {
    Group: ({ children, values, onReorder, ...props }: any) => {
      return <div {...props}>{children}</div>;
    },
    Item: ({ children, value, ...props }: any) => {
      return <div {...props}>{children}</div>;
    },
  },
  Variants: {} as any,
}));

// Mock fetch
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  pathname: '/messages',
  query: {},
  asPath: '/messages',
};

const mockUseVoteBuffer = {
  addVote: jest.fn(),
  stats: {
    pendingCount: 0,
    isOnline: true,
  },
};

describe('Messages Page UI', () => {
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
    (useVoteBuffer as jest.Mock).mockReturnValue(mockUseVoteBuffer);
    
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MessagesPage />
      </QueryClientProvider>
    );
  };

  const mockMessages = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      slogan: 'Make Healthcare Accessible',
      subline: 'Quality care for everyone',
      status: 'active',
      rank: 'a',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      slogan: 'Protect Our Environment',
      subline: 'For future generations',
      status: 'active',
      rank: 'b',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe('Loading State', () => {
    it('should display loading spinner while fetching messages', () => {
      // Mock pending fetch
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      renderComponent();

      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Messages')).toBeInTheDocument();
      });

      expect(screen.getByText('We couldn\'t load the messages. Please try again.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should retry fetch when try again button is clicked', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Error Loading Messages')).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText('Make Healthcare Accessible')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no messages available', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No Messages Available')).toBeInTheDocument();
      });

      expect(screen.getByText('There are no active messages to vote on right now.')).toBeInTheDocument();
    });
  });

  describe('Main Voting Interface', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      });
    });

    it('should display the first message with slogan and subline', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Make Healthcare Accessible')).toBeInTheDocument();
      });

      expect(screen.getByText('Quality care for everyone')).toBeInTheDocument();
    });

    it('should display progress information', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument();
      });

      expect(screen.getByText('Progress')).toBeInTheDocument();
    });

    it('should display all four vote options with correct labels', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Love')).toBeInTheDocument();
      });

      expect(screen.getByText('Like')).toBeInTheDocument();
      expect(screen.getByText('Dislike')).toBeInTheDocument();
      expect(screen.getByText('Hate')).toBeInTheDocument();
    });

    it('should show keyboard shortcuts on vote buttons', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Press 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Press 2')).toBeInTheDocument();
      expect(screen.getByText('Press 3')).toBeInTheDocument();
      expect(screen.getByText('Press 4')).toBeInTheDocument();
    });
  });

  describe('Voting Interactions', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      });
    });

    it('should handle vote button clicks', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Make Healthcare Accessible')).toBeInTheDocument();
      });

      const loveButton = screen.getByRole('button', { name: /love/i });
      await user.click(loveButton);

      // Should add vote to buffer
      expect(mockUseVoteBuffer.addVote).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        1
      );

      // Should move to next message
      await waitFor(() => {
        expect(screen.getByText('Protect Our Environment')).toBeInTheDocument();
      });
    });

    it('should handle keyboard voting (1-4 keys)', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Make Healthcare Accessible')).toBeInTheDocument();
      });

      // Press '2' key for 'like'
      fireEvent.keyDown(window, { key: '2' });

      expect(mockUseVoteBuffer.addVote).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        2
      );

      // Should move to next message
      await waitFor(() => {
        expect(screen.getByText('Protect Our Environment')).toBeInTheDocument();
      });
    });

    it('should ignore invalid keyboard inputs', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Make Healthcare Accessible')).toBeInTheDocument();
      });

      // Press invalid keys
      fireEvent.keyDown(window, { key: '5' });
      fireEvent.keyDown(window, { key: 'a' });
      fireEvent.keyDown(window, { key: 'Space' });

      expect(mockUseVoteBuffer.addVote).not.toHaveBeenCalled();
      
      // Should still be on first message
      expect(screen.getByText('Make Healthcare Accessible')).toBeInTheDocument();
    });
  });

  describe('Stats Panel', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      });
    });

    it('should toggle stats panel when stats button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stats/i })).toBeInTheDocument();
      });

      // Stats panel should not be visible initially
      expect(screen.queryByText('Pending votes:')).not.toBeInTheDocument();

      // Click stats button
      const statsButton = screen.getByRole('button', { name: /stats/i });
      await user.click(statsButton);

      // Stats panel should now be visible
      expect(screen.getByText('Pending votes:')).toBeInTheDocument();
      expect(screen.getByText('Connection:')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      });
    });

    it('should have proper heading structure', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Political Messages', level: 1 })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Make Healthcare Accessible', level: 2 })).toBeInTheDocument();
      });
    });

    it('should have accessible vote buttons with proper labels and roles', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Love')).toBeInTheDocument();
      });

      // Find vote buttons by their exact text content
      const voteButtonTexts = ['Love', 'Like', 'Dislike', 'Hate'];
      const voteButtons = voteButtonTexts.map(text => 
        screen.getByText(text).closest('button')
      ).filter(Boolean);
      
      expect(voteButtons).toHaveLength(4);
      
      voteButtons.forEach(button => {
        expect(button).toBeEnabled();
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should support keyboard navigation', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Make Healthcare Accessible')).toBeInTheDocument();
      });

      // Find love button by text
      const loveButton = screen.getByText('Love').closest('button') as HTMLButtonElement;
      loveButton.focus();
      
      expect(document.activeElement).toBe(loveButton);
      
      // Test button activation via click (simulating keyboard activation)
      await user.click(loveButton);
      
      expect(mockUseVoteBuffer.addVote).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        1
      );
    });

    it('should have descriptive text for progress bar', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Progress')).toBeInTheDocument();
        expect(screen.getByText('1 of 2')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing subline gracefully', async () => {
      const messagesWithoutSubline = [
        {
          ...mockMessages[0],
          subline: undefined,
        },
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(messagesWithoutSubline),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Make Healthcare Accessible')).toBeInTheDocument();
      });

      // Should not display subline
      expect(screen.queryByText('Quality care for everyone')).not.toBeInTheDocument();
    });
  });
});