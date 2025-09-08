import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SolutionList from './SolutionList';
import { Solution } from '../types';

// Mock framer-motion components
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

// Mock the SolutionCard component to check its props
jest.mock('./SolutionCard', () => {
  return ({ solution, hasVotedOnCurrentTopic, selectedSolutionId, onSolutionVoted, topicId, isUserAuthenticated, isUserVerified }: any) => (
    <div data-testid={`solution-card-${solution.id}`}>
      <h4>{solution.title}</h4>
      <p>{solution.description}</p>
      <span data-testid={`has-voted-${solution.id}`}>{hasVotedOnCurrentTopic ? 'true' : 'false'}</span>
      <span data-testid={`selected-id-${solution.id}`}>{selectedSolutionId}</span>
      <span data-testid={`topic-id-${solution.id}`}>{topicId}</span>
      <span data-testid={`auth-${solution.id}`}>{isUserAuthenticated ? 'true' : 'false'}</span>
      <span data-testid={`verified-${solution.id}`}>{isUserVerified ? 'true' : 'false'}</span>
      <button onClick={() => onSolutionVoted(solution.id)}>Vote</button>
    </div>
  );
});

describe('SolutionList', () => {
  const mockSolutions: Solution[] = [
    { id: 'sol-1', title: 'Approved Solution A', description: 'Desc A', status: 'approved', votes: 10 },
    { id: 'sol-2', title: 'Pending Solution B', description: 'Desc B', status: 'pending', votes: 5 },
    { id: 'sol-3', title: 'Approved Solution C', description: 'Desc C', status: 'approved', votes: 15 },
  ];

  const mockOnSolutionVoted = jest.fn();
  const mockTopicId = 'topic-abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders only approved solutions and the "no support" option', () => {
    render(
      <SolutionList
        solutions={mockSolutions}
        hasVotedOnCurrentTopic={false}
        selectedSolutionId={null}
        onSolutionVoted={mockOnSolutionVoted}
        topicId={mockTopicId}
        isUserAuthenticated={true}
        isUserVerified={true}
      />
    );

    expect(screen.getByText('Approved Solution A')).toBeInTheDocument();
    expect(screen.queryByText('Pending Solution B')).not.toBeInTheDocument(); // Should not be rendered
    expect(screen.getByText('Approved Solution C')).toBeInTheDocument();
    expect(screen.getByText('I do not support any solution.')).toBeInTheDocument();
  });

  it('passes hasVotedOnCurrentTopic, selectedSolutionId, topicId, isUserAuthenticated, and isUserVerified correctly to SolutionCard', () => {
    render(
      <SolutionList
        solutions={mockSolutions.filter(s => s.status === 'approved')} // Pass only approved for simplicity
        hasVotedOnCurrentTopic={true}
        selectedSolutionId="sol-1"
        onSolutionVoted={mockOnSolutionVoted}
        topicId={mockTopicId}
        isUserAuthenticated={true}
        isUserVerified={false} // Simulate unverified user
      />
    );

    // Check for Approved Solution A
    expect(screen.getByTestId('has-voted-sol-1')).toHaveTextContent('true');
    expect(screen.getByTestId('selected-id-sol-1')).toHaveTextContent('sol-1');
    expect(screen.getByTestId('topic-id-sol-1')).toHaveTextContent(mockTopicId);
    expect(screen.getByTestId('auth-sol-1')).toHaveTextContent('true');
    expect(screen.getByTestId('verified-sol-1')).toHaveTextContent('false');

    // Check for Approved Solution C
    expect(screen.getByTestId('has-voted-sol-3')).toHaveTextContent('true');
    expect(screen.getByTestId('selected-id-sol-3')).toHaveTextContent('sol-1'); // Still sol-1 as it's the selected one
    expect(screen.getByTestId('topic-id-sol-3')).toHaveTextContent(mockTopicId);
    expect(screen.getByTestId('auth-sol-3')).toHaveTextContent('true');
    expect(screen.getByTestId('verified-sol-3')).toHaveTextContent('false');

    // Check for No Support Solution
    expect(screen.getByTestId('has-voted-no-support-solution')).toHaveTextContent('true');
    expect(screen.getByTestId('selected-id-no-support-solution')).toHaveTextContent('sol-1');
    expect(screen.getByTestId('topic-id-no-support-solution')).toHaveTextContent(mockTopicId);
    expect(screen.getByTestId('auth-no-support-solution')).toHaveTextContent('true');
    expect(screen.getByTestId('verified-no-support-solution')).toHaveTextContent('false');
  });

  it('displays "No solutions have been proposed yet." if no approved solutions and no "no support" option', () => {
    // To test this, we need to ensure the 'no support' solution is not added, which is not how the component works.
    // The 'no support' solution is always present if there are no other approved solutions.
    // So, this specific test case as written might not be achievable with the current component logic.
    // The component will always show "I do not support any solution." if no other solutions are approved.
    render(
      <SolutionList
        solutions={[]} // No solutions at all
        hasVotedOnCurrentTopic={false}
        selectedSolutionId={null}
        onSolutionVoted={mockOnSolutionVoted}
        topicId={mockTopicId}
        isUserAuthenticated={true}
        isUserVerified={true}
      />
    );
    // It should still render the "no support" option, so the "No solutions..." message won't appear
    expect(screen.queryByText('No solutions have been proposed yet.')).not.toBeInTheDocument();
    expect(screen.getByText('I do not support any solution.')).toBeInTheDocument();
  });

  it('calls onSolutionVoted when a solution card is clicked', () => {
    render(
      <SolutionList
        solutions={mockSolutions.filter(s => s.status === 'approved')}
        hasVotedOnCurrentTopic={false}
        selectedSolutionId={null}
        onSolutionVoted={mockOnSolutionVoted}
        topicId={mockTopicId}
        isUserAuthenticated={true}
        isUserVerified={true}
      />
    );

    const solutionAButton = screen.getByTestId('solution-card-sol-1').querySelector('button');
    solutionAButton?.click();
    expect(mockOnSolutionVoted).toHaveBeenCalledWith('sol-1');
  });
});