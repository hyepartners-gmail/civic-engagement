import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RedistrictingPage from '../../pages/Redistricting';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useToast } from '@/hooks/use-toast';

// Mock useSession
const mockUseSession = useSession as jest.Mock;

// Mock useRouter
const mockUseRouter = useRouter as jest.Mock;

// Mock useToast
let mockToastFn: jest.Mock;
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: (...args: any[]) => mockToastFn(...args),
  }),
}));

// Mock child components to simplify rendering and control behavior
jest.mock('@/components/RedistrictingMap', () => {
  return ({ onDistrictClick, activeLayers, selectedVoteYear, ...props }: any) => (
    <div data-testid="mock-redistricting-map">
      Map Component
      <button
        data-testid="mock-district-click-button"
        onClick={() => onDistrictClick(
          { id: 'CD-CA-P1', name: 'Proposed District P1', population: 755000, population_deviation: 0.005, edges_score: 0.8, partisan_lean: 'R+10', packing_cracking_flag: 'Packed' },
          { margin: 0.15, winner: 'R' }
        )}
      >
        Click Proposed District
      </button>
      <span data-testid="active-layers">{JSON.stringify(activeLayers)}</span>
      <span data-testid="selected-vote-year">{selectedVoteYear}</span>
    </div>
  );
});

jest.mock('@/components/Redistricting/DistrictInfoPanel', () => ({ isOpen, onClose, district, voteData }: any) => (
  isOpen ? (
    <div data-testid="mock-district-info-panel">
      District Info Panel for {district.name}
      <button onClick={onClose}>Close Panel</button>
    </div>
  ) : null
));

// Mock global fetch
global.fetch = jest.fn();

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(),
  },
  writable: true,
});

describe('RedistrictingPage', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    isVerified: true,
    zipCode: '94105',
    city: 'San Francisco',
    state: 'CA',
    congressionalDistrict: 'CA-12',
    viewedCivicPage: true,
    viewedRedistrictingMap: false,
    viewedAllRedistrictingOverlays: false,
    exploredDistricts: [],
  };

  const mockMapDataResponses = {
    currentDistricts: { type: 'FeatureCollection', features: [{ properties: { id: 'CD-CA-12' } }] },
    proposedDistricts: { type: 'FeatureCollection', features: [{ properties: { id: 'CD-CA-P1' } }] },
    blocks: { type: 'FeatureCollection', features: [] },
    votes2016: { 'CD-CA-12': { margin: 0.1, winner: 'D' } },
    votes2020: { 'CD-CA-12': { margin: 0.2, winner: 'D' } },
    votes2024: { 'CD-CA-12': { margin: 0.3, winner: 'D' } },
    districtStats: { 'CD-CA-12': { population: 750000, compactness: 0.6, edges_score: 0.7, partisan_lean: 'D+20' } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockToastFn = jest.fn();

    mockUseSession.mockReturnValue({ data: null, status: 'loading', update: jest.fn() });
    mockUseRouter.mockReturnValue({ push: jest.fn(), query: {}, pathname: '/redistricting' });

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/maps/CA/cd_current.geojson')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMapDataResponses.currentDistricts) });
      if (url.includes('/maps/CA/cd_proposed_v1.geojson')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMapDataResponses.proposedDistricts) });
      if (url.includes('/maps/CA/blocks_2020.geojson')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMapDataResponses.blocks) });
      if (url.includes('/maps/CA/votes_2016.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMapDataResponses.votes2016) });
      if (url.includes('/maps/CA/votes_2020.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMapDataResponses.votes2020) });
      if (url.includes('/maps/CA/votes_2024.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMapDataResponses.votes2024) });
      if (url.includes('/maps/CA/district_stats.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMapDataResponses.districtStats) });
      if (url.includes('/api/user-actions')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Action recorded' }) });
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    });
  });

  it('redirects to / if user is not authenticated and does not have Civic Explorer badge', async () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated', update: jest.fn() });
    const mockPush = jest.fn();
    mockUseRouter.mockReturnValue({ push: mockPush, query: {}, pathname: '/redistricting' });

    render(<RedistrictingPage />);
    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        title: 'Access Denied',
      }));
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('allows access if user is authenticated and has Civic Explorer badge', async () => {
    mockUseSession.mockReturnValue({ data: { user: mockUser }, status: 'authenticated', update: jest.fn() });
    render(<RedistrictingPage />);
    await waitFor(() => {
      expect(screen.getByText('Redistricting Explorer')).toBeInTheDocument();
      expect(screen.getByTestId('mock-redistricting-map')).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledTimes(7);
  });

  it('loads all base layers and awards "Redistrictor" badge on first visit', async () => {
    const mockUpdateSession = jest.fn();
    mockUseSession.mockReturnValue({ data: { user: { ...mockUser, viewedRedistrictingMap: false } }, status: 'authenticated', update: mockUpdateSession });

    render(<RedistrictingPage />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-redistricting-map')).toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith('/api/user-actions', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ actionType: 'view_redistricting_map' }),
      }));
      expect(mockUpdateSession).toHaveBeenCalledTimes(1);
    });
  });

  it('opens district info panel on district click', async () => {
    const mockUpdateSession = jest.fn();
    mockUseSession.mockReturnValue({ data: { user: { ...mockUser, exploredDistricts: [], districtsExploredCount: 0 } }, status: 'authenticated', update: mockUpdateSession });

    render(<RedistrictingPage />);
    await waitFor(() => expect(screen.getByTestId('mock-redistricting-map')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('mock-district-click-button'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-district-info-panel')).toBeInTheDocument();
      expect(screen.getByText('District Info Panel for Proposed District P1')).toBeInTheDocument();
    });
  });
});