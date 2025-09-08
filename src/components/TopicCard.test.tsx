import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TopicCard from './TopicCard';
import { Topic } from '../types';

// Mock framer-motion components to avoid issues in test environment
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => <div className={className} onClick={onClick}>{children}</div>,
    h3: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    button: ({ children, className, onClick, disabled }: { children: React.ReactNode; className?: string; onClick?: () => void; disabled?: boolean }) => <button className={className} onClick={onClick} disabled={disabled}>{children}</button>,
  },
  LayoutGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the fetch API for the upvote action
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: 'Upvoted' }),
  })
) as jest.Mock;

describe('TopicCard', () => {
  const mockTopic: Topic = {
    id: 'topic-1',
    title: 'Test Topic Title',
    preview: 'This is a preview of the test topic.',
    region: 'national',
    problemStatement: 'This is the detailed problem statement for the test topic.',
    status: 'approved',
    upvotes: 100,
    solutions: [],
  };

  const mockTopicWithVideo: Topic = {
    ...mockTopic,
    id: 'topic-2',
    title: 'Video Topic',
    videoUrl: 'https://example.com/video.mp4',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the topic title in default view and does NOT render the preview', () => {
    render(<TopicCard topic={mockTopic} isUserAuthenticated={true} isUserVerified={true} />);
    expect(screen.getByText('Test Topic Title')).toBeInTheDocument();
    expect(screen.queryByText('This is a preview of the test topic.')).not.toBeInTheDocument(); // Preview should NOT be in default view
    expect(screen.queryByText('The Problem')).not.toBeInTheDocument(); // Not in detail view
  });

  it('renders the topic title, problem statement, and upvote button in detail view when user is authenticated and verified', () => {
    render(<TopicCard topic={mockTopic} isDetailView={true} isUserAuthenticated={true} isUserVerified={true} hasVotedOnCurrentTopic={true} />);
    expect(screen.getByText('Test Topic Title')).toBeInTheDocument();
    expect(screen.getByText('The Problem')).toBeInTheDocument();
    expect(screen.getByText('This is the detailed problem statement for the test topic.')).toBeInTheDocument();
    expect(screen.getByText('100 Upvotes')).toBeInTheDocument();
    const upvoteButton = screen.getByRole('button', { name: /upvotes/i });
    expect(upvoteButton).toBeInTheDocument();
    expect(upvoteButton).not.toBeDisabled();
  });

  it('disables the upvote button in detail view if user is not authenticated', () => {
    render(<TopicCard topic={mockTopic} isDetailView={true} isUserAuthenticated={false} isUserVerified={true} hasVotedOnCurrentTopic={true} />);
    const upvoteButton = screen.getByRole('button', { name: /upvotes/i });
    expect(upvoteButton).toBeDisabled();
    expect(upvoteButton).toHaveClass('opacity-50');
  });

  it('disables the upvote button in detail view if user is authenticated but not verified', () => {
    render(<TopicCard topic={mockTopic} isDetailView={true} isUserAuthenticated={true} isUserVerified={false} hasVotedOnCurrentTopic={true} />);
    const upvoteButton = screen.getByRole('button', { name: /upvotes/i });
    expect(upvoteButton).toBeDisabled();
    expect(upvoteButton).toHaveClass('opacity-50');
  });

  it('calls handleUpvote when upvote button is clicked and user is authorized', async () => {
    render(<TopicCard topic={mockTopic} isDetailView={true} isUserAuthenticated={true} isUserVerified={true} hasVotedOnCurrentTopic={true} />);
    const upvoteButton = screen.getByRole('button', { name: /upvotes/i });
    
    fireEvent.click(upvoteButton);

    expect(global.fetch).toHaveBeenCalledWith('/api/upvote-topic', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining(`"topicId":"${mockTopic.id}"`),
    }));
  });

  it('does NOT call handleUpvote when upvote button is clicked and user is not authorized', async () => {
    render(<TopicCard topic={mockTopic} isDetailView={true} isUserAuthenticated={false} isUserVerified={false} hasVotedOnCurrentTopic={true} />);
    const upvoteButton = screen.getByRole('button', { name: /upvotes/i });
    
    fireEvent.click(upvoteButton);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders "Adam\'s Opinion" button in detail view if videoUrl is present', () => {
    render(<TopicCard topic={mockTopicWithVideo} isDetailView={true} isUserAuthenticated={true} isUserVerified={true} />);
    expect(screen.getByRole('button', { name: /adam's opinion/i })).toBeInTheDocument();
  });

  it('does not render "Adam\'s Opinion" button if videoUrl is not present', () => {
    render(<TopicCard topic={mockTopic} isDetailView={true} isUserAuthenticated={true} isUserVerified={true} />);
    expect(screen.queryByRole('button', { name: /adam's opinion/i })).not.toBeInTheDocument();
  });

  it('calls onShowVideo with the correct URL when "Adam\'s Opinion" button is clicked', () => {
    const mockOnShowVideo = jest.fn();
    render(<TopicCard topic={mockTopicWithVideo} isDetailView={true} isUserAuthenticated={true} isUserVerified={true} onShowVideo={mockOnShowVideo} />);
    
    fireEvent.click(screen.getByRole('button', { name: /adam's opinion/i }));
    expect(mockOnShowVideo).toHaveBeenCalledTimes(1);
    expect(mockOnShowVideo).toHaveBeenCalledWith(mockTopicWithVideo.videoUrl);
  });

  it('does not show upvote button if not in detail view', () => {
    render(<TopicCard topic={mockTopic} isDetailView={false} isUserAuthenticated={true} isUserVerified={true} hasVotedOnCurrentTopic={true} />);
    expect(screen.queryByRole('button', { name: /upvotes/i })).not.toBeInTheDocument();
  });

  it('does not show upvote button if hasVotedOnCurrentTopic is false', () => {
    render(<TopicCard topic={mockTopic} isDetailView={true} isUserAuthenticated={true} isUserVerified={true} hasVotedOnCurrentTopic={false} />);
    expect(screen.queryByRole('button', { name: /upvotes/i })).not.toBeInTheDocument();
  });
});