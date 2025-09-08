import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils'; // Added this import
import '@testing-library/jest-dom';
import AuthModal from '@/components/AuthModal';
import { signIn } from 'next-auth/react';
import { isValidEmail, isValidPassword, isValidZipCode } from '@/utils/validation';
import { useToast } from '@/hooks/use-toast';

// Shared mock function for toast
let mockToastFn: jest.Mock;

// Get a reference to the mock for useSession
const mockUseSession = jest.fn();

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: () => mockUseSession(), // This will now call the mockUseSession function
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    asPath: '/',
  }),
}));

// Mock useToast hook to use the shared mock function
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: (...args: any[]) => mockToastFn(...args),
  }),
}));

// Mock validation utilities
jest.mock('@/utils/validation', () => ({
  isValidEmail: jest.fn(),
  isValidPassword: jest.fn(),
  isValidZipCode: jest.fn(),
}));


describe('AuthModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockToastFn = jest.fn();
    jest.clearAllMocks();
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPassword as jest.Mock).mockReturnValue(true);
    (isValidZipCode as jest.Mock).mockReturnValue(true);
    
    // Reset mockUseSession for each test to its initial unauthenticated state
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
  });

  it('renders the modal title and description for sign-in when open', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument(); // Default to Sign Up
    expect(screen.getByText('Create your account to join the discussion.')).toBeInTheDocument(); // Default to Sign Up
  });

  it('does not render the modal content when closed', () => {
    render(<AuthModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByRole('heading', { name: 'Sign Up' })).not.toBeInTheDocument();
  });

  it('renders Google sign-up button', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
  });

  it('calls signIn with "google" and redirect:false when Google button is clicked (for sign-in flow)', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: /already have an account\? sign in/i })); // Switch to sign-in
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(signIn).toHaveBeenCalledWith('google', expect.objectContaining({ redirect: false }));
  });

  it('renders email and password input fields for sign-up', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/zip code/i)).not.toBeInTheDocument(); // Not in step 1
  });

  it('allows typing into email and password fields', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123!' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123!');
  });

  it('displays error message on failed credentials sign-in', async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({ error: 'Invalid credentials' });
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (isValidPassword as jest.Mock).mockReturnValue(true);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: /already have an account\? sign in/i })); // Switch to sign-in
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Wrongpass1!' } });
    fireEvent.submit(screen.getByTestId('auth-form'));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
    expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      title: 'Sign In Error',
      description: 'Invalid email or password.',
    }));
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes modal on successful credentials sign-in if user profile is complete', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: /already have an account\? sign in/i })); // Switch to sign-in
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@civic.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'ValidPass1!' } });

    (signIn as jest.Mock).mockImplementationOnce(() => {
      mockUseSession.mockReturnValueOnce({
        data: {
          user: {
            id: 'user-id-complete',
            email: 'user@civic.com',
            zipCode: '12345',
            politicalAlignment: 'Center',
            isVerified: true,
          },
        },
        status: 'authenticated',
      });
      return Promise.resolve({ error: null });
    });

    fireEvent.submit(screen.getByTestId('auth-form'));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('Invalid email or password.')).not.toBeInTheDocument();
    expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Welcome Back!',
      description: 'You are successfully signed in.',
    }));
  });

  it('switches to sign up form when "Sign Up" button is clicked', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    // It defaults to sign up, so no click needed to switch TO sign up.
    // We'll test switching from sign in to sign up.
    fireEvent.click(screen.getByRole('button', { name: /already have an account\? sign in/i })); // Switch to sign-in first
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i })); // Switch back to sign-up
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument());
  });

  it('switches back to sign in form when "Sign In" button is clicked in sign up mode', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />); // Defaults to sign up
    fireEvent.click(screen.getByRole('button', { name: /already have an account\? sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/zip code/i)).not.toBeInTheDocument();
  });

  it('moves to onboarding step and requires zip code for sign up if profile incomplete after successful sign-in', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // 2. Simulate sign-in attempt
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } });

    // Mock signIn to resolve successfully and update session data
    (signIn as jest.Mock).mockImplementationOnce(() => {
      mockUseSession.mockReturnValueOnce({
        data: {
          user: {
            id: 'user-id-incomplete',
            email: 'newuser@example.com',
            isVerified: true, // Assume verified for this part of the flow
            // Missing zipCode and politicalAlignment
          },
        },
        status: 'authenticated',
      });
      return Promise.resolve({ error: null });
    });

    fireEvent.submit(screen.getByTestId('auth-form'));

    // 3. Wait for the UI to reflect the transition to onboarding
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Complete Your Profile' })).toBeInTheDocument();
      expect(screen.getByLabelText(/create a username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/how do you feel politically\?/i)).toBeInTheDocument();
    });

    // Now, try to submit onboarding form
    fireEvent.change(screen.getByLabelText(/create a username/i), { target: { value: 'NewUser' } });
    fireEvent.change(screen.getByLabelText(/zip code/i), { target: { value: '90210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Left' })); // Select political alignment
    fireEvent.click(screen.getByRole('combobox', { name: /select your specific preference/i })); // Open select
    fireEvent.click(screen.getByText('Liberal')); // Select specific party

    (isValidZipCode as jest.Mock).mockReturnValue(true); // Ensure zip code is valid for submission

    // Mock fetch for user-onboarding API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'User profile updated successfully.' }),
      })
    ) as jest.Mock;

    // After submitting onboarding, the session should become fully complete.
    // We need to mock useSession again for this final state.
    (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
      if (url === '/api/user-onboarding') {
        mockUseSession.mockReturnValueOnce({
          data: {
            user: {
              id: 'user-id-incomplete',
              email: 'newuser@example.com',
              isVerified: true,
              zipCode: '90210',
              politicalAlignment: 'Left',
              partyPreference: 'Liberal',
            },
          },
          status: 'authenticated',
        });
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'User profile updated successfully.' }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    });


    fireEvent.submit(screen.getByTestId('onboarding-form'));

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Profile Complete!',
        description: 'Welcome to the platform!',
      }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should immediately show "Complete Your Profile" if session is authenticated but profile is incomplete on mount', async () => {
    // Simulate a scenario where the component mounts directly into an authenticated
    // state with an incomplete profile (e.g., after a page refresh during onboarding)
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-id-incomplete-on-mount',
          email: 'incomplete@example.com',
          isVerified: true, // Assume verified for this test
          // Missing zipCode and politicalAlignment
        },
      },
      status: 'authenticated',
    });

    // Use act to ensure all effects are flushed after initial render
    await act(async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    });

    expect(await screen.findByRole('heading', { name: 'Complete Your Profile' })).toBeInTheDocument();
    expect(screen.getByLabelText(/create a username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/how do you feel politically\?/i)).toBeInTheDocument();
  });

  it('allows selecting political alignment with buttons and resets specific party', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'newuser2@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } });

    // Mock signIn to resolve successfully and update session data
    (signIn as jest.Mock).mockImplementationOnce(() => {
      mockUseSession.mockReturnValueOnce({
        data: {
          user: {
            id: 'user-id-onboarding-2',
            email: 'newuser2@example.com',
            isVerified: true,
          },
        },
        status: 'authenticated',
      });
      return Promise.resolve({ error: null });
    });

    fireEvent.submit(screen.getByTestId('auth-form'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Complete Your Profile' })).toBeInTheDocument());

    const leftButton = screen.getByRole('button', { name: 'Left' });
    const centerButton = screen.getByRole('button', { name: 'Center' });
    const rightButton = screen.getByRole('button', { name: 'Right' });

    // Select Left
    fireEvent.click(leftButton);
    expect(leftButton).toHaveClass('bg-blue-600');
    expect(centerButton).not.toHaveClass('bg-platform-accent');
    expect(rightButton).not.toHaveClass('bg-red-600');
    expect(screen.getByRole('combobox', { name: /select your specific preference/i })).toBeInTheDocument();

    // Select a specific party
    fireEvent.click(screen.getByRole('combobox', { name: /select your specific preference/i }));
    fireEvent.click(screen.getByText('Liberal'));
    expect(screen.getByRole('combobox', { name: /select your specific preference/i })).toHaveTextContent('Liberal');

    // Switch to Center - should reset specific party
    fireEvent.click(centerButton);
    expect(centerButton).toHaveClass('bg-platform-accent');
    expect(leftButton).not.toHaveClass('bg-blue-600');
    expect(rightButton).not.toHaveClass('bg-red-600');
    expect(screen.getByRole('combobox', { name: /select your specific preference/i })).toHaveTextContent('Select a party'); // Should be reset

    // Switch to Right
    fireEvent.click(rightButton);
    expect(rightButton).toHaveClass('bg-red-600');
    expect(leftButton).not.toHaveClass('bg-blue-600');
    expect(centerButton).not.toHaveClass('bg-platform-accent');
    expect(screen.getByRole('combobox', { name: /select your specific preference/i })).toHaveTextContent('Select a party'); // Should be reset
  });
});