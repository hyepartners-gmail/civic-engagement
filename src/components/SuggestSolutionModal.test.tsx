import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SuggestSolutionModal from './SuggestSolutionModal';
import { useToast } from '../hooks/use-toast';

// Shared mock function for toast
let mockToastFn: jest.Mock;

// Mock useToast hook to use the shared mock function
jest.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: (...args: any[]) => mockToastFn(...args),
  }),
}));

// Mock fetch API
global.fetch = jest.fn();

describe('SuggestSolutionModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSolutionSuggested = jest.fn();
  const mockTopicId = 'topic-123';

  beforeEach(() => {
    mockToastFn = jest.fn(); // Initialize or re-initialize the mock function before each test
    jest.clearAllMocks();
    // Mock fetch to always return success for other tests, unless overridden
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/suggest-solution' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Solution submitted for review.' }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    });
  });

  it('renders the modal when isOpen is true', () => {
    render(<SuggestSolutionModal isOpen={true} onClose={mockOnClose} topicId={mockTopicId} onSolutionSuggested={mockOnSolutionSuggested} />);
    expect(screen.getByText('Suggest a Solution')).toBeInTheDocument();
    expect(screen.getByLabelText('Solution Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Solution Description')).toBeInTheDocument();
    expect(screen.getByText('Submit Solution')).toBeInTheDocument();
  });

  it('does not render the modal when isOpen is false', () => {
    render(<SuggestSolutionModal isOpen={false} onClose={mockOnClose} topicId={mockTopicId} onSolutionSuggested={mockOnSolutionSuggested} />);
    expect(screen.queryByText('Suggest a Solution')).not.toBeInTheDocument();
  });

  it('disables the submit button during submission', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 100))
    );

    render(<SuggestSolutionModal isOpen={true} onClose={mockOnClose} topicId={mockTopicId} onSolutionSuggested={mockOnSolutionSuggested} />);

    fireEvent.change(screen.getByLabelText('Solution Title'), { target: { value: 'Test Solution' } });
    fireEvent.change(screen.getByLabelText('Solution Description'), { target: { value: 'Test Description' } });
    
    fireEvent.click(screen.getByText('Submit Solution'));

    expect(screen.getByText('Submitting...')).toBeDisabled();
    await waitFor(() => expect(screen.getByText('Submit Solution')).not.toBeDisabled());
  });

  it('shows an error toast and does not close if inputs are empty on submit', async () => {
    render(<SuggestSolutionModal isOpen={true} onClose={mockOnClose} topicId={mockTopicId} onSolutionSuggested={mockOnSolutionSuggested} />);
    
    // Inputs are empty by default
    fireEvent.click(screen.getByText('Submit Solution'));

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please fill in both the solution title and description.',
      }));
    });
    expect(mockOnClose).not.toHaveBeenCalled(); // Modal should not close
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits the form successfully and closes the modal with a success toast', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Solution submitted for review.' }),
    });

    render(<SuggestSolutionModal isOpen={true} onClose={mockOnClose} topicId={mockTopicId} onSolutionSuggested={mockOnSolutionSuggested} />);

    fireEvent.change(screen.getByLabelText('Solution Title'), { target: { value: 'New Solution' } });
    fireEvent.change(screen.getByLabelText('Solution Description'), { target: { value: 'This is a new solution description.' } });
    
    fireEvent.click(screen.getByText('Submit Solution'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/suggest-solution', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(`"topicId":"${mockTopicId}"`) &&
              expect.stringContaining('"title":"New Solution"') &&
              expect.stringContaining('"description":"This is a new solution description."'),
      }));
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Solution Suggested!',
        description: 'Your solution has been submitted for review.',
      }));
      expect(mockOnClose).toHaveBeenCalledTimes(1); // Modal should close
      expect(mockOnSolutionSuggested).toHaveBeenCalledTimes(1); // Callback should be called
    });
    // Check that fields are cleared after successful submission
    expect(screen.getByLabelText('Solution Title')).toHaveValue('');
    expect(screen.getByLabelText('Solution Description')).toHaveValue('');
  });

  it('shows an error toast if the API call fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Failed to submit solution.' }),
      status: 500,
    });

    render(<SuggestSolutionModal isOpen={true} onClose={mockOnClose} topicId={mockTopicId} onSolutionSuggested={mockOnSolutionSuggested} />);

    fireEvent.change(screen.getByLabelText('Solution Title'), { target: { value: 'Error Solution' } });
    fireEvent.change(screen.getByLabelText('Solution Description'), { target: { value: 'This will cause an error.' } });
    
    fireEvent.click(screen.getByText('Submit Solution'));

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'Failed to submit solution.', // Expecting the message from API
      }));
    });
    expect(mockOnClose).not.toHaveBeenCalled(); // Modal should not close on error
    expect(mockOnSolutionSuggested).not.toHaveBeenCalled(); // Callback should not be called on error
  });
});