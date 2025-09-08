import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SuggestTopicModal from './SuggestTopicModal';
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

describe('SuggestTopicModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockToastFn = jest.fn(); // Initialize or re-initialize the mock function before each test
    jest.clearAllMocks();
    // Mock fetch to always return success for other tests, unless overridden
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/suggest-topic' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Topic submitted for review.' }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    });
  });

  it('renders the modal when isOpen is true', () => {
    render(<SuggestTopicModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Suggest a New Topic')).toBeInTheDocument();
    expect(screen.getByLabelText('Topic Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Problem Statement')).toBeInTheDocument();
    expect(screen.getByText('Submit Topic')).toBeInTheDocument();
  });

  it('does not render the modal when isOpen is false', () => {
    render(<SuggestTopicModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Suggest a New Topic')).not.toBeInTheDocument();
  });

  it('disables the submit button during submission', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 100))
    );

    render(<SuggestTopicModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText('Topic Title'), { target: { value: 'Test Title' } });
    fireEvent.change(screen.getByLabelText('Problem Statement'), { target: { value: 'Test Problem' } });
    
    const form = screen.getByTestId('suggest-topic-form');
    fireEvent.submit(form); // Use fireEvent.submit

    expect(screen.getByText('Submitting...')).toBeDisabled();
    await waitFor(() => expect(screen.getByText('Submit Topic')).not.toBeDisabled());
  });

  it('shows an error toast and does not close if inputs are empty on submit', async () => {
    render(<SuggestTopicModal isOpen={true} onClose={mockOnClose} />);
    
    // Inputs are empty by default
    const form = screen.getByTestId('suggest-topic-form');
    fireEvent.submit(form); // Use fireEvent.submit

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please fill in both the topic title and problem statement.',
      }));
    });
    expect(mockOnClose).not.toHaveBeenCalled(); // Modal should not close
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits the form successfully and closes the modal with a success toast', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Topic submitted for review.' }),
    });

    render(<SuggestTopicModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText('Topic Title'), { target: { value: 'New Topic' } });
    fireEvent.change(screen.getByLabelText('Problem Statement'), { target: { value: 'This is a new problem statement.' } });
    
    const form = screen.getByTestId('suggest-topic-form');
    fireEvent.submit(form); // Use fireEvent.submit

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/suggest-topic', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"title":"New Topic"') &&
              expect.stringContaining('"problemStatement":"This is a new problem statement."') &&
              expect.stringContaining('"region":"local"'),
      }));
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Topic Suggested!',
        description: 'Your topic has been submitted for review.',
      }));
      expect(mockOnClose).toHaveBeenCalledTimes(1); // Modal should close
    });
    // Check that fields are cleared after successful submission
    expect(screen.getByLabelText('Topic Title')).toHaveValue('');
    expect(screen.getByLabelText('Problem Statement')).toHaveValue('');
  });

  it('shows an error toast if the API call fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Failed to submit topic due to server error.' }),
      status: 500,
    });

    render(<SuggestTopicModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText('Topic Title'), { target: { value: 'Error Topic' } });
    fireEvent.change(screen.getByLabelText('Problem Statement'), { target: { value: 'This will cause an error.' } });
    
    const form = screen.getByTestId('suggest-topic-form');
    fireEvent.submit(form); // Use fireEvent.submit

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'Failed to submit topic due to server error.', // Expecting the message from API
      }));
    });
    expect(mockOnClose).not.toHaveBeenCalled(); // Modal should not close on error
  });

  it('simulates "prevents duplicate suggestion" by showing an error toast from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'A similar topic already exists.' }),
      status: 409, // Conflict status code
    });

    render(<SuggestTopicModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText('Topic Title'), { target: { value: 'Duplicate Topic' } });
    fireEvent.change(screen.getByLabelText('Problem Statement'), { target: { value: 'This topic is a duplicate.' } });
    
    const form = screen.getByTestId('suggest-topic-form');
    fireEvent.submit(form); // Use fireEvent.submit

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'A similar topic already exists.',
      }));
    });
    expect(mockOnClose).not.toHaveBeenCalled(); // Modal should not close on error
  });
});