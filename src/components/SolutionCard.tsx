"use client";

import React from 'react';
import { Solution } from '../types';
import { Button } from './ui/button';
import { ThumbsUp, Trophy } from 'lucide-react'; // Import PlayCircle icon
import { motion } from 'framer-motion';
import PlatformCard from './PlatformCard';
import RollingCounter from './RollingCounter'; // Import RollingCounter
import { colors } from '../lib/theme'; // Import centralized colors
import { useToast } from '../hooks/use-toast'; // Import toast hook

interface SolutionCardProps {
  solution: Solution;
  hasVotedOnCurrentTopic: boolean;
  selectedSolutionId: string | null;
  onSolutionVoted: (solutionId: string | null) => void;
  topicId: string;
  isUserAuthenticated: boolean;
  isUserVerified: boolean;
  onAuthRequired: () => void;
  totalVotesAcrossAllSolutions: number;
  isSubmittingVote: boolean; // New prop
}

const SolutionCard: React.FC<SolutionCardProps> = ({ 
  solution, 
  hasVotedOnCurrentTopic, 
  selectedSolutionId,
  onSolutionVoted,
  topicId,
  isUserAuthenticated,
  isUserVerified,
  onAuthRequired,
  totalVotesAcrossAllSolutions,
  isSubmittingVote, // Destructure new prop
}) => {
  const { toast } = useToast(); // Initialize toast
  const isNoSupportCard = solution.id === 'no-support-solution';
  const isSelected = selectedSolutionId === solution.id;
  // The 'canVote' variable is now primarily for styling/cursor, not for controlling clickability itself.
  // The actual click logic is handled within handleCardClick.
  const canProceedWithVote = isUserAuthenticated && isUserVerified && !hasVotedOnCurrentTopic;

  const handleCardClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from bubbling up to the overlay

    console.log("SolutionCard: handleCardClick triggered.");
    console.log("SolutionCard: isUserAuthenticated =", isUserAuthenticated);
    console.log("SolutionCard: isUserVerified =", isUserVerified);

    // If a vote is already being submitted, do nothing
    if (isSubmittingVote) {
      console.log("SolutionCard: Vote already in progress, ignoring click.");
      return;
    }

    // If user is not authenticated or not verified, show auth modal
    if (!isUserAuthenticated || !isUserVerified) {
      console.log("SolutionCard: Auth/Verification required. Opening AuthModal and returning.");
      onAuthRequired();
      return; // This should stop execution here.
    }
    
    // If user has already voted on this topic, show a friendly message
    if (hasVotedOnCurrentTopic) {
      console.log("SolutionCard: User already voted on this topic. Showing toast.");
      toast({
        title: "Already voted!",
        description: "You've already cast your vote on this topic.",
        duration: 3000,
      });
      return;
    }

    // If we reach here, the user is authenticated, verified, and hasn't voted on this topic yet.
    // Proceed with the voting API call.
    try {
      // The `onSolutionVoted` callback in `index.tsx` will handle setting `isSubmittingVote`
      // and making the API call.
      onSolutionVoted(isNoSupportCard ? null : solution.id || null);
    } catch (error) {
      console.error('Error initiating vote on solution:', error);
    }
  };

  let currentSolutionVotes = solution.votes || 0;
  // If this is the "no support" card and it's selected, count it as 1 vote for percentage calculation
  if (isNoSupportCard && isSelected && hasVotedOnCurrentTopic) {
    currentSolutionVotes = 1;
  }

  const percentage = totalVotesAcrossAllSolutions > 0 
    ? ((currentSolutionVotes / totalVotesAcrossAllSolutions) * 100).toFixed(1) 
    : '0.0';

  return (
    <motion.div
      // The card is clickable if the user has NOT voted on the current topic yet.
      // The handleCardClick function will then decide if auth is needed or if to proceed with vote.
      className={`flex flex-col justify-between ${!hasVotedOnCurrentTopic && !isSubmittingVote ? 'cursor-pointer' : 'cursor-default'} ${isSubmittingVote ? 'opacity-70' : ''}`}
      onClick={!hasVotedOnCurrentTopic && !isSubmittingVote ? handleCardClick : undefined}
      whileHover={!hasVotedOnCurrentTopic && !isSubmittingVote ? { scale: 1.02, boxShadow: "0 10px 15px rgba(0, 0, 0, 0.3)" } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <PlatformCard 
        variant="background" 
        className={`p-6 sm:p-8 h-full relative overflow-hidden
          ${isSelected ? 'border-2 border-platform-accent' : 'border border-platform-contrast'}
          ${isSelected && hasVotedOnCurrentTopic ? 'animate-shimmer' : ''}
        `}
      >
        {/* Shimmer effect overlay */}
        {isSelected && hasVotedOnCurrentTopic && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-platform-accent/20 to-transparent shimmer-effect pointer-events-none"></div>
        )}

        {/* Trophy for selected solution */}
        {isSelected && hasVotedOnCurrentTopic && !isNoSupportCard && (
          <Trophy className="h-5 w-5 text-yellow-400 absolute top-4 right-4" />
        )}

        {/* Solution Title */}
        <motion.h4
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-xl sm:text-3xl font-thin text-platform-text" 
        >
          {solution.title}
        </motion.h4>

        {/* The Solution Section (always present) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-4 pt-4 border-t border-platform-text/20 flex-1" // flex-1 to push thumbs up to bottom
        >
          <h4 className="font-thin mb-2 text-platform-text text-base sm:text-lg">The Solution</h4>
          <p className="text-sm text-platform-text/90 whitespace-pre-wrap font-normal">
            {solution.description}
          </p>
        </motion.div>

        {/* Thumbs Up and Votes (always present at bottom right, unless "no support" card) */}
        {!isNoSupportCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-6 flex items-center justify-end" /* Increased mt */
          >
            <ThumbsUp className="h-4 w-4 text-platform-text/80 mr-1" />
            {hasVotedOnCurrentTopic && ( // Only show votes and percentage if user has voted on the topic
              <>
                <span className="text-sm text-platform-text/80 font-normal">
                  <RollingCounter value={solution.votes || 0} /> Votes
                </span>
                <span className="text-platform-accent font-semibold ml-2">({percentage}%)</span>
              </>
            )}
          </motion.div>
        )}
      </PlatformCard>
    </motion.div>
  );
};

export default SolutionCard;