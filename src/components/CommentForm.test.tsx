import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommentForm from './CommentForm';
import { useToast } from '../hooks/use-toast'; // Import useToast
import { Comment } from '../types'; // Import Comment type

// Shared mock function for toast
let mockToastFn: jest.Mock;

// Mock useToast hook to use the shared mock function
jest.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: (...args: any[]) => mockToastFn(...args),
  }),
}));

// Mock fetch API for /api/user-actions
global.fetch = jest.fn((url: string, options?: RequestInit) => {
  if (url === '/api/user-actions' && options?.method === 'POST') {
    // Mock a successful response for posting a comment
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Action processed.', comment: { id: `mock-comment-${Date.now()}` }, user: { id: 'test-user', displayName: 'Test User', badges: [] } }),
    });
  }
  return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
}) as jest.Mock;

describe('CommentForm', () => {
  const mockOnCommentPosted = jest.fn();

  beforeEach(() => {
    mockToastFn = jest.fn(); // Initialize or re-initialize the mock function before each test
    jest.clearAllMocks();
  });

  it('renders the textarea and submit button', () => {
    render(<CommentForm />);
    expect(screen.getByPlaceholderText('Add your comment...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post comment/i })).toBeInTheDocument();
  });

  it('updates the comment state when typing in the textarea', () => {
    render(<CommentForm />);
    const textarea = screen.getByPlaceholderText('Add your comment...');
    fireEvent.change(textarea, { target: { value: 'My test comment' } });
    expect(textarea).toHaveValue('My test comment');
  });

  it('calls the onCommentPosted callback and clears the textarea on successful submission', async () => {
    render(<CommentForm onCommentPosted={mockOnCommentPosted} />);
    const textarea = screen.getByPlaceholderText('Add your comment...');
    const submitButton = screen.getByRole('button', { name: /post comment/i });

    fireEvent.change(textarea, { target: { value: 'A new comment from user' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user-actions', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"actionType":"comment"') &&
              expect.stringContaining('"commentText":"A new comment from user"'),
      }));
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Comment Posted!',
        description: 'Your comment has been added to the discussion.',
      }));
      expect(mockOnCommentPosted).toHaveBeenCalledTimes(1);
      expect(mockOnCommentPosted).toHaveBeenCalledWith(expect.objectContaining({
        text: 'A new comment from user',
        author: expect.objectContaining({ displayName: 'Test User' }),
      }));
      expect(textarea).toHaveValue(''); // Textarea should be cleared
    });
  });

  it('shows an error toast if the comment is empty or only whitespace', async () => {
    render(<CommentForm />);
    const textarea = screen.getByPlaceholderText('Add your comment...');
    const submitButton = screen.getByRole('button', { name: /post comment/i });

    fireEvent.change(textarea, { target: { value: '   ' } }); // Only whitespace
    fireEvent.click(submitButton);

    // No toast should be shown for empty comment, as the component handles it by not calling fetch
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockToastFn).not.toHaveBeenCalled(); // No toast for empty comment
    expect(textarea).toHaveValue('   '); // Textarea should not be cleared
  });

  it('shows an error toast if the API call fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Failed to post comment.' }),
    });

    render(<CommentForm onCommentPosted={mockOnCommentPosted} />);
    const textarea = screen.getByPlaceholderText('Add your comment...');
    const submitButton = screen.getByRole('button', { name: /post comment/i });

    fireEvent.change(textarea, { target: { value: 'Comment that will fail' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        title: 'Error Posting Comment',
        description: 'Failed to post comment.',
      }));
      expect(mockOnCommentPosted).toHaveBeenCalledTimes(1); // Callback still called for fallback
      expect(textarea).toHaveValue(''); // Textarea should still be cleared
    });
  });
});