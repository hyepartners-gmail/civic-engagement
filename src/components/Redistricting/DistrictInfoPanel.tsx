"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { X, Users, Scale, TrendingUp, TrendingDown, Minus, Flag } from 'lucide-react';
import { Button } from '../ui/button';
import PlatformCard from '../PlatformCard';
import { colors } from '../../lib/theme'; // Import centralized colors

interface DistrictInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  district: {
    id: string;
    name: string;
    population: number;
    population_deviation?: number;
    edges_score?: number;
    partisan_lean?: string;
    packing_cracking_flag?: 'Packed' | 'Cracked' | 'None';
    compactness?: number;
  };
  voteData: { margin: number; winner: 'D' | 'R' | 'Other' } | null;
}

const DistrictInfoPanel: React.FC<DistrictInfoPanelProps> = ({ isOpen, onClose, district, voteData }) => {
  if (!district) return null;

  const getVoteIcon = (winner: 'D' | 'R' | 'Other') => {
    if (winner === 'D') return <TrendingUp className="h-4 w-4 text-blue-500" />;
    if (winner === 'R') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getPackingCrackingColor = (flag?: 'Packed' | 'Cracked' | 'None') => {
    if (flag === 'Packed') return 'text-red-400';
    if (flag === 'Cracked') return 'text-orange-400';
    return 'text-platform-text/70';
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? '0%' : '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-full max-w-sm bg-platform-background z-50 shadow-xl flex flex-col p-6 sm:p-8 border-l border-platform-contrast" /* Increased padding */
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-thin text-platform-text">District Details</h2> {/* Changed to text-platform-text */}
        <Button variant="platform-ghost" size="sm" onClick={onClose} aria-label="Close panel"> {/* Using new platform variant */}
          <X className="h-6 w-6 hover:text-white" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6"> {/* Increased space-y */}
        <PlatformCard variant="background" className="p-4">
          <h3 className="text-lg font-semibold text-platform-text mb-2">{district.name}</h3>
          <p className="text-sm text-platform-text/70 font-normal">ID: {district.id}</p>
        </PlatformCard>

        <PlatformCard variant="background" className="p-4 space-y-3">
          <h3 className="text-lg font-semibold text-platform-text mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-platform-accent" /> Population
          </h3>
          <div className="flex justify-between items-center text-sm font-normal">
            <span className="text-platform-text/80">Total:</span>
            <span className="text-platform-text">{district.population.toLocaleString()}</span>
          </div>
          {district.population_deviation !== undefined && (
            <div className="flex justify-between items-center text-sm font-normal">
              <span className="text-platform-text/80">Deviation:</span>
              <span className="text-platform-text">{(district.population_deviation * 100).toFixed(2)}%</span>
            </div>
          )}
        </PlatformCard>

        {voteData && (
          <PlatformCard variant="background" className="p-4 space-y-3">
            <h3 className="text-lg font-semibold text-platform-text mb-2 flex items-center gap-2">
              <Scale className="h-5 w-5 text-platform-accent" /> Vote Lean
            </h3>
            <div className="flex justify-between items-center text-sm font-normal">
              <span className="text-platform-text/80">Winner:</span>
              <span className="flex items-center gap-1 text-platform-text">
                {getVoteIcon(voteData.winner)} {voteData.winner}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-normal">
              <span className="text-platform-text/80">Margin:</span>
              <span className="text-platform-text">{(voteData.margin * 100).toFixed(1)}%</span>
            </div>
            {district.partisan_lean && (
              <div className="flex justify-between items-center text-sm font-normal">
                <span className="text-platform-text/80">Partisan Lean:</span>
                <span className="text-platform-text">{district.partisan_lean}</span>
              </div>
            )}
          </PlatformCard>
        )}

        <PlatformCard variant="background" className="p-4 space-y-3">
          <h3 className="text-lg font-semibold text-platform-text mb-2 flex items-center gap-2">
            <Flag className="h-5 w-5 text-platform-accent" /> Fairness Metrics
          </h3>
          {district.compactness !== undefined && (
            <div className="flex justify-between items-center text-sm font-normal">
              <span className="text-platform-text/80">Compactness:</span>
              <span className="text-platform-text">{district.compactness.toFixed(2)}</span>
            </div>
          )}
          {district.edges_score !== undefined && (
            <div className="flex justify-between items-center text-sm font-normal">
              <span className="text-platform-text/80">Edges Score:</span>
              <span className="text-platform-text">{district.edges_score.toFixed(2)}</span>
            </div>
          )}
          {district.packing_cracking_flag && (
            <div className="flex justify-between items-center text-sm font-normal">
              <span className="text-platform-text/80">Packing/Cracking:</span>
              <span className={`font-semibold ${getPackingCrackingColor(district.packing_cracking_flag)}`}>
                {district.packing_cracking_flag}
              </span>
            </div>
          )}
        </PlatformCard>
      </div>
    </motion.div>
  );
};

export default DistrictInfoPanel;