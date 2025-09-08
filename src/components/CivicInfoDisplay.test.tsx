import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CivicInfoDisplay from './CivicInfoDisplay';

describe('CivicInfoDisplay', () => {
  const mockAddress = {
    city: 'Springfield',
    state: 'IL',
    zipCode: '62704',
    congressionalDistrict: 'IL-13',
  };

  const mockElectionInfo = {
    name: 'General Election',
    electionDay: '2024-11-05',
  };

  const mockPollingInfo = {
    pollingLocations: [{
      address: { line1: '123 Main St', city: 'Springfield', state: 'IL', zip: '62704' },
      pollingHours: '7 AM - 8 PM',
      notes: 'Bring ID',
    }],
    earlyVoteSites: [{
      address: { line1: '456 Oak Ave', city: 'Springfield', state: 'IL', zip: '62704' },
      pollingHours: '9 AM - 5 PM',
    }],
    dropOffLocations: [{
      address: { line1: '789 Pine Ln', city: 'Springfield', state: 'IL', zip: '62704' },
      pollingHours: '24/7',
    }],
  };

  const mockContests = [
    {
      office: 'President of the United States',
      candidates: [
        { name: 'Candidate A', party: 'Party X', candidateUrl: 'http://candidateA.com' },
        { name: 'Candidate B', party: 'Party Y' },
      ],
    },
    {
      referendumTitle: 'Local School Bond',
      referendumText: 'A proposal to fund new school construction.',
    },
  ];

  const mockOfficials = {
    electionAdministrationBody: {
      name: 'Springfield Election Commission',
      electionInfoUrl: 'http://springfield.elections.com',
      phone: '555-123-4567',
      email: 'info@springfield.elections.com',
    },
    stateVoterRegistrationBody: {
      name: 'Illinois State Board of Elections',
      voterRegistrationUrl: 'http://illinois.vote.gov',
    },
  };

  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header section with address and refresh button', () => {
    render(<CivicInfoDisplay
      address={mockAddress}
      electionInfo={null}
      pollingInfo={null}
      contests={[]}
      officials={null}
      onRefresh={mockOnRefresh}
    />);

    expect(screen.getByText('Your Civic Hub')).toBeInTheDocument();
    expect(screen.getByText('Springfield, IL 62704 - IL-13')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('calls onRefresh when the refresh button is clicked', () => {
    render(<CivicInfoDisplay
      address={mockAddress}
      electionInfo={null}
      pollingInfo={null}
      contests={[]}
      officials={null}
      onRefresh={mockOnRefresh}
    />);
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders election info if provided', () => {
    render(<CivicInfoDisplay
      address={mockAddress}
      electionInfo={mockElectionInfo}
      pollingInfo={null}
      contests={[]}
      officials={null}
      onRefresh={mockOnRefresh}
    />);
    expect(screen.getByText('Nearest Election')).toBeInTheDocument();
    expect(screen.getByText('General Election')).toBeInTheDocument();
    expect(screen.getByText('on 2024-11-05')).toBeInTheDocument();
  });

  it('renders Voting Info accordion with polling locations, early vote sites, and drop boxes', () => {
    render(<CivicInfoDisplay
      address={mockAddress}
      electionInfo={null}
      pollingInfo={mockPollingInfo}
      contests={[]}
      officials={null}
      onRefresh={mockOnRefresh}
    />);

    expect(screen.getByRole('button', { name: /voting info/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /voting info/i })); // Open accordion

    expect(screen.getByText('Polling Location')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, Springfield, IL 62704')).toBeInTheDocument();
    expect(screen.getByText('Hours: 7 AM - 8 PM')).toBeInTheDocument();
    expect(screen.getByText('Notes: Bring ID')).toBeInTheDocument();

    expect(screen.getByText('Early Voting Sites')).toBeInTheDocument();
    expect(screen.getByText('456 Oak Ave, Springfield, IL 62704')).toBeInTheDocument();

    expect(screen.getByText('Ballot Drop Box Locations')).toBeInTheDocument();
    expect(screen.getByText('789 Pine Ln, Springfield, IL 62704')).toBeInTheDocument();
  });

  it('renders Ballot Contests accordion with candidates and referenda', () => {
    render(<CivicInfoDisplay
      address={mockAddress}
      electionInfo={null}
      pollingInfo={null}
      contests={mockContests}
      officials={null}
      onRefresh={mockOnRefresh}
    />);

    expect(screen.getByRole('button', { name: /ballot contests/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ballot contests/i })); // Open accordion

    expect(screen.getByText('President of the United States')).toBeInTheDocument();
    expect(screen.getByText('Candidate A (Party X)')).toBeInTheDocument();
    expect(screen.getByText('Candidate B (Party Y)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /candidatea\.com/i })).toHaveAttribute('href', 'http://candidateA.com');

    expect(screen.getByText('Local School Bond')).toBeInTheDocument();
    expect(screen.getByText('A proposal to fund new school construction.')).toBeInTheDocument();
  });

  it('renders Election Officials accordion with administration bodies', () => {
    render(<CivicInfoDisplay
      address={mockAddress}
      electionInfo={null}
      pollingInfo={null}
      contests={[]}
      officials={mockOfficials}
      onRefresh={mockOnRefresh}
    />);

    expect(screen.getByRole('button', { name: /election officials/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /election officials/i })); // Open accordion

    expect(screen.getByText('Election Administration Body')).toBeInTheDocument();
    expect(screen.getByText('Springfield Election Commission')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /election info/i })).toHaveAttribute('href', 'http://springfield.elections.com');
    expect(screen.getByText('555-123-4567')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /info@springfield\.elections\.com/i })).toHaveAttribute('href', 'mailto:info@springfield.elections.com');

    expect(screen.getByText('State Voter Registration Body')).toBeInTheDocument();
    expect(screen.getByText('Illinois State Board of Elections')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register to vote/i })).toHaveAttribute('href', 'http://illinois.vote.gov');
  });

  it('displays "No polling information available" if no polling data', () => {
    render(<CivicInfoDisplay
      address={mockAddress}
      electionInfo={null}
      pollingInfo={{ pollingLocations: [], earlyVoteSites: [], dropOffLocations: [] }}
      contests={[]}
      officials={null}
      onRefresh={mockOnRefresh}
    />);
    fireEvent.click(screen.getByRole('button', { name: /voting info/i })); // Open accordion
    expect(screen.getByText('No polling information available for this election.')).toBeInTheDocument();
  });

  it('displays "No election official information available" if no officials data', () => {
    render(<CivicInfoDisplay
      address={mockAddress}
      electionInfo={null}
      pollingInfo={null}
      contests={[]}
      officials={{}}
      onRefresh={mockOnRefresh}
    />);
    fireEvent.click(screen.getByRole('button', { name: /election officials/i })); // Open accordion
    expect(screen.getByText('No election official information available.')).toBeInTheDocument();
  });
});