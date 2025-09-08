import React from 'react';
import { Solution } from '../types';
import SolutionCard from './SolutionCard';
import { motion } from 'framer-motion';

interface SolutionListProps {
  solutions: Solution[];
  hasVotedOnCurrentTopic: boolean;
  selectedSolutionId: string | null;
  onSolutionVoted: (solutionId: string | null) => void;
  topicId: string;
  isUserAuthenticated: boolean; // New prop
  isUserVerified: boolean; // New prop
  onAuthRequired: () => void; // New prop
  totalVotesAcrossAllSolutions: number;
  isSubmittingVote: boolean; // New prop
}

const SolutionList: React.FC<SolutionListProps> = ({ 
  solutions, 
  hasVotedOnCurrentTopic, 
  selectedSolutionId,
  onSolutionVoted,
  topicId,
  isUserAuthenticated, // Destructure new prop
  isUserVerified, // Destructure new prop
  onAuthRequired, // Destructure new prop
  totalVotesAcrossAllSolutions, // Pass the total votes
  isSubmittingVote, // Destructure new prop
}) => {
  const noSupportSolution: Solution = {
    id: 'no-support-solution',
    title: 'I do not support any solution.',
    description: 'Choosing this option indicates you do not agree with any of the proposed solutions for this topic.',
    status: 'approved', // Treat as approved for display purposes
    votes: 0, // No actual votes for this, but keeps type consistent
  };

  // Filter for approved solutions before adding the 'no-support' option
  const approvedSolutions = solutions.filter(sol => sol.status === 'approved');
  const allSolutions = [...approvedSolutions, noSupportSolution];

  // Calculate total votes for percentage calculation
  // This calculation is now done in Index.tsx and passed down.
  // The SolutionCard will adjust its own percentage if it's the 'no support' option.

  return (
    <div className={`mt-6 sm:mt-8`}> {/* Increased mt */}
      <h3 className="text-xl sm:text-2xl font-thin mb-6 text-platform-accent">Proposed Solutions</h3> {/* Increased mb */}
      <div className="space-y-6"> {/* Increased space-y */}
        {allSolutions.length > 0 ? (
          allSolutions.map((solution) => (
            <motion.div
              key={solution.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SolutionCard 
                solution={solution} 
                hasVotedOnCurrentTopic={hasVotedOnCurrentTopic}
                selectedSolutionId={selectedSolutionId}
                onSolutionVoted={onSolutionVoted}
                topicId={topicId}
                isUserAuthenticated={isUserAuthenticated} // Pass prop
                isUserVerified={isUserVerified} // Pass prop
                onAuthRequired={onAuthRequired} // Pass new prop
                totalVotesAcrossAllSolutions={totalVotesAcrossAllSolutions} // Pass the total votes
                isSubmittingVote={isSubmittingVote} // Pass submitting state
              />
            </motion.div>
          ))
        ) : (
          <p className="text-platform-text/70 font-normal">No solutions have been proposed yet.</p>
        )}
      </div>
    </div>
  );
};

export default SolutionList;