import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BadgeDisplay from './BadgeDisplay';
import { Badge } from '../types';

// Mock LucideIcons to prevent actual icon rendering issues in tests
jest.mock('lucide-react', () => ({
  MessageSquare: () => <svg data-testid="icon-MessageSquare" />,
  Award: () => <svg data-testid="icon-Award" />,
  // Add other icons as needed for your tests
}));

// REMOVED: Mock OnboardingTooltip. BadgeDisplay does not directly render OnboardingTooltip.
// It is a child of OnboardingTooltip in other components.

describe('BadgeDisplay', () => {
  it('renders the badge name and icon when provided', () => {
    const mockBadge: Badge = {
      id: 'badge-1',
      name: 'Test Badge',
      description: 'A badge for testing',
      icon: 'MessageSquare',
    };
    render(<BadgeDisplay badge={mockBadge} />);

    expect(screen.getByText('Test Badge')).toBeInTheDocument();
    expect(screen.getByTestId('icon-MessageSquare')).toBeInTheDocument();
    // REMOVED: expect(screen.getByTestId('mock-onboarding-tooltip')).toBeInTheDocument();
    // REMOVED: expect(screen.getByTestId('tooltip-content')).toHaveTextContent("This is the 'Test Badge' badge, awarded for: A badge for testing");
  });

  it('renders only the badge name when no icon is provided', () => {
    const mockBadge: Badge = {
      id: 'badge-2',
      name: 'No Icon Badge',
      description: 'Another badge for testing',
    };
    render(<BadgeDisplay badge={mockBadge} />);

    expect(screen.getByText('No Icon Badge')).toBeInTheDocument();
    expect(screen.queryByTestId(/icon-/)).not.toBeInTheDocument(); // No icon should be present
    // REMOVED: expect(screen.getByTestId('mock-onboarding-tooltip')).toBeInTheDocument();
    // REMOVED: expect(screen.getByTestId('tooltip-content')).toHaveTextContent("This is the 'No Icon Badge' badge, awarded for: Another badge for testing");
  });

  it('applies correct styling classes', () => {
    const mockBadge: Badge = {
      id: 'badge-3',
      name: 'Styled Badge',
      description: 'A styled badge',
      icon: 'Award',
    };
    const { container } = render(<BadgeDisplay badge={mockBadge} />);
    const badgeElement = container.querySelector('.bg-platform-accent\\/20'); // Check for a specific class
    expect(badgeElement).toBeInTheDocument();
    expect(badgeElement).toHaveClass('text-platform-text');
    expect(badgeElement).toHaveClass('border-platform-accent/50');
  });
});