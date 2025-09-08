"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowRight, List } from 'lucide-react';
import { Button } from './ui/button';
import { Topic } from '../types';
import TopicCard from './TopicCard';
import SolutionList from './SolutionList';
import DiscussionThread from './DiscussionThread';
import SkipButton from './SkipButton';
import SuggestionButton from './SuggestionButton';
import OnboardingTooltip from './OnboardingTooltip';
import VideoPlayerOverlay from './VideoPlayerOverlay';

interface TopicDetailOverlayProps {
  isOpen: boolean;
  topic: Topic | null;
  onClose: () => void;
  isUserAuthenticated: boolean;
  isUserVerified: boolean;
  hasVotedOnCurrentTopic: boolean;
  selectedSolutionId: string | null;
  onSolutionVoted: (topicId: string, solutionId: string | null) => void;
  onAuthRequired: () => void;
  totalVotesAcrossAllSolutions: number;
  userVotedTopicsCount: number;
  onSkipTopic: (topicId: string) => void;
  onSuggestSolution: () => void;
  onShowVideo: (videoUrl: string) => void;
  isVotingAndDiscussionEnabled: boolean;
  showPostVoteActions: boolean;
  onNextTopic: () => void;
  isSubmittingVote: boolean; // New prop
}

const TopicDetailOverlay: React.FC<TopicDetailOverlayProps> = ({
  isOpen,
  topic,
  onClose,
  isUserAuthenticated,
  isUserVerified,
  hasVotedOnCurrentTopic,
  selectedSolutionId,
  onSolutionVoted,
  onAuthRequired,
  totalVotesAcrossAllSolutions,
  userVotedTopicsCount,
  onSkipTopic,
  onSuggestSolution,
  onShowVideo,
  isVotingAndDiscussionEnabled,
  showPostVoteActions,
  onNextTopic,
  isSubmittingVote, // Destructure new prop
}) => {
  const [isVideoOverlayOpen, setIsVideoOverlayOpen] = React.useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = React.useState('');

  const handleShowVideoInternal = (videoUrl: string) => {
    setCurrentVideoUrl(videoUrl);
    setIsVideoOverlayOpen(true);
    onShowVideo(videoUrl); // Propagate to parent for tracking video interaction
  };

  const handleVideoOverlayClose = () => {
    setIsVideoOverlayOpen(false);
    setCurrentVideoUrl('');
  };

  if (!topic) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 sm:p-8" // Added padding
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="detail-view-overlay"
        >
          <motion.div
            layoutId={topic.id}
            className="w-full h-full max-w-4xl max-h-[90vh] bg-platform-background relative rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            data-testid={`topic-card-${topic.id}-detail-content`}
          >
            <div className="p-6 sm:p-8 w-full h-full overflow-y-auto"> {/* Increased padding */}
              <motion.button
                className="absolute top-6 right-6 text-platform-text/70 hover:text-white z-10" // Adjusted top/right
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </motion.button>
              <div className="max-h-[calc(100vh-8rem)] pr-4">
                <TopicCard
                  topic={topic}
                  isDetailView={true}
                  isUserAuthenticated={isUserAuthenticated}
                  isUserVerified={isUserVerified}
                  hasVotedOnCurrentTopic={hasVotedOnCurrentTopic}
                  onShowVideo={handleShowVideoInternal}
                />
                <SolutionList
                  solutions={topic.solutions || []}
                  hasVotedOnCurrentTopic={hasVotedOnCurrentTopic}
                  selectedSolutionId={selectedSolutionId}
                  onSolutionVoted={(solutionId) => onSolutionVoted(topic.id, solutionId)}
                  topicId={topic.id}
                  isUserAuthenticated={isUserAuthenticated}
                  isUserVerified={isUserVerified}
                  onAuthRequired={onAuthRequired}
                  totalVotesAcrossAllSolutions={totalVotesAcrossAllSolutions}
                  isSubmittingVote={isSubmittingVote} // Pass submitting state
                />
                {!showPostVoteActions && !isVotingAndDiscussionEnabled && (
                  <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row gap-4 mb-8"> {/* Increased mt */}
                    {userVotedTopicsCount >= 3 && (
                      <OnboardingTooltip
                        storageKey="suggestSolutionTooltip"
                        content="Suggest a new solution for this topic once you've voted on at least 3 topics."
                      >
                        <SuggestionButton onClick={onSuggestSolution} />
                      </OnboardingTooltip>
                    )}
                    <SkipButton onClick={() => onSkipTopic(topic.id)} />
                  </div>
                )}

                {showPostVoteActions || isVotingAndDiscussionEnabled ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="mt-8 sm:mt-12 flex flex-col sm:flex-row gap-4 mb-8 justify-center" /* Increased mt */
                  >
                    <Button
                      onClick={onNextTopic}
                      variant="platform-primary" // Using new platform variant
                      className="flex items-center gap-2 px-6 py-3 text-sm sm:text-base" // Standardized padding
                    >
                      Next Topic <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={onClose}
                      variant="platform-secondary" // Using new platform variant
                      className="flex items-center gap-2 px-6 py-3 text-sm sm:text-base" // Standardized padding
                    >
                      <List className="h-4 w-4" /> Back to All Topics
                    </Button>
                  </motion.div>
                ) : null}

                {isVotingAndDiscussionEnabled && (
                  <OnboardingTooltip
                    storageKey="discussionTooltip"
                    content="This is where you can discuss proposed solutions and share your thoughts."
                  >
                    <DiscussionThread hasVotedOnCurrentTopic={isVotingAndDiscussionEnabled} topicId={topic.id} />
                  </OnboardingTooltip>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      {isVideoOverlayOpen && (
        <VideoPlayerOverlay
          isOpen={isVideoOverlayOpen}
          videoUrl={currentVideoUrl}
          onClose={handleVideoOverlayClose}
          onVideoEnded={handleVideoOverlayClose}
        />
      )}
    </AnimatePresence>
  );
};

export default TopicDetailOverlay;