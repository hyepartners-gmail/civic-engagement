import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DiscussionThread from './DiscussionThread';
import { Comment } from '../types';
import { useToast } from '../hooks/use-toast'; // Import useToast to mock it

// Shared mock function for toast
let mockToastFn: jest.Mock;

// Mock child components to simplify testing DiscussionThread's logic
jest.mock('./PlatformCard', () => {
  return ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="platform-card" className={className}>{children}</div>
  );
});
jest.mock('./CommentItem', () => {
  return ({ comment }: { comment: Comment }) => (
    <div data-testid={`comment-item-${comment.id}`}>
      <p>{comment.text}</p>
      <span data-testid={`comment-author-${comment.id}`}>{comment.author.displayName}</span>
    </div>
  );
});
jest.mock('./CommentForm', () => {
  // Mock CommentForm to allow triggering its onCommentPosted callback
  let commentCounter = 0; // Simple counter for predictable IDs
  return ({ onCommentPosted }: { onCommentPosted?: (newComment: Comment) => void }) => (
    <form data-testid="comment-form" onSubmit={(e) => {
      e.preventDefault();
      // Use screen.getByTestId to get the textarea element from the DOM
      // This ensures we're getting the actual element that was rendered and interacted with by fireEvent.change
      const textarea = screen.getByTestId('comment-textarea') as HTMLTextAreaElement;
      const commentText = textarea.value; // Get value directly from the DOM element

      if (onCommentPosted) {
        commentCounter++;
        onCommentPosted({
          id: `new-comment-${commentCounter}`, // Changed to match the test's expected pattern
          text: commentText,
          author: { id: 'test-user', displayName: 'Test User', badges: [] },
          timestamp: new Date().toISOString(),
          parentId: null,
          flags: 0,
        });
      }
    }}>
      <textarea data-testid="comment-textarea" placeholder="Add your comment..." />
      <button type="submit" data-testid="post-comment-button">Post Comment</button>
    </form>
  );
});

// Mock useToast hook to use the shared mock function
jest.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: (...args: any[]) => mockToastFn(...args),
  }),
}));

// Mock fetch API for /api/comments AND /api/user-actions
global.fetch = jest.fn((url: string, options?: RequestInit) => {
  if (url === '/api/comments') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        { id: 'c1', text: 'Initial comment 1', author: { id: 'u1', displayName: 'User One', badges: [] }, timestamp: '2023-01-01T10:00:00Z', parentId: null, flags: 0 },
        { id: 'c2', text: 'Initial comment 2 (reply)', author: { id: 'u2', displayName: 'User Two', badges: [] }, timestamp: '2023-01-01T10:05:00Z', parentId: 'c1', flags: 0 },
        { id: 'c3', text: 'Initial comment 3', author: { id: 'u3', displayName: 'User Three', badges: [] }, timestamp: '2023-01-01T10:10:00Z', parentId: null, flags: 0 },
      ]),
    });
  } else if (url === '/api/user-actions' && options?.method === 'POST') {
    // Mock a successful response for posting a comment
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Action processed.', comment: { id: `mock-comment-${Date.now()}` } }),
    });
  }
  return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
}) as jest.Mock;

describe('DiscussionThread', () => {
  const mockTopicId = 'topic-123';

  beforeEach(() => {
    mockToastFn = jest.fn(); // Initialize or re-initialize the mock function before each test
    jest.clearAllMocks();
  });

  it('displays a message and hides discussion if hasVotedOnCurrentTopic is false', async () => {
    render(<DiscussionThread hasVotedOnCurrentTopic={false} topicId={mockTopicId} />);

    expect(screen.getByText('Vote on a solution to unlock the discussion!')).toBeInTheDocument();
    expect(screen.queryByText('Discussion')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comment-form')).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith('/api/comments'); // Should not fetch comments
  });

  it('displays discussion and fetches comments if hasVotedOnCurrentTopic is true', async () => {
    render(<DiscussionThread hasVotedOnCurrentTopic={true} topicId={mockTopicId} />);

    expect(screen.getByText('Loading discussion...')).toBeInTheDocument(); // Initial loading state

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/comments');
      expect(screen.getByText('Discussion')).toBeInTheDocument();
      expect(screen.getByTestId('comment-form')).toBeInTheDocument();
      expect(screen.getByText('Initial comment 1')).toBeInTheDocument();
      expect(screen.getByText('Initial comment 2 (reply)')).toBeInTheDocument(); // Replies are also rendered
      expect(screen.getByText('Initial comment 3')).toBeInTheDocument();
    });
    expect(screen.queryByText('Vote on a solution to unlock the discussion!')).not.toBeInTheDocument();
  });

  it('adds a new comment to the thread after posting', async () => {
    render(<DiscussionThread hasVotedOnCurrentTopic={true} topicId={mockTopicId} />);

    await waitFor(() => {
      expect(screen.getByText('Discussion')).toBeInTheDocument();
    });

    const commentTextarea = screen.getByTestId('comment-textarea');
    const postButton = screen.getByTestId('post-comment-button');

    fireEvent.change(commentTextarea, { target: { value: 'My actual new comment' } });
    fireEvent.click(postButton);

    await waitFor(() => {
      // Expect the new comment text to appear
      expect(screen.getByText('My actual new comment')).toBeInTheDocument();
      // Use the predictable ID for the author test ID
      expect(screen.getByTestId(/comment-author-new-comment-1/)).toHaveTextContent('Test User'); 
      // Verify existing comments are still there
      expect(screen.getByText('Initial comment 1')).toBeInTheDocument();
      expect(screen.getByText('Initial comment 3')).toBeInTheDocument();
    });
  });

  it('displays "No comments yet" if no comments are fetched', async () => {
    // Mock fetch to return an empty array for /api/comments
    (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
      if (url === '/api/comments') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      // Ensure other mocks are still available
      return jest.requireActual('../../../node_modules/next/dist/compiled/jest-fetch').fetch(url);
    });

    render(<DiscussionThread hasVotedOnCurrentTopic={true} topicId={mockTopicId} />);

    await waitFor(() => {
      expect(screen.getByText('No comments yet. Be the first to share your thoughts!')).toBeInTheDocument();
    });
    expect(screen.queryByText('Initial comment 1')).not.toBeInTheDocument();
  });

  it('displays an error message if fetching comments fails', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
      if (url === '/api/comments') {
        return Promise.reject(new Error('Network error'));
      }
      // Ensure other mocks are still available
      return jest.requireActual('../../../node_modules/next/dist/compiled/jest-fetch').fetch(url);
    });

    render(<DiscussionThread hasVotedOnCurrentTopic={true} topicId={mockTopicId} />);

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
    expect(screen.queryByText('Discussion')).not.toBeInTheDocument();
  });
});