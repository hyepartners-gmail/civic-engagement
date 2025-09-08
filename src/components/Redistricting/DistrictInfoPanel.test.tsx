import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DistrictInfoPanel from './DistrictInfoPanel';

// Mock framer-motion components for simple rendering
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, transition, className }: any) => (
      <div data-testid="motion-div" data-initial={JSON.stringify(initial)} data-animate={JSON.stringify(animate)} className={className}>
        {children}
      </div>
    ),
  },
}));

describe('DistrictInfoPanel', () => {
  const mockDistrict = {
    id: 'CD-CA-P1',
    name: 'Proposed District P1',
    population: 755000,
    population_deviation: 0.005,
    edges_score: 0.8,
    partisan_lean: 'R+10',
    packing_cracking_flag: 'Packed' as 'Packed',
  };

  const mockVoteData = {
    margin: 0.15,
    winner: 'R' as 'R',
  };

  it('does not render when isOpen is false', () => {
    render(<DistrictInfoPanel isOpen={false} onClose={jest.fn()} district={mockDistrict} voteData={mockVoteData} />);
    expect(screen.queryByText('District Details')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true and displays all district properties', () => {
    render(<DistrictInfoPanel isOpen={true} onClose={jest.fn()} district={mockDistrict} voteData={mockVoteData} />);

    expect(screen.getByText('District Details')).toBeInTheDocument();
    expect(screen.getByText(mockDistrict.name)).toBeInTheDocument();
    expect(screen.getByText(`ID: ${mockDistrict.id}`)).toBeInTheDocument();

    // Population
    expect(screen.getByText('Population')).toBeInTheDocument();
    expect(screen.getByText(mockDistrict.population.toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(`Deviation:`)).toBeInTheDocument();
    expect(screen.getByText(`${(mockDistrict.population_deviation! * 100).toFixed(2)}%`)).toBeInTheDocument();

    // Vote Lean
    expect(screen.getByText('Vote Lean')).toBeInTheDocument();
    expect(screen.getByText('Winner:')).toBeInTheDocument();
    expect(screen.getByText(mockVoteData.winner)).toBeInTheDocument();
    expect(screen.getByText('Margin:')).toBeInTheDocument();
    expect(screen.getByText(`${(mockVoteData.margin * 100).toFixed(1)}%`)).toBeInTheDocument();
    expect(screen.getByText('Partisan Lean:')).toBeInTheDocument();
    expect(screen.getByText(mockDistrict.partisan_lean!)).toBeInTheDocument();

    // Fairness Metrics
    expect(screen.getByText('Fairness Metrics')).toBeInTheDocument();
    expect(screen.getByText('Compactness:')).toBeInTheDocument();
    expect(screen.getByText(mockDistrict.compactness!.toFixed(2))).toBeInTheDocument();
    expect(screen.getByText('Edges Score:')).toBeInTheDocument();
    expect(screen.getByText(mockDistrict.edges_score!.toFixed(2))).toBeInTheDocument();
    expect(screen.getByText('Packing/Cracking:')).toBeInTheDocument();
    expect(screen.getByText(mockDistrict.packing_cracking_flag!)).toBeInTheDocument();
    expect(screen.getByText(mockDistrict.packing_cracking_flag!)).toHaveClass('text-red-400'); // Check color for 'Packed'
  });

  it('displays correct color for "Cracked" flag', () => {
    const crackedDistrict = { ...mockDistrict, packing_cracking_flag: 'Cracked' as 'Cracked' };
    render(<DistrictInfoPanel isOpen={true} onClose={jest.fn()} district={crackedDistrict} voteData={mockVoteData} />);
    expect(screen.getByText('Cracked')).toHaveClass('text-orange-400');
  });

  it('displays correct color for "None" flag', () => {
    const noneDistrict = { ...mockDistrict, packing_cracking_flag: 'None' as 'None' };
    render(<DistrictInfoPanel isOpen={true} onClose={jest.fn()} district={noneDistrict} voteData={mockVoteData} />);
    expect(screen.getByText('None')).toHaveClass('text-platform-text/70');
  });

  it('does not render vote lean section if voteData is null', () => {
    render(<DistrictInfoPanel isOpen={true} onClose={jest.fn()} district={mockDistrict} voteData={null} />);
    expect(screen.queryByText('Vote Lean')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<DistrictInfoPanel isOpen={true} onClose={mockOnClose} district={mockDistrict} voteData={mockVoteData} />);
    fireEvent.click(screen.getByLabelText('Close panel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});