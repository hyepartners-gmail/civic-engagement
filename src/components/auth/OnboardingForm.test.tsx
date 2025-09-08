import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingForm from './OnboardingForm';
import { useToast } from '@/hooks/use-toast';
import { isValidZipCode } from '@/utils/validation';
import zipcodes from 'zipcodes';

// Mock useToast hook
let mockToastFn: jest.Mock;
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: (...args: any[]) => mockToastFn(...args),
  }),
}));

// Mock validation utility
jest.mock('@/utils/validation', () => ({
  isValidZipCode: jest.fn(),
}));

// Mock zipcodes package
jest.mock('zipcodes', () => ({
  lookup: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('OnboardingForm', () => {
  const mockProps = {
    userId: 'test-user-id',
    username: '', setUsername: jest.fn(),
    zipCode: '', setZipCode: jest.fn(),
    birthYear: '', setBirthYear: jest.fn(),
    politicalAlignmentChoice: undefined, setPoliticalAlignmentChoice: jest.fn(),
    specificPartyPreference: '', setSpecificPartyPreference: jest.fn(),
    onSubmit: jest.fn(),
    error: '', isSubmitting: false,
    city: undefined, setCity: jest.fn(),
    state: undefined, setState: jest.fn(),
    metroArea: undefined, setMetroArea: jest.fn(),
    congressionalDistrict: undefined, setCongressionalDistrict: jest.fn(),
  };

  beforeEach(() => {
    mockToastFn = jest.fn();
    jest.clearAllMocks();
    (isValidZipCode as jest.Mock).mockReturnValue(true); // Default to valid zip
    (zipcodes.lookup as jest.Mock).mockReturnValue(null); // Default no lookup data
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}), // Default empty civic info response
    });
  });

  it('renders all required fields', () => {
    render(<OnboardingForm {...mockProps} />);
    expect(screen.getByLabelText(/create a username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/how do you feel politically\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();
  });

  it('calls setZipCode on zip code input change', () => {
    render(<OnboardingForm {...mockProps} />);
    const zipInput = screen.getByLabelText(/zip code/i);
    fireEvent.change(zipInput, { target: { value: '12345' } });
    expect(mockProps.setZipCode).toHaveBeenCalledWith('12345');
  });

  it('looks up city/state and congressional district when zip code is valid', async () => {
    (mockProps.setZipCode as jest.Mock).mockImplementation((val: string) => {
      mockProps.zipCode = val; // Manually update prop for effect to trigger
    });
    (isValidZipCode as jest.Mock).mockReturnValue(true);
    (zipcodes.lookup as jest.Mock).mockReturnValue({ city: 'Springfield', state: 'IL' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ congressionalDistrict: 'IL-13', metroArea: 'Springfield Metro' }),
    });

    const { rerender } = render(<OnboardingForm {...mockProps} />);
    fireEvent.change(screen.getByLabelText(/zip code/i), { target: { value: '62704' } });
    rerender(<OnboardingForm {...mockProps} />); // Re-render to trigger useEffect with updated zipCode

    await waitFor(() => {
      expect(mockProps.setCity).toHaveBeenCalledWith('Springfield');
      expect(mockProps.setState).toHaveBeenCalledWith('IL');
      expect(mockProps.setCongressionalDistrict).toHaveBeenCalledWith('IL-13');
      expect(mockProps.setMetroArea).toHaveBeenCalledWith('Springfield Metro');
      expect(screen.getByText('Springfield, IL')).toBeInTheDocument();
      expect(screen.getByText('Congressional District: IL-13')).toBeInTheDocument();
      expect(screen.getByText('Metro Area: Springfield Metro')).toBeInTheDocument();
    }, { timeout: 1000 }); // Increased timeout for debounce
  });

  it('shows loading message during zip code lookup', async () => {
    (mockProps.setZipCode as jest.Mock).mockImplementation((val: string) => {
      mockProps.zipCode = val;
    });
    (isValidZipCode as jest.Mock).mockReturnValue(true);
    (zipcodes.lookup as jest.Mock).mockReturnValue({ city: 'Springfield', state: 'IL' });
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 500))
    );

    const { rerender } = render(<OnboardingForm {...mockProps} />);
    fireEvent.change(screen.getByLabelText(/zip code/i), { target: { value: '62704' } });
    rerender(<OnboardingForm {...mockProps} />);

    expect(screen.getByText('Looking up location...')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Looking up location...')).not.toBeInTheDocument(), { timeout: 1000 });
  });

  it('shows error toast if civic info API fails', async () => {
    (mockProps.setZipCode as jest.Mock).mockImplementation((val: string) => {
      mockProps.zipCode = val;
    });
    (isValidZipCode as jest.Mock).mockReturnValue(true);
    (zipcodes.lookup as jest.Mock).mockReturnValue({ city: 'Springfield', state: 'IL' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'API error' }),
    });

    const { rerender } = render(<OnboardingForm {...mockProps} />);
    fireEvent.change(screen.getByLabelText(/zip code/i), { target: { value: '62704' } });
    rerender(<OnboardingForm {...mockProps} />);

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        title: 'Location Lookup Error',
        description: 'API error',
      }));
    }, { timeout: 1000 });
  });

  it('shows validation error if username is empty on submit', async () => {
    render(<OnboardingForm {...mockProps} username="" birthYear="1990" />);
    fireEvent.click(screen.getByRole('button', { name: /complete profile/i }));
    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Validation Error',
        description: 'Please enter a username.',
      }));
    });
    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error if zip code is invalid on submit', async () => {
    (isValidZipCode as jest.Mock).mockReturnValue(false);
    render(<OnboardingForm {...mockProps} username="test" zipCode="123" birthYear="1990" />);
    fireEvent.click(screen.getByRole('button', { name: /complete profile/i }));
    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Validation Error',
        description: 'Please enter a valid 5-digit zip code.',
      }));
    });
    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error if birth year is invalid on submit', async () => {
    render(<OnboardingForm {...mockProps} username="test" zipCode="12345" birthYear="1899" />);
    fireEvent.click(screen.getByRole('button', { name: /complete profile/i }));
    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Validation Error',
        description: 'Please enter a valid 4-digit birth year starting with 19 or 20.',
      }));
    });
    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error if city/state are not populated on submit', async () => {
    (isValidZipCode as jest.Mock).mockReturnValue(true);
    (mockProps.setCity as jest.Mock).mockReturnValue(undefined); // Ensure city is undefined
    (mockProps.setState as jest.Mock).mockReturnValue(undefined); // Ensure state is undefined
    render(<OnboardingForm {...mockProps} username="test" zipCode="12345" birthYear="1990" city={undefined} state={undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /complete profile/i }));
    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Validation Error',
        description: 'Unable to determine city and state from zip code. Please try a different zip code or contact support.',
      }));
    });
    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error if political alignment is not selected', async () => {
    render(<OnboardingForm {...mockProps} username="test" zipCode="12345" birthYear="1990" city="City" state="ST" politicalAlignmentChoice={undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /complete profile/i }));
    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Validation Error',
        description: 'Please select your political alignment.',
      }));
    });
    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error if specific party preference is not selected when alignment is chosen', async () => {
    render(<OnboardingForm {...mockProps} username="test" zipCode="12345" birthYear="1990" city="City" state="ST" politicalAlignmentChoice="Left" specificPartyPreference="" />);
    fireEvent.click(screen.getByRole('button', { name: /complete profile/i }));
    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Validation Error',
        description: 'Please select your specific party preference.',
      }));
    });
    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid data', async () => {
    render(<OnboardingForm
      {...mockProps}
      username="testuser"
      zipCode="12345"
      birthYear="1990"
      city="TestCity"
      state="TS"
      politicalAlignmentChoice="Center"
      specificPartyPreference="Independent"
    />);
    fireEvent.click(screen.getByRole('button', { name: /complete profile/i }));
    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});