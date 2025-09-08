import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Index from '../../pages/index';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Topic } from '@/types';

// Mock child components to simplify testing Index's logic
jest.mock('@/components/TopicCard', () => {
  return ({ topic, isDetailView, onShowVideo, ...props }: any) => (
    <div data-testid={`topic-card-${topic.id}-${isDetailView ? 'detail' : 'list'}`} onClick={isDetailView ? undefined : () => props.onClick?.()} className={isDetailView ? 'detail-view' : ''}>
      <h3>{topic.title}</h3>
      {isDetailView && topic.problemStatement && <p>{topic.problemStatement}</p>}
      {isDetailView && topic.videoUrl && (
        <button data-testid={`video-button-${topic.id}`} onClick={(e) => { e.stopPropagation(); onShowVideo(topic.videoUrl); }}>Adam's Opinion</button>
      )}
      {isDetailView && props.hasVotedOnCurrentTopic && <span data-testid="upvote-section">Upvote Section</span>}
    </div>
  );
});

jest.mock('@/components/SolutionList', () => {
  return ({ solutions, isInteractionBlocked, ...props }: any) => (
    <div data-testid="solution-list" className={isInteractionBlocked ? 'blocked' : ''}>
      <h4>Solutions</h4>
      {solutions.map((sol: any) => (
        <div key={sol.id} data-testid={`solution-${sol.id}`} onClick={() => props.onSolutionVoted(sol.id)}>
          {sol.title}
        </div>
      ))}
      {isInteractionBlocked && <span data-testid="solution-list-blocked">Blocked</span>}
    </div>
  );
});

jest.mock('@/components/DiscussionThread', () => {
  return ({ hasVotedOnCurrentTopic, isInteractionBlocked }: any) => (
    <div data-testid="discussion-thread" className={isInteractionBlocked ? 'blocked' : ''}>
      {hasVotedOnCurrentTopic ? 'Discussion Enabled' : 'Vote on a solution to unlock the discussion!'} {/* Updated text */}
      {isInteractionBlocked && <span data-testid="discussion-thread-blocked">Blocked</span>}
    </div>
  );
});

jest.mock('@/components/SuggestTopicModal', () => ({ isOpen, onClose }: any) => (
  isOpen ? <div data-testid="suggest-topic-modal">Suggest Topic Modal <button onClick={onClose}>Close</button></div> : null
));
jest.mock('@/components/SuggestSolutionModal', () => ({ isOpen, onClose }: any) => (
  isOpen ? <div data-testid="suggest-solution-modal">Suggest Solution Modal <button onClick={onClose}>Close</button></div> : null
));
jest.mock('@/components/AuthModal', () => ({ isOpen, onClose, onAuthSuccess }: any) => (
  isOpen ? <div data-testid="auth-modal">Auth Modal <button onClick={() => onAuthSuccess('test-user-id')}>Success</button><button onClick={onClose}>Close</button></div> : null
));
jest.mock('@/components/VideoPlayerOverlay', () => ({ isOpen, onClose, onVideoEnded, videoUrl }: any) => (
  isOpen ? (
    <div data-testid="video-overlay">
      Video: {videoUrl}
      <button onClick={onClose} data-testid="video-close-button">Close Video</button>
      <button onClick={onVideoEnded} data-testid="video-ended-button">Video Ended</button>
    </div>
  ) : null
));
jest.mock('@/components/SkipButton', () => ({ onClick }: any) => (
  <button data-testid="skip-button" onClick={onClick}>Skip Topic</button>
));
jest.mock('@/components/SuggestionButton', () => ({ onClick }: any) => (
  <button data-testid="suggest-solution-button" onClick={onClick}>Suggest Solution</button>
));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch API
global.fetch = jest.fn((url: string) => {
  if (url.includes('/api/topics')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        { id: 'topic-1', title: 'Topic 1', preview: 'P1', region: 'national', status: 'approved', solutions: [{ id: 'sol-1', title: 'Solution 1', description: 'D1', status: 'approved' }] },
        { id: 'topic-2', title: 'Topic 2 (Video)', preview: 'P2', region: 'national', status: 'approved', videoUrl: 'https://example.com/video.mp4', solutions: [{ id: 'sol-2', title: 'Solution 2', description: 'D2', status: 'approved' }] },
      ]),
    });
  }
  if (url.includes('/api/user-voted-topics')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]), // Default: user has not voted on anything
    });
  }
  if (url.includes('/api/upvote-solution')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Vote recorded' }),
    });
  }
  if (url.includes('/api/user-actions')) { // For skip_topic
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Action processed' }),
    });
  }
  return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
}) as jest.Mock;

// Mock getUserRegion
jest.mock('@/utils/regionUtils', () => ({
  getUserRegion: jest.fn(() => Promise.resolve('national')),
}));

describe('Index Page', () => {
  const mockUseSession = useSession as jest.Mock;
  const mockUseRouter = useRouter as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    mockUseRouter.mockReturnValue({ query: {}, push: jest.fn(), replace: jest.fn(), asPath: '/' });
  });

  it('renders topic cards in the default view', async () => {
    render(<Index />);
    await screen.findByText('Topic 1');
    await screen.findByText('Topic 2 (Video)');
    expect(screen.getByTestId('topic-card-topic-1-list')).toBeInTheDocument();
    expect(screen.getByTestId('topic-card-topic-2-list')).toBeInTheDocument();
  });

  it('opens detail view when a topic card is clicked', async () => {
    render(<Index />);
    await screen.findByText('Topic 1');

    fireEvent.click(screen.getByTestId('topic-card-topic-1-list')); // Click list item
    await screen.findByTestId('topic-card-topic-1-detail'); // Detail view should appear
    expect(screen.getByTestId('topic-card-topic-1-detail')).toHaveClass('detail-view');
    expect(screen.getByText('Solutions')).toBeInTheDocument();
    expect(screen.getByText('Vote on a solution to unlock the discussion!')).toBeInTheDocument(); // Updated assertion
  });

  it('closes detail view when close button is clicked', async () => {
    render(<Index />);
    await screen.findByText('Topic 1');

    fireEvent.click(screen.getByTestId('topic-card-topic-1-list'));
    await screen.findByTestId('topic-card-topic-1-detail');

    fireEvent.click(screen.getByLabelText('Close')); // Close button in the overlay
    await waitFor(() => {
      expect(screen.queryByTestId('topic-card-topic-1-detail')).not.toBeInTheDocument();
      expect(screen.queryByText('Solutions')).not.toBeInTheDocument();
    });
  });

  it('opens AuthModal if user is unauthenticated and tries to vote/skip/watch video', async () => {
    render(<Index />);
    await screen.findByText('Topic 1');

    fireEvent.click(screen.getByTestId('topic-card-topic-1-list')); // Open detail view
    await screen.findByTestId('solution-list');

    fireEvent.click(screen.getByTestId('solution-sol-1')); // Try to vote
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('auth-modal').querySelector('button')!); // Close auth modal

    fireEvent.click(screen.getByTestId('skip-button')); // Try to skip
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('auth-modal').querySelector('button')!); // Close auth modal

    fireEvent.click(screen.getByTestId('topic-card-topic-2-list')); // Open video topic detail
    await screen.findByTestId('video-button-topic-2');
    fireEvent.click(screen.getByTestId('video-button-topic-2')); // Try to watch video
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
  });

  it('blocks voting and discussion until user votes or watches video', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', isVerified: true, zipCode: '12345', politicalAlignment: 'Center' } },
      status: 'authenticated',
    });
    render(<Index />);
    await screen.findByText('Topic 1');

    fireEvent.click(screen.getByTestId('topic-card-topic-1-list')); // Open detail view
    await screen.findByTestId('solution-list');
    expect(screen.getByTestId('solution-list')).toHaveClass('blocked'); // Should be blocked initially
    expect(screen.getByText('Vote on a solution to unlock the discussion!')).toBeInTheDocument(); // Updated assertion
    expect(screen.getByTestId('discussion-thread')).toHaveClass('blocked');

    // Simulate voting
    fireEvent.click(screen.getByTestId('solution-sol-1'));
    await waitFor(() => {
      expect(screen.getByTestId('solution-list')).not.toHaveClass('blocked'); // Should be unblocked after vote
      expect(screen.getByTestId('discussion-thread')).toHaveTextContent('Discussion Enabled');
      expect(screen.getByTestId('discussion-thread')).not.toHaveClass('blocked');
    });
  });

  it('unblocks voting and discussion after watching Adam\'s video', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', isVerified: true, zipCode: '12345', politicalAlignment: 'Center' } },
      status: 'authenticated',
    });
    render(<Index />);
    await screen.findByText('Topic 2 (Video)');

    fireEvent.click(screen.getByTestId('topic-card-topic-2-list')); // Open detail view for video topic
    await screen.findByTestId('video-button-topic-2');
    expect(screen.getByTestId('solution-list')).toHaveClass('blocked'); // Initially blocked
    expect(screen.getByText('Vote on a solution to unlock the discussion!')).toBeInTheDocument(); // Updated assertion

    fireEvent.click(screen.getByTestId('video-button-topic-2')); // Open video overlay
    await screen.findByTestId('video-overlay');

    fireEvent.click(screen.getByTestId('video-ended-button')); // Simulate video ending
    await waitFor(() => expect(screen.queryByTestId('video-overlay')).not.toBeInTheDocument());

    // Verify voting and discussion are now unblocked
    expect(screen.getByTestId('solution-list')).not.toHaveClass('blocked');
    expect(screen.getByTestId('discussion-thread')).toHaveTextContent('Discussion Enabled');
    expect(screen.getByTestId('discussion-thread')).not.toHaveClass('blocked');
  });

  it('unblocks voting and discussion if video is minimized early', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', isVerified: true, zipCode: '12345', politicalAlignment: 'Center' } },
      status: 'authenticated',
    });
    render(<Index />);
    await screen.findByText('Topic 2 (Video)');

    fireEvent.click(screen.getByTestId('topic-card-topic-2-list')); // Open detail view for video topic
    await screen.findByTestId('video-button-topic-2');

    fireEvent.click(screen.getByTestId('video-button-topic-2')); // Open video overlay
    await screen.findByTestId('video-overlay');

    fireEvent.click(screen.getByTestId('video-close-button')); // Simulate minimizing video
    await waitFor(() => expect(screen.queryByTestId('video-overlay')).not.toBeInTheDocument());

    // Verify voting and discussion are now unblocked
    expect(screen.getByTestId('solution-list')).not.toHaveClass('blocked');
    expect(screen.getByTestId('discussion-thread')).toHaveTextContent('Discussion Enabled');
    expect(screen.getByTestId('discussion-thread')).not.toHaveClass('blocked');
  });

  it('shows post-vote actions after voting', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', isVerified: true, zipCode: '12345', politicalAlignment: 'Center' } },
      status: 'authenticated',
    });
    render(<Index />);
    await screen.findByText('Topic 1');

    fireEvent.click(screen.getByTestId('topic-card-topic-1-list')); // Open detail view
    await screen.findByTestId('solution-list');

    expect(screen.queryByText('Next Topic')).not.toBeInTheDocument(); // Not visible initially
    expect(screen.queryByText('Back to All Topics')).not.toBeInTheDocument(); // Not visible initially

    fireEvent.click(screen.getByTestId('solution-sol-1')); // Vote
    await screen.findByText('Next Topic');
    await screen.findByText('Back to All Topics');
    expect(global.fetch).toHaveBeenCalledWith('/api/upvote-solution', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"solutionId":"sol-1"') && expect.stringContaining('"topicId":"topic-1"'),
    }));
  });

  it('shows post-vote actions after skipping a topic', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', isVerified: true, zipCode: '12345', politicalAlignment: 'Center' } },
      status: 'authenticated',
    });
    render(<Index />);
    await screen.findByText('Topic 1');

    fireEvent.click(screen.getByTestId('topic-card-topic-1-list')); // Open detail view
    await screen.findByTestId('skip-button');

    expect(screen.queryByText('Next Topic')).not.toBeInTheDocument();
    expect(screen.queryByText('Back to All Topics')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('skip-button')); // Skip
    await screen.findByText('Next Topic');
    await screen.findByText('Back to All Topics');
    expect(global.fetch).toHaveBeenCalledWith('/api/user-actions', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"actionType":"skip_topic"') &&
            expect.stringContaining('"topicId":"topic-1"') &&
            expect.stringContaining('"solutionId":null'),
    }));
  });

  it('navigates to next topic when "Next Topic" button is clicked', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', isVerified: true, zipCode: '12345', politicalAlignment: 'Center' } },
      status: 'authenticated',
    });
    render(<Index />);
    await screen.findByText('Topic 1');

    fireEvent.click(screen.getByTestId('topic-card-topic-1-list')); // Open Topic 1
    await screen.findByTestId('solution-list');
    fireEvent.click(screen.getByTestId('solution-sol-1')); // Vote on Topic 1
    await screen.findByText('Next Topic');

    fireEvent.click(screen.getByText('Next Topic')); // Click next
    await screen.findByTestId('topic-card-topic-2-detail'); // Should now be Topic 2
    expect(screen.queryByTestId('topic-card-topic-1-detail')).not.toBeInTheDocument();
  });

  it('returns to all topics when "Back to All Topics" is clicked', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', isVerified: true, zipCode: '12345', politicalAlignment: 'Center' } },
      status: 'authenticated',
    });
    render(<Index />);
    await screen.findByText('Topic 1');

    fireEvent.click(screen.getByTestId('topic-card-topic-1-list')); // Open Topic 1
    await screen.findByTestId('solution-list');
    fireEvent.click(screen.getByTestId('solution-sol-1')); // Vote on Topic 1
    await screen.findByText('Back to All Topics');

    fireEvent.click(screen.getByText('Back to All Topics')); // Click back
    await waitFor(() => {
      expect(screen.queryByTestId('topic-card-topic-1-detail')).not.toBeInTheDocument();
      expect(screen.queryByText('Solutions')).not.toBeInTheDocument();
    });
  });
});